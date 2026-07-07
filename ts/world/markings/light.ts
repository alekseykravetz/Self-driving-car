import { Marking } from './marking.js';
import { Point } from '../../math/primitives/point.js';
import { Segment } from '../../math/primitives/segment.js';
import { perpendicular, scale, add, lerp2D } from '../../math/utils.js';
import { drawSegment } from '../../rendering/segmentRenderer.js';
import { drawPoint } from '../../rendering/pointRenderer.js';

export type LightState = 'off' | 'green' | 'yellow' | 'red';

export class Light extends Marking {
  public state: LightState = 'off';
  #overridden: boolean = false;
  border: Segment;
  readonly type: string = 'light';

  get overridden(): boolean {
    return this.#overridden;
  }

  override(state: LightState): void {
    this.#overridden = true;
    this.state = state;
  }

  releaseOverride(): void {
    this.#overridden = false;
  }

  /**
   * Constructs a Traffic Light marking.
   * @param center The center point of the light strip.
   * @param directionVector The vector pointing along the direction of the road.
   * @param width The width of the road (light strip spans this width).
   */
  constructor(center: Point, directionVector: Point, width: number) {
    super(center, directionVector, width, 18);

    this.border = this.polygon.segments[0];
  }

  protected override rebuildGeometry(): void {
    super.rebuildGeometry();
    this.border = this.polygon.segments[0];
  }

  /**
   * Draws the traffic light onto the canvas.
   * @param ctx The CanvasRenderingContext2D to draw on.
   */
  draw(ctx: CanvasRenderingContext2D): void {
    // Calculate the perpendicular vector to the road direction
    const perp: Point = perpendicular(this.directionVector);
    // Define the line segment across the road where the lights sit
    const line = new Segment(
      add(this.center, scale(perp, this.width / 2)), // Point on one side
      add(this.center, scale(perp, -this.width / 2)), // Point on the other side
    );

    // Calculate the positions of the individual lights along the line
    const greenPoint: Point = lerp2D(line.p1, line.p2, 0.2);
    const yellowPoint: Point = lerp2D(line.p1, line.p2, 0.5);
    const redPoint: Point = lerp2D(line.p1, line.p2, 0.8);

    // Draw the background bar (housing) for the lights
    drawSegment(ctx, new Segment(redPoint, greenPoint), {
      width: this.height,
      cap: 'round',
    });

    // Visual indicator for overridden lights: a cyan "M" badge above the housing
    if (this.#overridden) {
      ctx.save();
      ctx.fillStyle = '#0FF';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('M', this.center.x, greenPoint.y - this.height / 2 - 2);
      ctx.restore();
    }

    // Calculate the size of the light circles based on the housing height
    const lightSize = this.height * 0.6;

    // Draw the "off" state (dark circles) for all lights first
    drawPoint(ctx, greenPoint, { size: lightSize, color: '#060' }); // Dark green
    drawPoint(ctx, yellowPoint, { size: lightSize, color: '#660' }); // Dark yellow/brown
    drawPoint(ctx, redPoint, { size: lightSize, color: '#600' }); // Dark red

    // Overlay the bright "on" light based on the current state
    switch (this.state) {
      case 'green':
        drawPoint(ctx, greenPoint, { size: lightSize, color: '#0F0' }); // Bright green
        break;
      case 'yellow':
        drawPoint(ctx, yellowPoint, { size: lightSize, color: '#FF0' }); // Bright yellow
        break;
      case 'red':
        drawPoint(ctx, redPoint, { size: lightSize, color: '#F00' }); // Bright red
        break;
      // If state is 'off', no bright light is drawn.
      case 'off':
      default:
        break;
    }
  }
}
