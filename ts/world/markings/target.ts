import { Marking } from './marking.js';
import { Point } from '../../math/primitives/point.js';
import { drawPoint } from '../../rendering/pointRenderer.js';

export class Target extends Marking {
  override type: string = 'target';

  constructor(
    center: Point,
    directionVector: Point,
    width: number,
    height: number,
  ) {
    super(center, directionVector, width, height);
  }

  draw(ctx: CanvasRenderingContext2D) {
    drawPoint(ctx, this.center, { size: 30, color: 'red' });
    drawPoint(ctx, this.center, { size: 20, color: 'white' });
    drawPoint(ctx, this.center, { size: 10, color: 'red' });
  }
}
