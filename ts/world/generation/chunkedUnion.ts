/**
 * Spatially-indexed, time-sliceable polygon union used by world generation.
 *
 * Produces the SAME segment set and order as {@link Polygon.union}, but replaces
 * its O(n²) all-pairs bounding-box scan with an {@link OwnerGrid} lookup so large
 * OSM imports don't spend "forever" in the union, and yields a local `[0, 1]`
 * progress fraction so the async generator can keep the UI responsive.
 *
 * Order preservation: candidate polygons are visited in ascending index order,
 * exactly replicating `Polygon.multiBreak`'s `(i < j)` pairing; the interior
 * test discards a segment iff some polygon contains its midpoint, identical to
 * the linear scan (the grid just narrows the set of polygons that can).
 */
import { Polygon } from '../../math/primitives/polygon.js';
import { Segment } from '../../math/primitives/segment.js';
import { average } from '../../math/utils.js';
import { OwnerGrid } from './ownerGrid.js';

/** Axis-aligned bounding box of a polygon (generation-local). */
export interface PolyAABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function polygonAABB(polygon: Polygon): PolyAABB {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of polygon.points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

function aabbOverlap(a: PolyAABB, b: PolyAABB): boolean {
  return (
    a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY
  );
}

/**
 * Remaps a sub-generator's local `[0, 1]` progress into the `[lo, hi]` band of
 * the parent generator, passing the return value through.
 */
export function* remapGen<R>(
  gen: Generator<number, R>,
  lo: number,
  hi: number,
): Generator<number, R> {
  let step = gen.next();
  while (!step.done) {
    yield lo + (hi - lo) * step.value;
    step = gen.next();
  }
  return step.value;
}

export function* unionGen(polygons: Polygon[]): Generator<number, Segment[]> {
  const n = polygons.length;
  if (n === 0) return [];

  const bounds = polygons.map(polygonAABB);
  // Cell size ≈ average AABB extent: buckets stay small yet few per query.
  let extentSum = 0;
  for (const b of bounds) {
    extentSum += Math.max(b.maxX - b.minX, b.maxY - b.minY);
  }
  const cell = Math.max(1, extentSum / n);
  const grid = new OwnerGrid(cell);
  for (let i = 0; i < n; i++) {
    const b = bounds[i];
    grid.insertBounds(b.minX, b.minY, b.maxX, b.maxY, i);
  }

  // Phase 1 — break overlapping pairs (each unordered pair once, j ascending).
  for (let i = 0; i < n; i++) {
    const bi = bounds[i];
    const cx = (bi.minX + bi.maxX) / 2;
    const cy = (bi.minY + bi.maxY) / 2;
    const radius = Math.max(bi.maxX - bi.minX, bi.maxY - bi.minY) / 2;
    const candidates = grid.query(cx, cy, radius).sort((a, b) => a - b);
    for (const j of candidates) {
      if (j <= i) continue;
      if (!aabbOverlap(bi, bounds[j])) continue;
      Polygon.break(polygons[i], polygons[j]);
    }
    if ((i & 31) === 0) yield (0.5 * i) / n;
  }

  // Phase 2 — keep only non-interior segments. `break` inserts points on
  // existing edges, so the AABBs (and the grid) remain valid.
  const kept: Segment[] = [];
  for (let i = 0; i < n; i++) {
    for (const segment of polygons[i].segments) {
      const midpoint = average(segment.p1, segment.p2);
      let keep = true;
      for (const j of grid.query(midpoint.x, midpoint.y, 0)) {
        if (j === i) continue;
        const b = bounds[j];
        if (
          midpoint.x < b.minX ||
          midpoint.x > b.maxX ||
          midpoint.y < b.minY ||
          midpoint.y > b.maxY
        ) {
          continue;
        }
        if (polygons[j].containsPoint(midpoint)) {
          keep = false;
          break;
        }
      }
      if (keep) kept.push(segment);
    }
    if ((i & 31) === 0) yield 0.5 + (0.5 * i) / n;
  }
  return kept;
}
