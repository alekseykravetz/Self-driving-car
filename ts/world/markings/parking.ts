import { Marking } from './marking.js';
import { Point } from '../../math/primitives/point.js';
import { Segment } from '../../math/primitives/segment.js';
import { drawSegment } from '../../rendering/segmentRenderer.js';
import { angle } from '../../math/utils.js';

export class Parking extends Marking {
  override type: string = 'parking';
  borders: Segment[];
  constructor(
    center: Point,
    directionVector: Point,
    width: number,
    height: number,
  ) {
    super(center, directionVector, width, height);

    this.borders = [this.polygon.segments[0], this.polygon.segments[2]];
  }

  protected override rebuildGeometry(): void {
    super.rebuildGeometry();
    this.borders = [this.polygon.segments[0], this.polygon.segments[2]];
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const border of this.borders) {
      drawSegment(ctx, border, { width: 5, color: 'white' });
    }
    ctx.save();
    ctx.translate(this.center.x, this.center.y);
    ctx.rotate(angle(this.directionVector));

    ctx.beginPath();
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'white';
    ctx.font = 'bold ' + this.height * 0.9 + 'px Arial';
    ctx.fillText('P', 0, 3);
    ctx.restore();
  }
}
