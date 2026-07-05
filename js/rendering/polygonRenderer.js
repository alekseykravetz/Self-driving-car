'use strict';
function drawPolygon(
  ctx,
  polygon,
  {
    stroke = 'blue',
    lineWidth = 2,
    fill = 'rgba(0,0,255,0.3)',
    join = 'miter',
  } = {},
) {
  ctx.beginPath();
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = join;
  ctx.moveTo(polygon.points[0].x, polygon.points[0].y);
  for (let i = 1; i < polygon.points.length; i++) {
    ctx.lineTo(polygon.points[i].x, polygon.points[i].y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}
