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
import { normalize, subtract, dot, add, scale } from '../math/utils.js';
import { laneGuidesForSegment } from './generation/worldGenerator.js';
import { LANE_WIDTH_PX } from '../math/worldUnits.js';

/** Stop line offset upstream from the junction node (world px). 0 disables. */
export const STOP_LINE_SETBACK_PX = 0;

/** One-lane marking size (matches manual roadWidth/2 on a 2-lane road). */
export const OSM_STOP_YIELD_SIZE_PX = LANE_WIDTH_PX;

export interface DirectionalPlacement {
  center: Point;
  directionVector: Point;
}

/**
 * Expands a single OSM stop/give-way node seed into one placement per APPROACH
 * lane. `directionVector` follows the lane-guide convention (points upstream,
 * toward the approach road's far end). Falls back to the single seed placement
 * when no approach segment / lane is found.
 */
export function expandDirectionalMarking(
  center: Point,
  directionVector: Point,
  graph: Graph,
  setback: number = STOP_LINE_SETBACK_PX,
): DirectionalPlacement[] {
  // 1. Approach segment: incident to the node, pointing (node→far end) most
  //    like directionVector.
  let best: Segment | undefined;
  let bestScore = 0; // require a positive match
  for (const seg of graph.segments) {
    let far: Point | undefined;
    if (seg.p1.equals(center)) far = seg.p2;
    else if (seg.p2.equals(center)) far = seg.p1;
    if (!far) continue;
    const d = subtract(far, center);
    if (d.x === 0 && d.y === 0) continue;
    const score = dot(normalize(d), directionVector);
    if (score > bestScore) {
      bestScore = score;
      best = seg;
    }
  }
  if (!best) return [{ center, directionVector }]; // fallback

  // 2/3. Lane guides of the approach segment; keep same-direction (approach)
  //      lanes.
  const out: DirectionalPlacement[] = [];
  for (const guide of laneGuidesForSegment(best)) {
    const guideDir = guide.directionVector();
    if (dot(guideDir, directionVector) <= 0) continue; // departing lane
    // 4. Lane cross-section at the node, nudged upstream by the setback.
    const laneCenter = guide.projectPoint(center).point;
    const placed =
      setback !== 0
        ? add(laneCenter, scale(directionVector, setback))
        : laneCenter;
    out.push({ center: placed, directionVector: guideDir });
  }
  return out.length > 0 ? out : [{ center, directionVector }]; // fallback
}
