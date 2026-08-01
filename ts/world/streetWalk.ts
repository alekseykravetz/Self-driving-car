import { Point } from '../math/primitives/point.js';
import { Segment } from '../math/primitives/segment.js';

/** One oriented piece of a street walk (start → end along the walk). */
export interface WalkPiece {
  seg: Segment;
  start: Point;
  end: Point;
  length: number;
}

export function sharesEndpoint(a: Segment, b: Segment): boolean {
  return (
    a.p1.equals(b.p1) ||
    a.p1.equals(b.p2) ||
    a.p2.equals(b.p1) ||
    a.p2.equals(b.p2)
  );
}

/**
 * Endpoint hash key. `Point.equals` is an exact `x === x && y === y` compare, so
 * this string uniquely identifies an endpoint for O(1) shared-endpoint lookups —
 * replacing the O(n²) `Point.equals` scans that froze large OSM imports.
 */
function endpointKey(p: Point): string {
  return p.x + ',' + p.y;
}

/** Maps each endpoint key → the segments touching it (input order preserved). */
function buildEndpointIndex(segments: Segment[]): Map<string, Segment[]> {
  const index = new Map<string, Segment[]>();
  const add = (key: string, seg: Segment): void => {
    const list = index.get(key);
    if (list) list.push(seg);
    else index.set(key, [seg]);
  };
  for (const seg of segments) {
    add(endpointKey(seg.p1), seg);
    add(endpointKey(seg.p2), seg);
  }
  return index;
}

/**
 * Connected components within a group (shared endpoints link up). Uses an
 * endpoint index + flood fill so it is near-linear instead of the old
 * O(n²)–O(n³) repeated `sharesEndpoint` rescan (component membership and the
 * per-seed component ordering are preserved; internal ordering within a
 * component may differ, which only affects the walk's start choice downstream).
 */
export function buildConnectedComponents(segments: Segment[]): Segment[][] {
  const index = buildEndpointIndex(segments);
  const remaining = new Set(segments);
  const components: Segment[][] = [];
  // Iterate in input order so seed (and thus component) order is preserved.
  for (const seed of segments) {
    if (!remaining.has(seed)) continue;
    remaining.delete(seed);
    const component = [seed];
    const stack = [seed];
    while (stack.length > 0) {
      const cur = stack.pop()!;
      const k1 = endpointKey(cur.p1);
      const k2 = endpointKey(cur.p2);
      for (const key of k1 === k2 ? [k1] : [k1, k2]) {
        const list = index.get(key);
        if (!list) continue;
        for (const seg of list) {
          if (remaining.has(seg)) {
            remaining.delete(seg);
            component.push(seg);
            stack.push(seg);
          }
        }
      }
    }
    components.push(component);
  }
  return components;
}

/**
 * Orders a segment component into a walk: a list of oriented pieces chained
 * end-to-start. Starts from a segment with a free endpoint when one exists;
 * branched leftovers are appended as additional chains. Each piece carries
 * `seg` referencing the original segment for its angle metadata.
 *
 * Endpoint lookups are O(1) via an index/degree map (identical output to the
 * previous O(component²) `includes` scan).
 */
export function orderSegmentWalk(component: Segment[]): WalkPiece[] {
  const unvisited = new Set(component);
  const index = buildEndpointIndex(component);
  const degree = new Map<string, number>();
  for (const seg of component) {
    const k1 = endpointKey(seg.p1);
    const k2 = endpointKey(seg.p2);
    degree.set(k1, (degree.get(k1) ?? 0) + 1);
    degree.set(k2, (degree.get(k2) ?? 0) + 1);
  }
  // A free endpoint has exactly one incident segment in the component (self).
  const isFreeEndpoint = (p: Point): boolean =>
    (degree.get(endpointKey(p)) ?? 0) === 1;

  const walk: WalkPiece[] = [];
  while (unvisited.size > 0) {
    let startSeg: Segment | undefined;
    let startFrom: Point | undefined;
    for (const seg of unvisited) {
      if (isFreeEndpoint(seg.p1)) {
        startSeg = seg;
        startFrom = seg.p1;
        break;
      }
      if (isFreeEndpoint(seg.p2)) {
        startSeg = seg;
        startFrom = seg.p2;
        break;
      }
    }
    if (!startSeg || !startFrom) {
      startSeg = unvisited.values().next().value!;
      startFrom = startSeg.p1;
    }
    unvisited.delete(startSeg);

    let currentEnd = startSeg.p1.equals(startFrom) ? startSeg.p2 : startSeg.p1;
    walk.push({
      seg: startSeg,
      start: startFrom,
      end: currentEnd,
      length: startSeg.length(),
    });

    let extended = true;
    while (extended) {
      extended = false;
      // First unvisited segment (in component order) incident to currentEnd.
      const list = index.get(endpointKey(currentEnd));
      if (list) {
        for (const seg of list) {
          if (!unvisited.has(seg)) continue;
          if (seg.p1.equals(currentEnd)) {
            unvisited.delete(seg);
            walk.push({
              seg,
              start: seg.p1,
              end: seg.p2,
              length: seg.length(),
            });
            currentEnd = seg.p2;
            extended = true;
            break;
          }
          if (seg.p2.equals(currentEnd)) {
            unvisited.delete(seg);
            walk.push({
              seg,
              start: seg.p2,
              end: seg.p1,
              length: seg.length(),
            });
            currentEnd = seg.p1;
            extended = true;
            break;
          }
        }
      }
    }
  }
  return walk;
}
