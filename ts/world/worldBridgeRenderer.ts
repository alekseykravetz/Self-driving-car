import { Envelope } from '../math/primitives/envelope.js';
import { scale, perpendicular, lerp2D } from '../math/utils.js';
import { LANE_WIDTH_PX } from '../math/worldUnits.js';
import type { VisibleWorldRect } from '../viewport/viewport.js';
import { polygonInView } from './worldViewCulling.js';

/**
 * Renders bridge elevation shadows and deck details (concrete overlay,
 * parapets, guardrail posts, expansion joints) for a {@link World}. Mirrors
 * the `WorldSignageRenderer` collaborator pattern.
 */
export class WorldBridgeRenderer {
  /**
   * Bridge elevation shadows: a dark, semi-transparent copy of each bridge
   * envelope's polygon, offset slightly to the lower-right, painted
   * between the asphalt fill and the road borders. `envelopes` must already
   * be tier-sorted so higher-tier bridges cast over lower-tier roads.
   */
  drawShadows(
    ctx: CanvasRenderingContext2D,
    envelopes: Envelope[],
    screenBounds?: VisibleWorldRect,
  ): void {
    const SHADOW_DX = 4;
    const SHADOW_DY = 6;
    // Accumulate every bridge envelope's offset polygon into a SINGLE path and
    // fill once. Filling all sub-paths in one `fill()` call means overlapping
    // regions (e.g. where two connected bridge segments meet, including their
    // rounded end-caps) are painted only once — so the shadow stays a uniform
    // 30% black instead of darkening into a circle at the overlap.
    let hasBridge = false;
    ctx.beginPath();
    for (const env of envelopes) {
      if (!env.skeleton.bridge) continue;
      if (screenBounds && !polygonInView(env.polygon, screenBounds)) {
        continue;
      }
      hasBridge = true;
      const poly = env.polygon;
      ctx.moveTo(poly.points[0].x + SHADOW_DX, poly.points[0].y + SHADOW_DY);
      for (let i = 1; i < poly.points.length; i++) {
        ctx.lineTo(poly.points[i].x + SHADOW_DX, poly.points[i].y + SHADOW_DY);
      }
      ctx.closePath();
    }
    if (!hasBridge) return;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.strokeStyle = 'transparent';
    ctx.fill();
  }

  /**
   * Bridge deck details: concrete surface overlay, parapet railings,
   * guardrail posts, and expansion joints.
   *
   * Designed to be subtle but readable — gives bridges a distinct
   * "engineered structure" feel without adding visual noise.
   */
  drawDetails(
    ctx: CanvasRenderingContext2D,
    envelopes: Envelope[],
    screenBounds?: VisibleWorldRect,
  ): void {
    const PARAPET_WIDTH = 6;
    const PARAPET_INSET = 3; // px inset from the road border (white line)
    const GUARDRAIL_INTERVAL = 35; // px spacing between posts
    const GUARDRAIL_POST_LEN = 10; // px length of each post tick
    const JOINT_INTERVAL = 120; // px spacing between expansion joints

    // --- 1. Concrete deck overlay: a subtle light-gray tint so the bridge
    //     reads as concrete rather than asphalt. Accumulate every bridge
    //     envelope into a SINGLE path and fill once — filling all sub-paths
    //     in one `fill()` means the overlapping rounded end-caps of connected
    //     bridge segments are painted only once, so the tint stays uniform
    //     instead of stacking into brighter/darker circles at the joints.
    let hasBridge = false;
    ctx.beginPath();
    for (const env of envelopes) {
      if (!env.skeleton.bridge) continue;
      if (screenBounds && !polygonInView(env.polygon, screenBounds)) {
        continue;
      }
      hasBridge = true;
      const poly = env.polygon;
      ctx.moveTo(poly.points[0].x, poly.points[0].y);
      for (let i = 1; i < poly.points.length; i++) {
        ctx.lineTo(poly.points[i].x, poly.points[i].y);
      }
      ctx.closePath();
    }
    if (hasBridge) {
      ctx.fillStyle = 'rgba(210, 210, 200, 0.15)';
      ctx.fill();
    }

    for (const env of envelopes) {
      if (screenBounds && !polygonInView(env.polygon, screenBounds)) {
        continue;
      }
      if (!env.skeleton.bridge) continue;

      const seg = env.skeleton;
      const dirVec = seg.directionVector();
      const perp = perpendicular(dirVec);
      const halfWidth = ((seg.lanes ?? 2) * LANE_WIDTH_PX) / 2;
      const segLen = seg.length();
      if (segLen < 1) continue;

      // --- 2. Parapet walls: thick gray lines running along both road
      //     edges, inset slightly from the white road borders.
      const parapetOffset = halfWidth - PARAPET_INSET;
      const leftOffset = scale(perp, parapetOffset);
      const rightOffset = scale(perp, -parapetOffset);

      ctx.strokeStyle = '#888';
      ctx.lineWidth = PARAPET_WIDTH;
      ctx.lineCap = 'round';

      // Left parapet
      ctx.beginPath();
      ctx.moveTo(seg.p1.x + leftOffset.x, seg.p1.y + leftOffset.y);
      ctx.lineTo(seg.p2.x + leftOffset.x, seg.p2.y + leftOffset.y);
      ctx.stroke();

      // Right parapet
      ctx.beginPath();
      ctx.moveTo(seg.p1.x + rightOffset.x, seg.p1.y + rightOffset.y);
      ctx.lineTo(seg.p2.x + rightOffset.x, seg.p2.y + rightOffset.y);
      ctx.stroke();

      // --- 3. Guardrail posts: small perpendicular tick marks at
      //     regular intervals along both edges.
      ctx.strokeStyle = '#999';
      ctx.lineWidth = 2;
      const postCount = Math.max(1, Math.floor(segLen / GUARDRAIL_INTERVAL));
      for (let i = 1; i < postCount; i++) {
        const t = i / postCount;
        const mid = lerp2D(seg.p1, seg.p2, t);

        // Left side — post extends outward from the parapet.
        const leftPost = scale(perp, parapetOffset + GUARDRAIL_POST_LEN);
        ctx.beginPath();
        ctx.moveTo(mid.x + leftOffset.x, mid.y + leftOffset.y);
        ctx.lineTo(mid.x + leftPost.x, mid.y + leftPost.y);
        ctx.stroke();

        // Right side
        const rightPost = scale(perp, -(parapetOffset + GUARDRAIL_POST_LEN));
        ctx.beginPath();
        ctx.moveTo(mid.x + rightOffset.x, mid.y + rightOffset.y);
        ctx.lineTo(mid.x + rightPost.x, mid.y + rightPost.y);
        ctx.stroke();
      }

      // --- 4. Expansion joints: thin dark lines spanning the full road
      //     width at regular intervals, suggesting deck segments.
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
      ctx.lineWidth = 1.5;
      const jointCount = Math.max(1, Math.floor(segLen / JOINT_INTERVAL));
      for (let i = 1; i < jointCount; i++) {
        const t = i / jointCount;
        const mid = lerp2D(seg.p1, seg.p2, t);
        const jointOffset = scale(perp, halfWidth);

        ctx.beginPath();
        ctx.moveTo(mid.x - jointOffset.x, mid.y - jointOffset.y);
        ctx.lineTo(mid.x + jointOffset.x, mid.y + jointOffset.y);
        ctx.stroke();
      }
    }
  }
}
