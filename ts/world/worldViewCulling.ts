import { Point } from '../math/primitives/point.js';
import { Segment } from '../math/primitives/segment.js';
import type { VisibleWorldRect } from '../viewport/viewport.js';

/** World-space padding (px) added around the visible rect when culling roads,
 * lane markings, and markings, so wide roads and labels straddling the screen
 * edge aren't clipped. Covers the widest road half-width plus signage. */
export const WORLD_CULL_MARGIN_PX = 300;

/** True if a point lies within the visible rect, expanded by a margin. */
export function pointInView(
  p: Point,
  b: VisibleWorldRect,
  margin: number = WORLD_CULL_MARGIN_PX,
): boolean {
  return (
    p.x >= b.minX - margin &&
    p.x <= b.maxX + margin &&
    p.y >= b.minY - margin &&
    p.y <= b.maxY + margin
  );
}

/** True if a segment's AABB (plus margin) overlaps the visible rect. */
export function segmentInView(
  seg: Segment,
  b: VisibleWorldRect,
  margin: number = WORLD_CULL_MARGIN_PX,
): boolean {
  const minX = Math.min(seg.p1.x, seg.p2.x);
  const maxX = Math.max(seg.p1.x, seg.p2.x);
  const minY = Math.min(seg.p1.y, seg.p2.y);
  const maxY = Math.max(seg.p1.y, seg.p2.y);
  return (
    maxX >= b.minX - margin &&
    minX <= b.maxX + margin &&
    maxY >= b.minY - margin &&
    minY <= b.maxY + margin
  );
}

/** True if a polygon's AABB overlaps the visible rect (polygon already
 * includes road width, so no extra margin is needed). */
export function polygonInView(
  poly: { points: Point[] },
  b: VisibleWorldRect,
): boolean {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of poly.points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return maxX >= b.minX && minX <= b.maxX && maxY >= b.minY && minY <= b.maxY;
}
