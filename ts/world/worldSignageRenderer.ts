import { Graph } from '../math/graph/graph.js';
import { Point } from '../math/primitives/point.js';
import { add, scale, rotate } from '../math/utils.js';
import {
  computeSpeedSignPlacements,
  computeStreetLabelPlacements,
  computeRoadShieldPlacements,
  computeExitSignPlacements,
  MIN_SIGNAGE_ZOOM,
} from './roadSignage.js';
import { getSignageLanguage } from './signageLanguage.js';
import type {
  StreetLabelPlacement,
  SpeedSignPlacement,
  RoadShieldPlacement,
  ExitSignPlacement,
} from './roadSignage.js';
import {
  computeOneWayArrowPlacements,
  ONE_WAY_ARROW_SHAFT_PX,
  ONE_WAY_ARROW_HEAD_PX,
  ONE_WAY_ARROW_HEAD_ANGLE,
} from './oneWayArrows.js';
import type { OneWayArrowPlacement } from './oneWayArrows.js';

/**
 * Renders the road-signage subsystem for a {@link World}: one-way direction
 * arrows, street-name labels, speed-limit signs, road-shield badges (route
 * refs), and gantry exit signs (destinations).
 *
 * Placement math lives in the pure modules `roadSignage.ts` /
 * `oneWayArrows.ts`; this collaborator caches those placements by
 * `Graph.hash()` and owns only canvas drawing (inside `draw*` methods).
 * `World` decides *when* signage draws; this class decides *how*.
 */
