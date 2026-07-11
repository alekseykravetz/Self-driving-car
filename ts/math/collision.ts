import { Point } from './primitives/point.js';
import { getIntersectionOffset } from './utils.js';

export function nearestEdgeOffset(ray: Point[], poly: Point[]): number | null {
  if (poly.length < 2) return null;
  let minOffset = Infinity;
  const edgeCount = poly.length === 2 ? 1 : poly.length;
  for (let j = 0; j < edgeCount; j++) {
    const offset = getIntersectionOffset(
      ray[0],
      ray[1],
      poly[j],
      poly[(j + 1) % poly.length],
    );
    if (offset >= 0 && offset < minOffset) {
      minOffset = offset;
    }
  }
  return minOffset === Infinity ? null : minOffset;
}

export function polysIntersect(poly1: Point[], poly2: Point[]): boolean {
  const n1 = poly1.length;
  const n2 = poly2.length;
  const edges1 = n1 === 2 ? 1 : n1;
  const edges2 = n2 === 2 ? 1 : n2;
  for (let i = 0; i < edges1; i++) {
    for (let j = 0; j < edges2; j++) {
      const offset = getIntersectionOffset(
        poly1[i],
        poly1[(i + 1) % n1],
        poly2[j],
        poly2[(j + 1) % n2],
      );

      if (offset >= 0) {
        return true;
      }
    }
  }

  return false;
}
