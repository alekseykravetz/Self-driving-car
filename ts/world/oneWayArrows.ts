import { Graph } from '../math/graph/graph.js';
import { lerp2D } from '../math/utils.js';
import { buildConnectedComponents, orderSegmentWalk } from './streetWalk.js';

/** Target spacing between one-way arrows along a chain, in px. */
export const ONE_WAY_ARROW_SPACING_PX = 200;
/** Chains shorter than this get no arrows (mirrors the old per-segment 80px skip). */
export const ONE_WAY_ARROW_MIN_CHAIN_PX = 80;
/** Shaft length of the drawn arrow, in px. */
export const ONE_WAY_ARROW_SHAFT_PX = 30;
/** Arrowhead length, in px (was the old triangle size). */
export const ONE_WAY_ARROW_HEAD_PX = 20;
/** Half-angle of the arrowhead wings. */
export const ONE_WAY_ARROW_HEAD_ANGLE = Math.PI / 8;

export interface OneWayArrowPlacement {
  x: number;
  y: number;
  angle: number;
}

export function computeOneWayArrowPlacements(
  graph: Graph,
): OneWayArrowPlacement[] {
  const oneWaySegs = graph.segments.filter((s) => s.oneWay);
  const placements: OneWayArrowPlacement[] = [];

  for (const component of buildConnectedComponents(oneWaySegs)) {
    const walk = orderSegmentWalk(component);
    const totalLength = walk.reduce((sum, piece) => sum + piece.length, 0);
    if (totalLength < ONE_WAY_ARROW_MIN_CHAIN_PX) continue;

    const count = Math.max(
      1,
      Math.round(totalLength / ONE_WAY_ARROW_SPACING_PX),
    );
    for (let i = 0; i < count; i++) {
      const arcPos = ((i + 0.5) * totalLength) / count;
      let remaining = arcPos;
      let placed = false;
      for (let j = 0; j < walk.length; j++) {
        const piece = walk[j];
        if (remaining <= piece.length || j === walk.length - 1) {
          const t =
            piece.length > 0 ? Math.min(1, remaining / piece.length) : 0;
          const point = lerp2D(piece.start, piece.end, t);
          const angle = Math.atan2(
            piece.seg.p2.y - piece.seg.p1.y,
            piece.seg.p2.x - piece.seg.p1.x,
          );
          placements.push({ x: point.x, y: point.y, angle });
          placed = true;
          break;
        }
        remaining -= piece.length;
      }
      if (!placed && walk.length > 0) {
        const last = walk[walk.length - 1];
        const angle = Math.atan2(
          last.seg.p2.y - last.seg.p1.y,
          last.seg.p2.x - last.seg.p1.x,
        );
        placements.push({ x: last.end.x, y: last.end.y, angle });
      }
    }
  }

  return placements;
}
