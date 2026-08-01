/**
 * Procedural world geometry generation, extracted from the World class so the
 * World stays a data + draw + load container. All heavy generation lives here.
 *
 * Split-generation policy: road geometry (envelopes, road borders, lane guides,
 * separator borders) is cheap and deterministic, so `generateRoads` runs on
 * every graph edit. Building and tree placement is expensive, so it lives in
 * `generateBuildings` / `generateTrees` and runs only on demand (the editor's
 * "Regenerate items" action). `generate(opts)` is a convenience that runs a
 * chosen subset of stages.
 */

import { Graph } from '../../math/graph/graph.js';
import { Envelope } from '../../math/primitives/envelope.js';
import { Segment } from '../../math/primitives/segment.js';
import { Point } from '../../math/primitives/point.js';
import { Polygon } from '../../math/primitives/polygon.js';
import { Building } from '../items/building.js';
import { Tree, TreePrototype, buildTreePrototypes } from '../items/tree.js';
import { Marking } from '../markings/marking.js';
import { Corridor } from '../corridor.js';
import {
  add,
  scale,
  lerp,
  distance,
  normalize,
  mulberry32,
  average,
} from '../../math/utils.js';
import { LANE_WIDTH_PX, PARKING_LANE_WIDTH_PX } from '../../math/worldUnits.js';
import {
  GenerationProgress,
  GenerationProgressCallback,
  drainGenerator,
  runChunkedGenerator,
  yieldToBrowser,
} from './generationProgress.js';

export interface WorldGeneratable {
  graph: Graph;
  roadWidth: number;
  roadRoundness: number;
  buildingWidth: number;
  buildingMinLength: number;
  spacing: number;
  treeSize: number;
  treeSeed: number;
  treePrototypeCount: number;
  treePrototypes: TreePrototype[];
  envelopes: Envelope[];
  roadBorders: Segment[];
  separatorBorders: Segment[];
  laneGuides: Segment[];
  buildings: Building[];
  trees: Tree[];
  markings: Marking[];
  corridors: Corridor[];
}

/** Compute road width for a segment based on its lane count. */
function getSegmentRoadWidth(segment: Segment): number {
  return (segment.lanes ?? 2) * LANE_WIDTH_PX;
}

/**
 * Collision/asphalt envelope geometry for a segment, accounting for parking
 * lanes. Parking on a side adds one `PARKING_LANE_WIDTH_PX` to that side. Since
 * the envelope band is symmetric, one-sided parking is represented by widening
 * the band AND shifting it toward the parking side (`lateralOffset`), so the
 * driving lanes stay put and the collision border sits past the parking lane.
 *   - both sides  → width += 2P, offset 0
 *   - right only  → width += P,  offset +P/2 (perpendicular = right of p1→p2)
 *   - left only   → width += P,  offset −P/2
 */
function getSegmentEnvelopeGeometry(segment: Segment): {
  width: number;
  offset: number;
} {
  const driving = getSegmentRoadWidth(segment);
  const right = segment.parkingRight ? 1 : 0;
  const left = segment.parkingLeft ? 1 : 0;
  const width = driving + (right + left) * PARKING_LANE_WIDTH_PX;
  const offset = ((right - left) * PARKING_LANE_WIDTH_PX) / 2;
  return { width, offset };
}

/** Per-lane guidance lines for marking placement.
 *
 * Generates one guide per lane at the center of each lane. This replaces the
 * old half-width envelope union which only placed guides at ±¼-road-width —
 * correct only for 2-lane roads. Per-lane guides work for all lane counts.
 *
 * Direction convention (matches the `-angle(dv) + π/2` heading formula which
 * makes cars face OPPOSITE to dv):
 *   - Two-way roads: even-indexed lanes (from the left) point p1→p2
 *     (car goes backward), odd-indexed lanes point p2→p1 (car goes forward).
 *     This preserves the original 2-lane behavior where the right lane goes
 *     forward and the left lane goes backward.
 *   - One-way roads: ALL lanes point p2→p1 (opposite to traffic flow),
 *     so cars face forward (in the p1→p2 traffic direction).
 */
