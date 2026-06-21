type LightState = 'off' | 'green' | 'yellow' | 'red';

class Light extends Marking {
  public state: LightState = 'off';
  border: Segment;
  readonly type: string = 'light';

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
    new Segment(redPoint, greenPoint).draw(ctx, {
      width: this.height, // Uses this.height (which is 18 from super) as the thickness
      cap: 'round',
    });

    // Calculate the size of the light circles based on the housing height
    const lightSize = this.height * 0.6;

    // Draw the "off" state (dark circles) for all lights first
    greenPoint.draw(ctx, { size: lightSize, color: '#060' }); // Dark green
    yellowPoint.draw(ctx, { size: lightSize, color: '#660' }); // Dark yellow/brown
    redPoint.draw(ctx, { size: lightSize, color: '#600' }); // Dark red

    // Overlay the bright "on" light based on the current state
    switch (this.state) {
      case 'green':
        greenPoint.draw(ctx, { size: lightSize, color: '#0F0' }); // Bright green
        break;
      case 'yellow':
        yellowPoint.draw(ctx, { size: lightSize, color: '#FF0' }); // Bright yellow
        break;
      case 'red':
        redPoint.draw(ctx, { size: lightSize, color: '#F00' }); // Bright red
        break;
      // If state is 'off', no bright light is drawn.
      case 'off':
      default:
        break;
    }
  }
}
