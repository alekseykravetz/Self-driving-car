'use strict';
class Target extends Marking {
  type = 'target';
  constructor(center, directionVector, width, height) {
    super(center, directionVector, width, height);
  }

  draw(ctx) {
    drawPoint(ctx, this.center, { size: 30, color: 'red' });
    drawPoint(ctx, this.center, { size: 20, color: 'white' });
    drawPoint(ctx, this.center, { size: 10, color: 'red' });
  }
}
