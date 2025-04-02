'use strict';
class Point {
  x;
  y;
  z;
  intersection;
  constructor(x, y, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  equals(point) {
    return this.x === point.x && this.y === point.y;
  }

  draw(ctx, options = {}) {
    const {
      size = 18,
      color = 'black',
      outline = false,
      fill = false,
    } = options;
    const rad = size / 2;
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(this.x, this.y, rad, 0, Math.PI * 2);
    ctx.fill();
    if (outline) {
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'yellow';
      ctx.arc(this.x, this.y, rad * 0.6, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (fill) {
      ctx.beginPath();
      ctx.fillStyle = 'yellow';
      ctx.arc(this.x, this.y, rad * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