export function laneGuidesForSegment(segment: Segment): Segment[] {
  const guides: Segment[] = [];
  const laneCount = segment.lanes ?? (segment.oneWay ? 1 : 2);
  const dir = segment.directionVector();
  const perpDir = normalize(new Point(-dir.y, dir.x));
  const laneWidth = LANE_WIDTH_PX;
  const halfRoadWidth = (laneCount * laneWidth) / 2;

  for (let k = 0; k < laneCount; k++) {
    // Lane center offset from road center (leftmost lane = most negative)
    const offset = (k + 0.5) * laneWidth - halfRoadWidth;
    const p1 = add(segment.p1, scale(perpDir, offset));
    const p2 = add(segment.p2, scale(perpDir, offset));

    if (segment.oneWay) {
      // All lanes point p2→p1 (opposite to traffic flow) so that
      // the car heading formula produces forward-facing cars.
      guides.push(new Segment(p2, p1));
    } else {
      // Two-way: even k = forward (p1→p2), odd k = backward (p2→p1)
      if (k % 2 === 0) {
        guides.push(new Segment(p1, p2));
      } else {
        guides.push(new Segment(p2, p1));
      }
    }
  }
  return guides;
}

function wgGenerateLaneGuides(graph: Graph): Segment[] {
  const guides: Segment[] = [];
  for (const segment of graph.segments) {
    guides.push(...laneGuidesForSegment(segment));
  }
  return guides;
}

/**
 * Collision lines for two-way roads flagged as hard-separated. Each separated
 * (non-one-way) segment contributes its center line as a wall so cars cannot
 * cross to the opposing side.
 */
function wgGenerateSeparatorBorders(graph: Graph): Segment[] {
  const borders: Segment[] = [];
  for (const segment of graph.segments) {
    if (segment.separated && !segment.oneWay) {
      borders.push(
        new Segment(
          new Point(segment.p1.x, segment.p1.y),
          new Point(segment.p2.x, segment.p2.y),
        ),
      );
    }
  }
  return borders;
}

/**
 * Building placement as a generator that yields a local `[0, 1]` progress
 * fraction during the expensive O(n²) footprint-collision filter, so the async
 * generator can time-slice it. Drained synchronously by {@link wgGenerateBuildings}.
 */
