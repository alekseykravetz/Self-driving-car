/**
 * Stateless drawing & math primitives for the neural-network visualizer.
 *
 * Every export here is a pure function of its arguments (plus the passed 2D
 * context) — no instance state, no caching. They were extracted from
 * {@link NetworkVisualizer} so the visualizer class stays focused on layout,
 * hover state and orchestration while the reusable palette math, hit-test math,
 * and label/tooltip/arrow chrome live in one cohesive, independently testable
 * module.
 */

import { lerp } from '../math/utils.js';
import type { ArrowDir } from './visualizerTypes.js';

/**
 * Diverging palette: positive → amber→yellow, negative → cyan. Both read
 * strongly on the black canvas (unlike the old dark blue).
 */
export function divergingColor(value: number, alpha: number): string {
  // Brains that have never been fed (e.g. the KEYS car's brain, which is
  // built but never driven by feedForward) have undefined/NaN neuron
  // values. Treat those as 0 so the visualizer renders a neutral net
  // instead of crashing on `rgba(NaN, NaN, 255, NaN)`.
  const v = Number.isFinite(value) ? value : 0;
  const a = Number.isFinite(alpha) ? alpha : 0;
  const t = Math.max(-1, Math.min(1, v));
  let r: number;
  let g: number;
  let b: number;
  if (t >= 0) {
    // #FFB000 (low) → #FFE44D (high)
    r = 255;
    g = Math.round(lerp(176, 228, t));
    b = Math.round(lerp(0, 77, t));
  } else {
    // pale cyan (low magnitude) → pure #00E5FF (high magnitude)
    const m = -t;
    r = Math.round(lerp(140, 0, m));
    g = Math.round(lerp(210, 229, m));
    b = 255;
  }
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** Alpha with a floor so weak values stay faintly visible instead of vanishing. */
export function alphaFloor(value: number): number {
  const v = Number.isFinite(value) ? value : 0;
  return 0.25 + 0.75 * Math.min(1, Math.abs(v));
}

/** Shortest distance from a point to a line segment. */
export function pointSegmentDistance(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/** Trace a rounded-rectangle path (caller fills/strokes). */
export function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** A small dark rounded chip with light text, used for inline value labels. */
export function drawLabelChip(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  align: 'left' | 'center' | 'right',
): void {
  ctx.font = '10px Arial';
  const padX = 4;
  const padY = 3;
  const lineH = 12;
  let maxW = 0;
  for (const l of lines) maxW = Math.max(maxW, ctx.measureText(l).width);
  const w = maxW + padX * 2;
  const h = lines.length * lineH + padY * 2;
  const bx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
  const by = y - h / 2;

  ctx.beginPath();
  roundRectPath(ctx, bx, by, w, h, 4);
  ctx.fillStyle = 'rgba(10,10,15,0.9)';
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.stroke();

  ctx.fillStyle = 'rgba(240,240,240,0.95)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], bx + w / 2, by + padY + lineH * (i + 0.5));
  }
}

/** A cursor tooltip clamped to stay fully on-canvas. */
export function drawTooltip(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
): void {
  ctx.font = '11px monospace';
  const padX = 8;
  const padY = 6;
  const lineH = 14;
  let maxW = 0;
  for (const l of lines) maxW = Math.max(maxW, ctx.measureText(l).width);
  const w = maxW + padX * 2;
  const h = lines.length * lineH + padY * 2;

  // Clamp so the tooltip never spills off the canvas.
  let bx = x;
  let by = y;
  if (bx + w > ctx.canvas.width) bx = ctx.canvas.width - w - 4;
  if (by + h > ctx.canvas.height) by = ctx.canvas.height - h - 4;
  if (bx < 4) bx = 4;
  if (by < 4) by = 4;

  ctx.beginPath();
  roundRectPath(ctx, bx, by, w, h, 6);
  ctx.fillStyle = 'rgba(10,10,15,0.85)';
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.stroke();

  ctx.fillStyle = 'rgba(240,240,240,0.95)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], bx + padX, by + padY + lineH * (i + 0.5));
  }
}

/**
 * Draw a simple direction arrow centred at (x, y). Stroked twice (dark
 * outline then white) so it reads on any node-core colour.
 */
export function drawArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir: ArrowDir,
  nodeRadius: number,
): void {
  const s = nodeRadius * 0.55; // half-length of the arrow shaft
  const rot = {
    up: 0,
    right: Math.PI / 2,
    down: Math.PI,
    left: -Math.PI / 2,
  }[dir];

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Path traced pointing "up" before rotation.
  const trace = (): void => {
    ctx.beginPath();
    ctx.moveTo(0, s);
    ctx.lineTo(0, -s);
    ctx.moveTo(-s * 0.55, -s * 0.35);
    ctx.lineTo(0, -s);
    ctx.lineTo(s * 0.55, -s * 0.35);
  };

  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.lineWidth = 4;
  trace();
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = 2;
  trace();
  ctx.stroke();

  ctx.restore();
}

/**
 * Input axis labels: `ray1…rayN` (or paired `ray1 d`/`ray1 s` when stateAware),
 * then the trailing `speed` input.
 */
export function inputLabels(count: number, stateAware: boolean): string[] {
  const labels: string[] = [];
  if (stateAware) {
    const rayCount = (count - 1) / 2;
    for (let i = 0; i < rayCount; i++) {
      labels.push(`ray${i + 1} d`);
      labels.push(`ray${i + 1} s`);
    }
  } else {
    for (let i = 0; i < count - 1; i++) labels.push(`ray${i + 1}`);
  }
  labels.push('speed');
  return labels;
}
