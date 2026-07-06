import { Marking } from './marking.js';
import { Point } from '../../math/primitives/point.js';
import { Segment } from '../../math/primitives/segment.js';
import { perpendicular, scale, add } from '../../math/utils.js';
import { drawSegment } from '../../rendering/segmentRenderer.js';

export class Crossing extends Marking {
  override type: string = 'crossing';
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
    const perp = perpendicular(this.directionVector);
    const line = new Segment(
      add(this.center, scale(perp, this.width / 2)),
      add(this.center, scale(perp, -this.width / 2)),
    );
    drawSegment(ctx, line, {
      width: this.height,
      color: 'white',
      dash: [11, 11],
    });
  }
}