function* wgGenerateBuildingsGen(
  world: WorldGeneratable,
): Generator<number, Building[]> {
  yield 0;
  const tempEnvelopes: Envelope[] = [];
  for (const seg of world.graph.segments) {
    const segWidth = getSegmentEnvelopeGeometry(seg).width;
    tempEnvelopes.push(
      new Envelope(
        seg,
        segWidth + world.buildingWidth + world.spacing * 2,
        world.roadRoundness,
      ),
    );
  }

  // The union is the heavy "finding places" step; delegate to the chunked,
  // grid-accelerated union so it stays responsive and reports progress.
  const guides = yield* remapGen(
    unionGen(tempEnvelopes.map((e) => e.polygon)),
    0,
    0.35,
  );

  for (let i = 0; i < guides.length; i++) {
    const seg = guides[i];
    if (seg.length() < world.buildingMinLength) {
      guides.splice(i, 1);
      i--;
    }
  }

  const supports: Segment[] = [];
  for (const seg of guides) {
    const length = seg.length() + world.spacing;
    const buildingCount = Math.floor(
      length / (world.buildingMinLength + world.spacing),
    );
    const buildingLength = length / buildingCount - world.spacing;

    const direction = seg.directionVector();

    let q1 = seg.p1;
    let q2 = add(q1, scale(direction, buildingLength));
    supports.push(new Segment(q1, q2));

    for (let i = 2; i <= buildingCount; i++) {
      q1 = add(q2, scale(direction, world.spacing));
      q2 = add(q1, scale(direction, buildingLength));
      supports.push(new Segment(q1, q2));
    }
  }

  const bases: Polygon[] = [];
  for (const seg of supports) {
    bases.push(new Envelope(seg, world.buildingWidth).polygon);
  }

  // Footprint de-overlap. The original algorithm keeps a base iff no EARLIER
  // kept base overlaps it (or sits within `spacing`) — an O(n²) all-pairs scan
  // that dominated large-map generation (the "placing buildings" step). This
  // keeps the identical survivor set and order (forward greedy in original
  // index order) but uses a spatial grid so each candidate only tests nearby
  // keepers, turning O(n²) into near-linear work.
  const epsilon = 0.001;
  const total = Math.max(bases.length, 1);
  const baseBounds = bases.map(polygonAABB);
  let maxExtent = 0;
  for (const b of baseBounds) {
    maxExtent = Math.max(maxExtent, b.maxX - b.minX, b.maxY - b.minY);
  }
  const keepGrid = new OwnerGrid(Math.max(maxExtent, 1));
  // A colliding keeper's AABB lies within (candidate half-extent + spacing +
  // keeper extent) of the candidate centre; this square covers that bound.
  const queryRadius = maxExtent * 2 + world.spacing;
  const kept: Polygon[] = [];
  for (let i = 0; i < bases.length; i++) {
    const c = bases[i];
    const cb = baseBounds[i];
    const cx = (cb.minX + cb.maxX) / 2;
    const cy = (cb.minY + cb.maxY) / 2;
    let collides = false;
    for (const k of keepGrid.query(cx, cy, queryRadius)) {
      const kp = kept[k];
      if (
        kp.intersectsPolygon(c) ||
        kp.distanceToPolygon(c) < world.spacing - epsilon
      ) {
        collides = true;
        break;
      }
    }
    if (!collides) {
      keepGrid.insertBounds(cb.minX, cb.minY, cb.maxX, cb.maxY, kept.length);
      kept.push(c);
    }
    if ((i & 63) === 0) yield 0.35 + (0.65 * i) / total;
  }
  yield 1;
  return kept.map((b) => new Building(b));
}

/** Building placement (O(n²) footprint collision filter). */
function wgGenerateBuildings(world: WorldGeneratable): Building[] {
  return drainGenerator(wgGenerateBuildingsGen(world));
}

/**
 * Uniform spatial index mapping grid cells to owner ids (polygon or placed-tree
 * indices). Tree placement previously tested every candidate point against
 * *every* illegal polygon (buildings + road envelopes) with `distanceToPoint`,
 * which is O(candidates × polygons × edges) — on large imported OSM maps this
 * froze the browser for minutes. This index lets each candidate inspect only
 * the owners whose bounding box lands in nearby cells.
 */
class OwnerGrid {
  #cellSize: number;
  #cells = new Map<string, number[]>();
  #stamps: Int32Array = new Int32Array(0);
  #queryId = 0;
  #maxId = -1;

  constructor(cellSize: number) {
    this.#cellSize = cellSize > 0 ? cellSize : 1;
  }

  #coord(v: number): number {
    return Math.floor(v / this.#cellSize);
  }

  #key(cx: number, cy: number): string {
    return cx + ',' + cy;
  }

  /** Register an owner id in every cell its bounding box overlaps. */
  insertBounds(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    id: number,
  ): void {
    if (id > this.#maxId) this.#maxId = id;
    const minCx = this.#coord(minX);
    const maxCx = this.#coord(maxX);
    const minCy = this.#coord(minY);
    const maxCy = this.#coord(maxY);
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const key = this.#key(cx, cy);
        const bucket = this.#cells.get(key);
        if (bucket) {
          // Same owner's consecutive edges often land in one cell; cheap dedup.
          if (bucket[bucket.length - 1] !== id) bucket.push(id);
        } else {
          this.#cells.set(key, [id]);
        }
      }
    }
  }

  insertPoint(x: number, y: number, id: number): void {
    this.insertBounds(x, y, x, y, id);
  }

  /** Unique owner ids in any cell within the square of half-width `radius`. */
  query(x: number, y: number, radius: number): number[] {
    if (this.#stamps.length <= this.#maxId) {
      // Doubling growth keeps stamp reallocation amortized O(1) as the tree
      // index accumulates owners one insert at a time.
      const cap = Math.max(this.#maxId + 1, this.#stamps.length * 2, 16);
      this.#stamps = new Int32Array(cap);
      this.#queryId = 0;
    }
    const minCx = this.#coord(x - radius);
    const maxCx = this.#coord(x + radius);
    const minCy = this.#coord(y - radius);
    const maxCy = this.#coord(y + radius);
    const result: number[] = [];
    const queryId = ++this.#queryId;
    const stamps = this.#stamps;
    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cy = minCy; cy <= maxCy; cy++) {
        const bucket = this.#cells.get(this.#key(cx, cy));
        if (!bucket) continue;
        for (let i = 0; i < bucket.length; i++) {
          const id = bucket[i];
          if (stamps[id] !== queryId) {
            stamps[id] = queryId;
            result.push(id);
          }
        }
      }
    }
    return result;
  }
}

