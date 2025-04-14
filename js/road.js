'use strict';
class Road {
  x;
  width;
  laneCount;
  left;
  right;
  top;
  bottom;
  borders; // An array of tuples, each containing two Points representing a border line segment
  constructor(x, width, laneCount = 3) {
    this.x = x;
    this.width = width;
    this.laneCount = laneCount;
    this.left = x - width / 2;
    this.right = x + width / 2;
    // Using a large number to simulate infinity for drawing purposes
    const infinity = 1000000;
    this.top = -infinity;
    this.bottom = infinity;
    // Define the corner points for the road borders
    const topLeft = { x: this.left, y: this.top };
    const topRight = { x: this.right, y: this.top };
    const bottomLeft = { x: this.left, y: this.bottom };
    const bottomRight = { x: this.right, y: this.bottom };
    // Store the borders as pairs of points (line segments)
    this.borders = [
      [topLeft, bottomLeft], // Left border
      [topRight, bottomRight], // Right border
    ];
  }

  /**
   * Calculates the center x-coordinate of a specific lane.
   * @param laneIndex - The index of the lane (0-based).
   * @returns The x-coordinate of the center of the specified lane.
   */
  getLaneCenter(laneIndex) {
    const laneWidth = this.width / this.laneCount;
    // Ensure laneIndex doesn't exceed the maximum valid index
    const clampedLaneIndex = Math.min(laneIndex, this.laneCount - 1);
    return this.left + laneWidth / 2 + clampedLaneIndex * laneWidth;
  }

  /**
   * Draws the road (borders and lane dividers) on a canvas context.
   * @param ctx - The CanvasRenderingContext2D to draw on.
   */
  draw(ctx) {
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'white'; // Color of the lines
    // Draw lane dividers (dashed lines)
    for (let i = 1; i < this.laneCount; i++) {
      // Calculate the x-coordinate for the divider using lerp
      const x = lerp(this.left, this.right, i / this.laneCount);
      // Set line style to dashed
      ctx.setLineDash([20, 20]); // 20 pixels drawn, 20 pixels skipped
      ctx.beginPath();
      ctx.moveTo(x, this.top); // Start line at the top
      ctx.lineTo(x, this.bottom); // End line at the bottom
      ctx.stroke(); // Draw the line
    }
    // Draw solid road borders
    ctx.setLineDash([]); // Reset line dash to solid
    this.borders.forEach((border) => {
      ctx.beginPath();
      ctx.moveTo(border[0].x, border[0].y); // Start at the first point of the border segment
      ctx.lineTo(border[1].x, border[1].y); // End at the second point of the border segment
      ctx.stroke(); // Draw the border line
    });
  }
}
