function drawEnvelope(
  ctx: CanvasRenderingContext2D,
  envelope: Envelope,
  options?: PolygonDrawOptions,
): void {
  drawPolygon(ctx, envelope.polygon, options);
}