/**
 * Tree placement as a generator that yields a local `[0, 1]` progress fraction
 * during the rejection-sampling loop, so the async generator can time-slice it.
 * The tree count is not known ahead of time, so progress is an asymptotic
 * estimate over iterations (never reaching 1 until the loop ends). Drained
 * synchronously by {@link wgGenerateTrees}.
 */
function* wgGenerateTreesGen(
  world: WorldGeneratable,
): Generator<number, Tree[]> {
  const points = [
    ...world.roadBorders.map((s) => [s.p1, s.p2]).flat(),
    ...world.buildings.map((b) => b.base.points).flat(),
  ];
  if (points.length === 0) return [];

  const left = Math.min(...points.map((p) => p.x));
  const right = Math.max(...points.map((p) => p.x));
  const top = Math.min(...points.map((p) => p.y));
  const bottom = Math.max(...points.map((p) => p.y));

  const illegalPolygons = [
    ...world.buildings.map((b) => b.base),
    ...world.envelopes.map((e) => e.polygon),
  ];

  // Spatial index over illegal-polygon edges so each candidate only tests the
  // handful of polygons near it. Query radius is treeSize*2 (the widest check
  // below), so the cell size is sized to keep that query to a small neighbourhood.
  const queryRadius = world.treeSize * 2;
  const polyGrid = new OwnerGrid(Math.max(world.treeSize, 1));
  for (let pi = 0; pi < illegalPolygons.length; pi++) {
    for (const s of illegalPolygons[pi].segments) {
      polyGrid.insertBounds(
        Math.min(s.p1.x, s.p2.x),
        Math.min(s.p1.y, s.p2.y),
        Math.max(s.p1.x, s.p2.x),
        Math.max(s.p1.y, s.p2.y),
        pi,
      );
    }
  }

  // Separate index for placed trees so the too-close check stays near-O(1)
  // instead of scanning every previously placed tree.
  const treeGrid = new OwnerGrid(Math.max(world.treeSize, 1));

  // Reproducible prototype set + a seeded RNG so instance variants/scales/types
  // are deterministic for a given world seed.
  const prototypes = world.treePrototypes;
  const rand = mulberry32((world.treeSeed ^ 0x9e3779b9) >>> 0);

  const trees: Tree[] = [];
  let tryCount = 0;
  let iterations = 0;
  while (tryCount < 100) {
    const p = new Point(
      lerp(left, right, Math.random()),
      lerp(bottom, top, Math.random()),
    );

    // Only polygons with an edge within treeSize*2 of the candidate can affect
    // any of the checks below (inside/near/close), so gather them once.
    const nearbyPolys = polyGrid.query(p.x, p.y, queryRadius);

    // check if tree inside or nearby building / road
    let keep = true;
    for (const pi of nearbyPolys) {
      const poly = illegalPolygons[pi];
      if (
        poly.containsPoint(p) ||
        poly.distanceToPoint(p) < world.treeSize / 2
      ) {
        keep = false;
        break;
      }
    }

    // check if tree too close to other trees
    if (keep) {
      const nearbyTrees = treeGrid.query(p.x, p.y, world.treeSize);
      for (const ti of nearbyTrees) {
        if (distance(trees[ti].center, p) < world.treeSize) {
          keep = false;
          break;
        }
      }
    }

    // avoiding trees in the middle of nowhere
    if (keep) {
      let closeToSomething = false;
      for (const pi of nearbyPolys) {
        if (illegalPolygons[pi].distanceToPoint(p) < world.treeSize * 2) {
          closeToSomething = true;
          break;
        }
      }
      keep = closeToSomething;
    }

    if (keep) {
      const protoIndex = Math.floor(rand() * prototypes.length);
      const type = wgPickTreeType(rand());
      const scale = lerp(0.8, 1.2, rand());
      treeGrid.insertPoint(p.x, p.y, trees.length);
      trees.push(
        new Tree(
          p,
          world.treeSize,
          prototypes[protoIndex],
          protoIndex,
          type,
          scale,
        ),
      );
      tryCount = 0;
    }
    tryCount++;
    // Progress is indeterminate (final tree count is unknown), so advance the
    // bar asymptotically toward 1 based on total iterations.
    if ((++iterations & 511) === 0) {
      yield 1 - 1 / (1 + iterations / 20000);
    }
  }
  return trees;
}

