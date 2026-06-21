class Tree {
  // Mark properties as readonly if they shouldn't change after construction
  readonly center: Point;
  readonly size: number; // Diameter of the base level
  readonly height: number;
  readonly base: Polygon; // The ground-level polygon shape

  /**
   * Creates a Tree object.
   * @param center The center point of the tree base on the ground.
   * @param size The diameter of the widest part of the tree (the base).
   * @param height The approximate height of the tree. Defaults to 200.
   */
  constructor(center: Point, size: number, height: number = 200) {
    this.center = center;
    this.size = size;
    this.height = height;

    // Generate the base polygon shape upon construction
    this.base = this.#generateLevel(this.center, this.size);
  }

  /**
   * Private helper method to generate the points for one level of the tree canopy.
   * Creates a slightly irregular, N-sided polygon.
   * @param point The center point for this canopy level.
   * @param size The diameter for this canopy level.
   * @returns A Polygon object representing the shape of this level.
   */
  #generateLevel(point: Point, size: number): Polygon {
    const points: Point[] = [];
    const radius: number = size / 2;

    // Define the number of points/segments for the polygon level
    const angleStep = Math.PI / 16; // Creates a 32-sided polygon

    // Generate points around the center
    for (let angle = 0; angle < Math.PI * 2; angle += angleStep) {
      // Generate pseudo-randomness based on angle and tree properties
      // This ensures the tree shape is consistent every time it's drawn
      const kindOfRandom = Math.cos(((angle + this.center.x) * size) % 17) ** 2;

      // Create a noisy radius using interpolation, making the shape irregular
      // The radius varies between 50% and 100% of the calculated radius
      const noisyRadius = radius * lerp(0.5, 1, kindOfRandom);

      // Calculate the position of the point using translate function
      points.push(translate(point, angle, noisyRadius));
    }
    // Create and return a Polygon from the generated points
    return new Polygon(points);
  }

  /**
   * Draws the tree onto the canvas context.
   * Renders multiple levels stacked vertically to create a 3D effect.
   * @param ctx The canvas rendering context.
   * @param viewPoint The point from which the scene is being viewed (for perspective).
   */
  draw(ctx: CanvasRenderingContext2D, options: TreeDrawOptions): void {
    const { viewPoint } = options;
    // Calculate the apparent top point of the tree based on perspective
    const top: Point = getFake3dPoint(this.center, viewPoint, this.height);

    const levelCount: number = 7; // Number of canopy levels to draw

    // Draw each level from bottom to top (or top to bottom, order matters for overlap)
    // Drawing from bottom (level=0) to top ensures higher levels overlap lower ones.
    for (let level = 0; level < levelCount; level++) {
      // Calculate the interpolation factor (0 = base, 1 = top)
      // Avoid division by zero if levelCount is 1
      const t = levelCount === 1 ? 1 : level / (levelCount - 1);

      // Interpolate the center point for the current level
      const currentLevelCenter: Point = lerp2D(this.center, top, t);

      // Interpolate the color - gets greener towards the top
      // Ensure RGB components are integers
      const greenComponent = Math.round(lerp(50, 200, t));
      const color = `rgb(30, ${greenComponent}, 70)`;

      // Interpolate the size - gets smaller towards the top
      // Define a minimum size for the top level (e.g., 40)
      const currentLevelSize = lerp(this.size, 40, t);

      // Generate the polygon shape for the current level
      const polygon = this.#generateLevel(currentLevelCenter, currentLevelSize);

      // Draw the polygon level with the calculated color and no visible stroke
      polygon.draw(ctx, { fill: color, stroke: 'rgba(0,0,0,0)' });
    }
  }
}
