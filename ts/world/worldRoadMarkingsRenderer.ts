import { Segment } from '../math/primitives/segment.js';
import { Point } from '../math/primitives/point.js';
import { drawSegment } from '../rendering/segmentRenderer.js';
import {
  add,
  scale,
  normalize,
  perpendicular,
  angle,
  lerp2D,
} from '../math/utils.js';
import { LANE_WIDTH_PX, PARKING_LANE_WIDTH_PX } from '../math/worldUnits.js';
import type { VisibleWorldRect } from '../viewport/viewport.js';
import { segmentInView } from './worldViewCulling.js';

/**
 * Renders per-segment road markings for a {@link World}: lane dividers /
 * one-way dashed centers, and parking-lane 'P' glyphs (from segment
 * metadata). Mirrors the `WorldSignageRenderer` collaborator pattern.
 */
export class WorldRoadMarkingsRenderer {
  /** Draws one-way arrows, hard-separation center lines, and dashed dividers. */
  drawLaneMarkings(
    ctx: CanvasRenderingContext2D,
    segments: Segment[],
    screenBounds?: VisibleWorldRect,
  ): void {
    for (const seg of segments) {
      if (seg.laneMarkings === false) continue;
      if (screenBounds && !segmentInView(seg, screenBounds)) continue;
      const laneCount = seg.lanes ?? (seg.oneWay ? 1 : 2);
      const roadWidth = laneCount * LANE_WIDTH_PX;

      if (laneCount > 2) {
        this.#drawMultiLaneDividers(ctx, seg, laneCount, roadWidth);
      } else {
        this.#drawSimpleLaneMarkings(ctx, seg, laneCount);
      }
    }
  }

  /**
   * Draws spaced 'P' glyphs along each segment's parking lane(s). Parking is a
   * per-segment property (`parkingLeft`/`parkingRight`) that widens the road
   * envelope; the glyphs sit at the parking-lane centre
   * (`drivingWidth/2 + PARKING_LANE_WIDTH_PX/2`) on the tagged side(s).
   */
  drawParkingLanes(
    ctx: CanvasRenderingContext2D,
    segments: Segment[],
    screenBounds?: VisibleWorldRect,
  ): void {
    const bayLen = LANE_WIDTH_PX;
    const spacing = bayLen * 1.5;
    for (const seg of segments) {
      if (!seg.parkingRight && !seg.parkingLeft) continue;
      if (screenBounds && !segmentInView(seg, screenBounds)) continue;
      const laneCount = seg.lanes ?? (seg.oneWay ? 1 : 2);
      const drivingWidth = laneCount * LANE_WIDTH_PX;
      const laneCenter = drivingWidth / 2 + PARKING_LANE_WIDTH_PX / 2;
      const dir = seg.directionVector();
      const perp = perpendicular(dir); // unit; +perp = right of p1→p2
      const rot = angle(dir);
      const segLen = seg.length();
      if (segLen < bayLen) continue;
      const n = Math.max(1, Math.floor(segLen / spacing));

      const sides: number[] = [];
      if (seg.parkingRight) sides.push(1);
      if (seg.parkingLeft) sides.push(-1);

      for (const side of sides) {
        for (let i = 0; i < n; i++) {
          const along = lerp2D(seg.p1, seg.p2, (i + 0.5) / n);
          const center = add(along, scale(perp, laneCenter * side));
          ctx.save();
          ctx.translate(center.x, center.y);
          ctx.rotate(rot);
          ctx.beginPath();
          ctx.textBaseline = 'middle';
          ctx.textAlign = 'center';
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.font = 'bold ' + PARKING_LANE_WIDTH_PX * 0.8 + 'px Arial';
          ctx.fillText('P', 0, 0);
          ctx.restore();
        }
      }
    }
  }

  #drawSimpleLaneMarkings(
    ctx: CanvasRenderingContext2D,
    seg: Segment,
    laneCount: number,
  ): void {
    // Single-lane roads have no center line to draw.
    if (laneCount <= 1) {
      return;
    }

    if (seg.oneWay) {
      // For 2+ lane one-way roads, draw a dashed center divider between lanes
      if (laneCount >= 2) {
        drawSegment(ctx, seg, { color: 'white', width: 3, dash: [10, 20] });
      }
    } else if (seg.separated) {
      drawSegment(ctx, seg, { color: 'white', width: 4 });
    } else {
      drawSegment(ctx, seg, { color: 'white', width: 4, dash: [15, 25] });
    }
  }

  #drawMultiLaneDividers(
    ctx: CanvasRenderingContext2D,
    seg: Segment,
    laneCount: number,
    roadWidth: number,
  ): void {
    const dir = seg.directionVector();
    const perpDir = normalize(new Point(-dir.y, dir.x));
    const laneWidth = roadWidth / laneCount;

    for (let i = 0; i < laneCount - 1; i++) {
      const offset = (i + 1 - laneCount / 2) * laneWidth;
      if (Math.abs(offset) >= roadWidth / 2 - 1) continue;
      const distFromCenter = Math.abs(offset);
      const isCenterDivider = distFromCenter < laneWidth * 0.6;
      const p1 = add(seg.p1, scale(perpDir, offset));
      const p2 = add(seg.p2, scale(perpDir, offset));
      const dividerSeg = new Segment(p1, p2);

      if (seg.oneWay) {
        drawSegment(ctx, dividerSeg, {
          color: 'white',
          width: 2,
          dash: [8, 16],
        });
      } else if (seg.separated && isCenterDivider) {
        drawSegment(ctx, dividerSeg, { color: 'white', width: 4 });
      } else if (isCenterDivider) {
        drawSegment(ctx, dividerSeg, {
          color: 'white',
          width: 4,
          dash: [15, 25],
        });
      } else {
        drawSegment(ctx, dividerSeg, {
          color: 'white',
          width: 2,
          dash: [8, 16],
        });
      }
    }
  }
}