/**
 * Tree placement (rejection sampling). Ensures the caller has already built the
 * world's tree prototype set. Drains {@link wgGenerateTreesGen}.
 */
function wgGenerateTrees(world: WorldGeneratable): Tree[] {
  return drainGenerator(wgGenerateTreesGen(world));
}

/** Weighted tree-type pick: mostly classic, with some conifers and clusters. */
function wgPickTreeType(r: number): number {
  if (r < 0.6) return 0;
  if (r < 0.8) return 1;
  return 2;
}

/** Axis-aligned bounding box of a polygon (generation-local). */
interface PolyAABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function polygonAABB(polygon: Polygon): PolyAABB {
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
function* remapGen<R>(
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
function* unionGen(polygons: Polygon[]): Generator<number, Segment[]> {
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

/**
 * Road geometry as a generator: envelopes, then the (chunked) border union,
 * lane guides and separator borders. Yields a local `[0, 1]` fraction so the
 * async path stays responsive; drained synchronously by
 * {@link WorldGenerator.generateRoads}.
 */
function* wgGenerateRoadsGen(world: WorldGeneratable): Generator<number, void> {
  world.envelopes.length = 0;
  world.laneGuides.length = 0;
  world.roadBorders.length = 0;
  world.separatorBorders.length = 0;

  const segments = world.graph.segments;
  const segTotal = Math.max(segments.length, 1);
  for (let s = 0; s < segments.length; s++) {
    const segment = segments[s];
    const { width, offset } = getSegmentEnvelopeGeometry(segment);
    world.envelopes.push(
      new Envelope(segment, width, world.roadRoundness, undefined, offset),
    );
    // Envelope construction is O(segments); yield periodically so a large map
    // doesn't block the main thread here before the union even starts. The
    // union itself (below) reports the bulk of the [0, 1] road progress.
    if ((s & 255) === 0) yield (0.1 * s) / segTotal;
  }

  const roadPolygons = world.envelopes.map((envelope) => envelope.polygon);
  const borders = yield* remapGen(unionGen(roadPolygons), 0.1, 1);
  world.roadBorders.push(...borders);
  world.laneGuides.push(...wgGenerateLaneGuides(world.graph));
  world.separatorBorders.push(...wgGenerateSeparatorBorders(world.graph));
}

export class WorldGenerator {
  /**
   * Cheap, deterministic road geometry: envelopes, road borders, lane guides
   * and separator borders. Safe to run on every graph edit.
   */
  static generateRoads(world: WorldGeneratable): void {
    drainGenerator(wgGenerateRoadsGen(world));
  }

  /** Expensive building placement (O(n²) footprint collision filter). */
  static generateBuildings(world: WorldGeneratable): void {
    world.buildings = wgGenerateBuildings(world);
  }

  /**
   * Expensive tree placement (rejection sampling). Ensures the world's tree
   * prototype set exists first, then assigns each instance a prototype/type/scale.
   */
  static generateTrees(world: WorldGeneratable): void {
    if (world.treePrototypes.length !== world.treePrototypeCount) {
      world.treePrototypes = buildTreePrototypes(
        world.treeSeed,
        world.treePrototypeCount,
      );
    }
    world.trees = wgGenerateTrees(world);
  }

  /** Re-anchors markings to the (possibly edited) graph. */
  static reanchorMarkings(world: WorldGeneratable): void {
    for (const marking of world.markings) {
      marking.reanchor(world.graph);
    }
  }

  /**
   * Builds a single dynamic corridor from `start` to `end` and makes it the
   * world's only corridor. Used by the race game and training simulator to
   * constrain cars to a computed path.
   */
  static generateCorridor(
    world: WorldGeneratable,
    start: Point,
    end: Point,
    extendEnd: boolean = false,
  ): void {
    const path = world.graph.getShortestPath(start, end);
    const corridor = Corridor.fromPath(
      path,
      world.roadWidth,
      world.roadRoundness,
      { extendEnd },
    );
    world.corridors = [corridor];
  }

  /**
   * Convenience generator. By default runs every stage; pass `opts` to run only
   * a subset (e.g. `{ roads: true }` for a cheap refresh). Markings are always
   * re-anchored afterwards.
   */
  static generate(
    world: WorldGeneratable,
    opts: { roads?: boolean; buildings?: boolean; trees?: boolean } = {},
  ): void {
    const { roads = true, buildings = true, trees = true } = opts;
    if (roads) this.generateRoads(world);
    if (buildings) this.generateBuildings(world);
    if (trees) this.generateTrees(world);
    this.reanchorMarkings(world);
  }

  /**
   * Cooperative, time-sliced version of {@link generate}. Runs the same stages
   * but yields to the browser between chunks so the main thread never blocks
   * long enough to freeze the tab, reporting progress via `onProgress`. Used by
   * the world editor for large OSM imports and the "Regenerate items" action.
   */
  static async generateAsync(
    world: WorldGeneratable,
    opts: {
      roads?: boolean;
      buildings?: boolean;
      trees?: boolean;
      onProgress?: GenerationProgressCallback;
    } = {},
  ): Promise<void> {
    const { roads = true, buildings = true, trees = true, onProgress } = opts;

    // Split the [0, 1] progress range evenly across the active stages.
    const stages: GenerationProgress['stage'][] = [];
    if (roads) stages.push('roads');
    if (buildings) stages.push('buildings');
    if (trees) stages.push('trees');
    const bandCount = stages.length || 1;

    const report = (
      stage: GenerationProgress['stage'],
      label: string,
      local: number,
    ): void => {
      if (!onProgress) return;
      const idx = stages.indexOf(stage);
      const start = idx / bandCount;
      const clamped = Math.max(0, Math.min(1, local));
      onProgress({ stage, label, fraction: start + clamped / bandCount });
    };

    if (roads) {
      report('roads', 'Generating road geometry…', 0);
      await yieldToBrowser();
      await runChunkedGenerator(wgGenerateRoadsGen(world), (f) =>
        report('roads', 'Generating road geometry…', f),
      );
    }

    if (buildings) {
      report('buildings', 'Placing buildings…', 0);
      await yieldToBrowser();
      world.buildings = await runChunkedGenerator(
        wgGenerateBuildingsGen(world),
        (f) => report('buildings', 'Placing buildings…', f),
      );
    }

    if (trees) {
      report('trees', 'Planting trees…', 0);
      await yieldToBrowser();
      if (world.treePrototypes.length !== world.treePrototypeCount) {
        world.treePrototypes = buildTreePrototypes(
          world.treeSeed,
          world.treePrototypeCount,
        );
      }
      world.trees = await runChunkedGenerator(wgGenerateTreesGen(world), (f) =>
        report('trees', 'Planting trees…', f),
      );
    }

    this.reanchorMarkings(world);
    onProgress?.({
      stage: stages[stages.length - 1] ?? 'trees',
      label: 'Done',
      fraction: 1,
    });
  }
}
