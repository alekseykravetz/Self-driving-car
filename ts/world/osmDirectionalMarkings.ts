/**
 * Expansion of OSM stop / give-way node "seeds" into per-lane marking
 * placements. `Osm.parseRoads()` emits ONE seed per stop/give-way node (centred
 * on the node with a single lane-guide-convention direction). On a two-way road
 * that single centred marking can only face one travel direction, so it is
 * backwards for the opposing lane. This module expands each seed into one
 * placement per APPROACH lane, deriving lane geometry purely from the graph
 * (matching `laneGuidesForSegment`), so each per-lane marking renders identically
 * to a hand-placed one on the same lane guide.
 *
 * One-way road → a marking on every lane (all lanes flow into the junction).
 * Two-way road → markings only on the lanes travelling into the junction.
 */

import { Point } from '../math/primitives/point.js';
import { Segment } from '../math/primitives/segment.js';
import { Graph } from '../math/graph/graph.js';
import { dot, add, scale, subtract } from '../math/utils.js';
import { laneGuidesForSegment } from './generation/worldGenerator.js';
import { LANE_WIDTH_PX } from '../math/worldUnits.js';

/** Stop line offset upstream (against travel) from the junction node (px). */
export const STOP_LINE_SETBACK_PX = 0;

/** One-lane marking size (matches manual roadWidth/2 on a 2-lane road). */
export const OSM_STOP_YIELD_SIZE_PX = LANE_WIDTH_PX;

export interface DirectionalPlacement {
  center: Point;
  directionVector: Point;
}

/**
 * Expands a single OSM stop/give-way node seed into one placement per APPROACH
 * lane. `directionVector` is the seed TRAVEL direction (points along the way the
 * approaching driver is going, i.e. into the junction). Every emitted placement
 * keeps this same facing so the painted "STOP"/"YIELD" text reads for the
 * approaching driver — identical to the single-marking OSM placement that this
 * expansion replaces. Falls back to the single seed placement when no approach
 * segment / lane is found.
 *
 * Approach segment: the incident road whose AXIS is most collinear with the
 * seed direction (the road the yielding driver is on). Selecting by axis
 * collinearity — rather than which endpoint is up/downstream — keeps the marking
 * on the approach road even where the road bends or dead-ends into the junction.
 *
 * Lane selection (Israel / right-hand traffic):
 *   - Two-way road → only the lanes on the driver's RIGHT of the road centre
 *     (the approaching side); the opposing lanes get none.
 *   - One-way road → every lane (all flow the same way into the junction).
 */
export function expandDirectionalMarking(
  center: Point,
  directionVector: Point,
  graph: Graph,
  setback: number = STOP_LINE_SETBACK_PX,
  incident?: Segment[],
): DirectionalPlacement[] {
  // The seed `directionVector` ALREADY encodes the desired marking facing:
  // `Osm.parseRoads` emits it as `-approachFacingDir`, the lane-guide convention
  // the shared Stop/Yield `draw()` expects (so an OSM sign renders identically to
  // a hand-placed one). Emit it per lane UNCHANGED — negating here double-flips
  // the sign 180° (the regression this restores).
  const facing = (): Point => new Point(-directionVector.x, -directionVector.y);

  // 1. Approach segment: incident to the node, road axis most collinear with
  //    the seed direction (either orientation). `incident` (optional) is the
  //    pre-indexed set of segments touching this node — pass it to avoid an
  //    O(segments) scan per seed on large maps; falls back to all segments.
  let best: Segment | undefined;
  let bestAbsDot = 0;
  for (const seg of incident ?? graph.segments) {
    if (!seg.p1.equals(center) && !seg.p2.equals(center)) continue;
    const segDir = seg.directionVector();
    if (segDir.x === 0 && segDir.y === 0) continue;
    const absDot = Math.abs(dot(segDir, directionVector));
    if (absDot > bestAbsDot) {
      bestAbsDot = absDot;
      best = seg;
    }
  }
  if (!best) return [{ center, directionVector: facing() }]; // fallback

  // Driver's right (right-hand traffic): perpendicular to travel, +90° in the
  // y-down world. Used to keep only the approaching-side lanes on two-way roads.
  const right = new Point(-directionVector.y, directionVector.x);

  const out: DirectionalPlacement[] = [];
  for (const guide of laneGuidesForSegment(best)) {
    const laneCenter = guide.projectPoint(center).point;
    // Two-way: keep only the lanes on the driver's right (the approaching side).
    // One-way: all lanes flow into the junction, so keep them all.
    if (!best.oneWay && dot(subtract(laneCenter, center), right) <= 0) continue;
    // Stop line optionally set back UPSTREAM (against travel) from the node.
    const placed =
      setback !== 0
        ? add(laneCenter, scale(directionVector, -setback))
        : laneCenter;
    out.push({ center: placed, directionVector: facing() });
  }
  return out.length > 0 ? out : [{ center, directionVector: facing() }]; // fallback
}