export class WorldSignageRenderer {
  // Road signage placement caches, invalidated by Graph.hash() changes.
  #signageCache: {
    hash: string;
    labels: StreetLabelPlacement[];
    signs: SpeedSignPlacement[];
  } | null = null;
  #oneWayArrowCache: { hash: string; arrows: OneWayArrowPlacement[] } | null =
    null;
  #shieldCache: { hash: string; shields: RoadShieldPlacement[] } | null = null;
  #exitSignCache: { hash: string; signs: ExitSignPlacement[] } | null = null;

  // Precomputed graph hash for the current frame. `Graph.hash()` is O(n) and was
  // being recomputed once per signage getter (~5 passes/frame). World sets this
  // once via setFrameHash() so all getters share a single hash computation.
  #frameHash: string | null = null;

  /**
   * Supplies the graph hash for the current draw frame so the placement getters
   * avoid recomputing `Graph.hash()` individually. Pass `null` to fall back to
   * computing the hash on demand.
   */
  setFrameHash(hash: string | null): void {
    this.#frameHash = hash;
  }

  #graphHash(graph: Graph): string {
    return this.#frameHash ?? graph.hash();
  }

  /**
   * Street-label and speed-sign placements, recomputed only when the graph
   * (geometry or name/maxSpeed metadata) changes, as detected by its hash.
   */
  #getSignage(graph: Graph): {
    labels: StreetLabelPlacement[];
    signs: SpeedSignPlacement[];
  } {
    // Fold the active signage language into the key: it selects label text but
    // is not part of the graph, so a language change must invalidate the cache.
    const hash = `${this.#graphHash(graph)}|${getSignageLanguage()}`;
    if (!this.#signageCache || this.#signageCache.hash !== hash) {
      const signs = computeSpeedSignPlacements(graph);
      const labels = computeStreetLabelPlacements(graph.segments, {
        avoid: signs,
      });
      this.#signageCache = { hash, labels, signs };
    }
    return this.#signageCache;
  }

  #getOneWayArrows(graph: Graph): OneWayArrowPlacement[] {
    const hash = this.#graphHash(graph);
    if (!this.#oneWayArrowCache || this.#oneWayArrowCache.hash !== hash) {
      this.#oneWayArrowCache = {
        hash,
        arrows: computeOneWayArrowPlacements(graph),
      };
    }
    return this.#oneWayArrowCache.arrows;
  }

  #getRoadShields(graph: Graph): RoadShieldPlacement[] {
    const hash = this.#graphHash(graph);
    if (!this.#shieldCache || this.#shieldCache.hash !== hash) {
      this.#shieldCache = {
        hash,
        shields: computeRoadShieldPlacements(graph),
      };
    }
    return this.#shieldCache.shields;
  }

  #getExitSigns(graph: Graph): ExitSignPlacement[] {
    const hash = this.#graphHash(graph);
    if (!this.#exitSignCache || this.#exitSignCache.hash !== hash) {
      this.#exitSignCache = {
        hash,
        signs: computeExitSignPlacements(graph),
      };
    }
    return this.#exitSignCache.signs;
  }

  /** Draw one-way direction arrows from cached chain-aware placements. */
  drawOneWayArrows(ctx: CanvasRenderingContext2D, graph: Graph): void {
    const arrows = this.#getOneWayArrows(graph);
    const totalLen = ONE_WAY_ARROW_SHAFT_PX + ONE_WAY_ARROW_HEAD_PX;
    const originalLineCap = ctx.lineCap;
    const originalLineWidth = ctx.lineWidth;
    ctx.strokeStyle = 'white';
    ctx.fillStyle = 'white';
    ctx.lineWidth = 2;
    ctx.lineCap = 'butt';
    for (const arrow of arrows) {
      const tip = new Point(arrow.x, arrow.y);
      const back = new Point(-Math.cos(arrow.angle), -Math.sin(arrow.angle));
      const shaftStart = add(tip, scale(back, totalLen));
      const headBase = add(tip, scale(back, ONE_WAY_ARROW_HEAD_PX));
      const wing1 = add(
        tip,
        scale(rotate(back, ONE_WAY_ARROW_HEAD_ANGLE), ONE_WAY_ARROW_HEAD_PX),
      );
      const wing2 = add(
        tip,
        scale(rotate(back, -ONE_WAY_ARROW_HEAD_ANGLE), ONE_WAY_ARROW_HEAD_PX),
      );
      // Shaft
      ctx.beginPath();
      ctx.moveTo(shaftStart.x, shaftStart.y);
      ctx.lineTo(headBase.x, headBase.y);
      ctx.stroke();
      // Filled triangular head (same geometry as the old triangle)
      ctx.beginPath();
      ctx.moveTo(wing1.x, wing1.y);
      ctx.lineTo(tip.x, tip.y);
      ctx.lineTo(wing2.x, wing2.y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.lineCap = originalLineCap;
    ctx.lineWidth = originalLineWidth;
  }

  /** Draws road-shield badges (route refs) along named routes. */
  drawRoadShields(
    ctx: CanvasRenderingContext2D,
    graph: Graph,
    zoom: number | undefined,
  ): void {
    if (!zoom || zoom < MIN_SIGNAGE_ZOOM) return;

    const W = 40;
    const H = 24;
    const R = 6;

    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const s of this.#getRoadShields(graph)) {
      const type = s.highwayType ?? '';
      const blue =
        type === 'motorway' ||
        type === 'motorway_link' ||
        type === 'trunk' ||
        type === 'trunk_link';
      const bordered =
        type === 'primary' ||
        type === 'primary_link' ||
        type === 'secondary' ||
        type === 'secondary_link';

      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);

      // Rounded rectangle badge.
      ctx.beginPath();
      const x0 = -W / 2;
      const y0 = -H / 2;
      ctx.moveTo(x0 + R, y0);
      ctx.arcTo(x0 + W, y0, x0 + W, y0 + H, R);
      ctx.arcTo(x0 + W, y0 + H, x0, y0 + H, R);
      ctx.arcTo(x0, y0 + H, x0, y0, R);
      ctx.arcTo(x0, y0, x0 + W, y0, R);
      ctx.closePath();
      ctx.fillStyle = blue ? '#2B6CB0' : 'white';
      ctx.fill();
      if (bordered) {
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.fillStyle = blue ? 'white' : 'black';
      ctx.fillText(s.ref, 0, 0);
      ctx.restore();
    }
  }

  /** Draws gantry-style green exit signs on `_link` roads. */
  drawExitSigns(
    ctx: CanvasRenderingContext2D,
    graph: Graph,
    zoom: number | undefined,
  ): void {
    if (!zoom || zoom < MIN_SIGNAGE_ZOOM) return;

    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const s of this.#getExitSigns(graph)) {
      const dests = s.destination
        .split(';')
        .map((d) => d.trim())
        .filter(Boolean);
      const padX = 8;
      const lineH = 16;
      const H = Math.max(28, dests.length * lineH + 8);
      const maxTextW = Math.max(
        ...dests.map((d) => ctx.measureText(d).width),
        40,
      );
      const labelW = s.destinationRef
        ? ctx.measureText(s.destinationRef).width + 8
        : 0;
      const W = maxTextW + padX * 2 + labelW;
      const R = 6;

      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.angle);

      const x0 = -W / 2;
      const y0 = -H / 2;
      ctx.beginPath();
      ctx.moveTo(x0 + R, y0);
      ctx.arcTo(x0 + W, y0, x0 + W, y0 + H, R);
      ctx.arcTo(x0 + W, y0 + H, x0, y0 + H, R);
      ctx.arcTo(x0, y0 + H, x0, y0, R);
      ctx.arcTo(x0, y0, x0 + W, y0, R);
      ctx.closePath();
      ctx.fillStyle = '#1B7A3D';
      ctx.fill();

      // Optional exit-ref badge on the left side.
      let textX = 0;
      if (s.destinationRef) {
        const badgeW = labelW;
        const bx0 = x0 + 2;
        ctx.beginPath();
        ctx.moveTo(bx0 + R, y0 + 2);
        ctx.arcTo(bx0 + badgeW, y0 + 2, bx0 + badgeW, y0 + H - 2, R);
        ctx.arcTo(bx0 + badgeW, y0 + H - 2, bx0, y0 + H - 2, R);
        ctx.arcTo(bx0, y0 + H - 2, bx0, y0 + 2, R);
        ctx.arcTo(bx0, y0 + 2, bx0 + badgeW, y0 + 2, R);
        ctx.closePath();
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.fillStyle = '#1B7A3D';
        ctx.fillText(s.destinationRef, bx0 + badgeW / 2, 0);
        // Shift the main destinations column to the right of the badge.
        textX = bx0 + badgeW + (W - badgeW) / 2;
      }

      ctx.fillStyle = 'white';
      const totalTextH = dests.length * lineH;
      let ty = -totalTextH / 2 + lineH / 2;
      for (const d of dests) {
        ctx.fillText(d, textX, ty);
        ty += lineH;
      }
      ctx.restore();
    }
  }

  /** Draws road-name labels along streets. */
  drawRoadNames(
    ctx: CanvasRenderingContext2D,
    graph: Graph,
    zoom: number | undefined,
  ): void {
    if (!zoom || zoom < MIN_SIGNAGE_ZOOM) return;

    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const label of this.#getSignage(graph).labels) {
      ctx.save();
      ctx.translate(label.x, label.y);
      ctx.rotate(label.angle);

      const textWidth = ctx.measureText(label.name).width;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(-textWidth / 2 - 4, -10, textWidth + 8, 20);

      ctx.fillStyle = 'white';
      ctx.fillText(label.name, 0, 0);
      ctx.restore();
    }
  }

  /** Draws speed limit signs (red-ringed circle with number) at changes. */
  drawSpeedLimits(
    ctx: CanvasRenderingContext2D,
    graph: Graph,
    zoom: number | undefined,
  ): void {
    if (!zoom || zoom < MIN_SIGNAGE_ZOOM) return;

    const signRadius = 16;

    for (const sign of this.#getSignage(graph).signs) {
      // Draw red ring
      ctx.beginPath();
      ctx.arc(sign.x, sign.y, signRadius, 0, Math.PI * 2);
      ctx.fillStyle = 'white';
      ctx.fill();
      ctx.strokeStyle = '#D4242B';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw speed number
      ctx.fillStyle = '#222';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(sign.maxSpeed), sign.x, sign.y);
    }
  }
}
