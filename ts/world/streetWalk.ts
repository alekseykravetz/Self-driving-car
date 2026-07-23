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

/** Connected components within a group (shared endpoints link up). */
export function buildConnectedComponents(segments: Segment[]): Segment[][] {
  const remaining = new Set(segments);
  const components: Segment[][] = [];
  while (remaining.size > 0) {
    const seed = remaining.values().next().value!;
    remaining.delete(seed);
    const component = [seed];
    let grew = true;
    while (grew) {
      grew = false;
      for (const seg of [...remaining]) {
        if (component.some((c) => sharesEndpoint(c, seg))) {
          remaining.delete(seg);
          component.push(seg);
          grew = true;
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
 */
export function orderSegmentWalk(component: Segment[]): WalkPiece[] {
  const unvisited = new Set(component);
  const isFreeEndpoint = (p: Point, self: Segment): boolean => {
    for (const s of component) {
      if (s !== self && s.includes(p)) return false;
    }
    return true;
  };

  const walk: WalkPiece[] = [];
  while (unvisited.size > 0) {
    let startSeg: Segment | undefined;
    let startFrom: Point | undefined;
    for (const seg of unvisited) {
      if (isFreeEndpoint(seg.p1, seg)) {
        startSeg = seg;
        startFrom = seg.p1;
        break;
      }
      if (isFreeEndpoint(seg.p2, seg)) {
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
      for (const seg of [...unvisited]) {
        if (seg.p1.equals(currentEnd)) {
          unvisited.delete(seg);
          walk.push({ seg, start: seg.p1, end: seg.p2, length: seg.length() });
          currentEnd = seg.p2;
          extended = true;
          break;
        }
        if (seg.p2.equals(currentEnd)) {
          unvisited.delete(seg);
          walk.push({ seg, start: seg.p2, end: seg.p1, length: seg.length() });
          currentEnd = seg.p1;
          extended = true;
          break;
        }
      }
    }
  }
  return walk;
}
