import { Segment } from '../math/primitives/segment.js';

export interface SegmentDrawOptions {
  width?: number;
  color?: string;
  dash?: number[];
  cap?: CanvasLineCap;
}

export function drawSegment(
  ctx: CanvasRenderingContext2D,
  segment: Segment,
  {
    width = 2,
    color = 'black',
    dash = [],
    cap = 'butt',
  }: SegmentDrawOptions = {},
): void {
  ctx.beginPath();
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.lineCap = cap;
  ctx.setLineDash(dash);
  ctx.moveTo(segment.p1.x, segment.p1.y);
  ctx.lineTo(segment.p2.x, segment.p2.y);
  ctx.stroke();
  ctx.setLineDash([]);
}
