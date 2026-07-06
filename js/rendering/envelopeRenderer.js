import { drawPolygon } from './polygonRenderer.js';
export function drawEnvelope(ctx, envelope, options) {
  drawPolygon(ctx, envelope.polygon, options);
}
