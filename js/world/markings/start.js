'use strict';
class Start extends Marking {
  // Property to hold the car image element
  image;
  // Override the type from the base Marking class
  type = 'start';
  /**
   * Creates a Start marking, typically representing a car's starting position.
   * @param center The center point of the starting position.
   * @param directionVector A vector indicating the starting orientation.
   * @param width Width parameter inherited from Marking (might not be visually used by Start).
   * @param height Height parameter inherited from Marking (might not be visually used by Start).
   */
  constructor(center, directionVector, width, height) {
    super(center, directionVector, width, height);
    this.image = new Image();
    this.image.src = 'assets/world/car.png';
    this.image.onerror = () => {
      console.error(`Failed to load start marking image: ${this.image.src}`);
    };
  }

  /**
   * Draws the start marking (the car image) on the canvas.
   * @param ctx The canvas rendering context.
   */
  draw(ctx) {
    ctx.save(); // Save the current canvas state
    // Move the origin to the center of the marking
    ctx.translate(this.center.x, this.center.y);
    // Rotate the canvas to match the direction vector
    // Subtracting PI/2 (90 degrees) assumes the car image faces upwards
    // and needs to be rotated to align with the road direction. Adjust if needed.
    ctx.rotate(angle(this.directionVector) - Math.PI / 2);
    // Draw the image centered at the translated and rotated origin
    // Only draw if the image has loaded (width will be > 0)
    if (this.image.naturalWidth > 0) {
      // Use naturalWidth for loaded check
      ctx.drawImage(
        this.image,
        -this.image.naturalWidth / 2, // Center image horizontally
        -this.image.naturalHeight / 2,
      );
    } else {
      // Optional: Draw a placeholder if the image hasn't loaded yet
      // ctx.fillStyle = 'red';
      // ctx.fillRect(-this.width / 4, -this.height / 4, this.width / 2, this.height / 2); // Example placeholder
    }
    ctx.restore(); // Restore the canvas state
  }
}
