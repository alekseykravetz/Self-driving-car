import { Envelope } from '../math/primitives/envelope.js';
import { drawPolygon, PolygonDrawOptions } from './polygonRenderer.js';

export function drawEnvelope(
  ctx: CanvasRenderingContext2D,
  envelope: Envelope,
  options?: PolygonDrawOptions,
): void {
  drawPolygon(ctx, envelope.polygon, options);
}
