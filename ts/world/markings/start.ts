import { Marking } from './marking.js';
import { Point } from '../../math/primitives/point.js';
import { drawRotationFromDirection } from '../../math/direction.js';

const START_SPRITE_WIDTH = 30;
const START_SPRITE_HEIGHT = 50;

export class Start extends Marking {
  // Property to hold the car image element
  image: HTMLImageElement;
  // Override the type from the base Marking class
  override type: string = 'start';

  /**
   * Creates a Start marking, typically representing a car's starting position.
   * @param center The center point of the starting position.
   * @param directionVector A vector indicating the starting orientation.
   * @param width Width parameter inherited from Marking (might not be visually used by Start).
   * @param height Height parameter inherited from Marking (might not be visually used by Start).
   */
  constructor(
    center: Point,
    directionVector: Point,
    width: number,
    height: number,
  ) {
    super(center, directionVector, width, height);

    this.image = new Image();
    this.image.src = '/assets/car.png';
    this.image.onerror = () => {
      console.error(`Failed to load start marking image: ${this.image.src}`);
    };
  }

  /**
   * Draws the start marking (the car image) on the canvas.
   * @param ctx The canvas rendering context.
   */
  override draw(ctx: CanvasRenderingContext2D): void {
    ctx.save(); // Save the current canvas state

    // Move the origin to the center of the marking
    ctx.translate(this.center.x, this.center.y);

    // Rotate the canvas so the (up-facing) car image faces the travel direction
    ctx.rotate(drawRotationFromDirection(this.directionVector));

    // Draw the image centered at the translated and rotated origin
    // Only draw if the image has loaded (width will be > 0)
    if (this.image.naturalWidth > 0) {
      // Use naturalWidth for loaded check
      ctx.drawImage(
        this.image,
        -START_SPRITE_WIDTH / 2,
        -START_SPRITE_HEIGHT / 2,
        START_SPRITE_WIDTH,
        START_SPRITE_HEIGHT,
      );
    }

    ctx.restore(); // Restore the canvas state
  }
}
