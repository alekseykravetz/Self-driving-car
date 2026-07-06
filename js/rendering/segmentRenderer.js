export function drawSegment(
  ctx,
  segment,
  { width = 2, color = 'black', dash = [], cap = 'butt' } = {},
) {
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
