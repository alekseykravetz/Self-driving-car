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
import { dot, add, scale } from '../math/utils.js';
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
 * lane. `directionVector` is the lane-guide-convention travel direction the seed
 * renders with. Falls back to the single seed placement when no approach segment
 * / lane is found.
 *
 * Approach segment: the incident road whose AXIS is most collinear with the
 * seed direction (the road the yielding driver is on). Selecting by axis
 * collinearity — rather than which endpoint is up/downstream — keeps the
 * marking on the approach road even where the road bends or dead-ends into the
 * junction (a downstream-endpoint heuristic would pick a cross street or fall
 * back to the node centre).
 *
 * Lane selection:
 *   - Two-way road → only the lanes travelling INTO the junction (guide
 *     direction aligned with the seed), so the opposing lanes get no marking.
 *   - One-way road → every lane (all flow the same way into the junction); the
 *     lane guides all share one direction, so the two-way alignment filter
 *     would wrongly reject them all.
 * Each per-lane marking uses that lane guide's own direction, so it renders
 * identically to a hand-placed marking on the same guide.
 */
export function expandDirectionalMarking(
  center: Point,
  directionVector: Point,
  graph: Graph,
  setback: number = STOP_LINE_SETBACK_PX,
): DirectionalPlacement[] {
  // 1. Approach segment: incident to the node, road axis most collinear with
  //    the seed direction (either orientation).
  let best: Segment | undefined;
  let bestAbsDot = 0;
  for (const seg of graph.segments) {
    if (!seg.p1.equals(center) && !seg.p2.equals(center)) continue;
    const segDir = seg.directionVector();
    if (segDir.x === 0 && segDir.y === 0) continue;
    const absDot = Math.abs(dot(segDir, directionVector));
    if (absDot > bestAbsDot) {
      bestAbsDot = absDot;
      best = seg;
    }
  }
  if (!best) return [{ center, directionVector }]; // fallback

  // 2/3. Lane guides of the approach segment; keep the entering lanes.
  const out: DirectionalPlacement[] = [];
  for (const guide of laneGuidesForSegment(best)) {
    const guideDir = guide.directionVector();
    // Two-way: skip departing lanes (guide opposite to the approach travel
    // direction). One-way: all lanes flow into the junction, so keep them all.
    if (!best.oneWay && dot(guideDir, directionVector) <= 0) continue;
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
