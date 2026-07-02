class Building {
  readonly base: Polygon;
  readonly height: number;

  constructor(polygon: Polygon, height: number = 200) {
    this.base = polygon;
    this.height = height;
  }

  static load(info: Building): Building {
    const basePolygon = Polygon.load(info.base);
    return new Building(basePolygon, info.height);
  }

  /**
   * Rebuilds a Building from its compact footprint form `{ poly, h }` (footprint
   * points + height only — no redundant polygon `segments`).
   */
  static loadFootprint(info: BuildingFootprint): Building {
    const points = info.poly.map(([x, y]) => new Point(x, y));
    return new Building(new Polygon(points), info.h ?? 200);
  }

  /**
   * Serializes to the compact footprint form stored in world files: the base
   * polygon's points plus the height. Drops the redundant `segments` array that
   * a full `Polygon` serialization would include.
   */
  toFootprint(): BuildingFootprint {
    return {
      poly: this.base.points.map((p) => [
        Math.round(p.x * 10) / 10,
        Math.round(p.y * 10) / 10,
      ]),
      h: this.height,
    };
  }

  draw(ctx: CanvasRenderingContext2D, options: BuildingDrawOptions): void {
    const { viewPoint } = options;
    // Calculate the points for the top of the building (ceiling)
    const topPoints: Point[] = this.base.points.map((p) =>
      // Using 0.6 * height for the main walls/top points
      getFake3dPoint(p, viewPoint, this.height * 0.6),
    );
    const ceiling = new Polygon(topPoints);

    // Create polygons for the sides of the building
    const sides: Polygon[] = [];
    for (let i = 0; i < this.base.points.length; i++) {
      const nextI = (i + 1) % this.base.points.length;
      // Create a side polygon connecting base points to top points
      const sidePoly = new Polygon([
        this.base.points[i],
        this.base.points[nextI],
        topPoints[nextI], // Corresponding top point for nextI
        topPoints[i], // Corresponding top point for i
      ]);
      sides.push(sidePoly);
    }

    // Sort sides by distance to draw farther sides first (painter's algorithm)
    sides.sort(
      (a, b) => b.distanceToPoint(viewPoint) - a.distanceToPoint(viewPoint),
    );

    // --- Roof Generation (Assumes 4-point base for specific roof shape) ---
    let roofPolys: Polygon[] = [];
    // Check if the base has enough points for the assumed roof logic
    if (this.base.points.length >= 4 && ceiling.points.length >= 4) {
      // Calculate midpoints of specific base edges (assumes rectangular-like base)
      const baseMidpoints: Point[] = [
        average(this.base.points[0], this.base.points[1]),
        average(this.base.points[2], this.base.points[3]),
      ];

      // Calculate the peak points for the roof using the full height
      const topMidpoints: Point[] = baseMidpoints.map(
        (p) => getFake3dPoint(p, viewPoint, this.height), // Use full height for roof peak
      );

      // Create the two slanted roof polygons
      roofPolys = [
        new Polygon([
          ceiling.points[0], // Corner points of the ceiling
          ceiling.points[3],
          topMidpoints[1], // Peak points
          topMidpoints[0],
        ]),
        new Polygon([
          ceiling.points[2], // Corner points of the ceiling
          ceiling.points[1],
          topMidpoints[0], // Peak points
          topMidpoints[1],
        ]),
      ];

      // Sort roof polygons by distance as well
      roofPolys.sort(
        (a, b) => b.distanceToPoint(viewPoint) - a.distanceToPoint(viewPoint),
      );
    } else {
      console.warn(
        'Building base does not have >= 4 points; specific roof style skipped.',
      );
      // todo: Could potentially draw just the flat ceiling here if desired for other shapes
    }

    // --- Draw all parts ---

    // Draw base polygon (ground footprint)
    this.base.draw(ctx, {
      fill: 'white',
      stroke: 'rgba(0,0,0,0.2)', // Semi-transparent shadow/outline
      lineWidth: 20,
    });

    // Draw sorted sides
    for (const side of sides) {
      side.draw(ctx, { fill: 'white', stroke: '#AAA' });
    }

    // Draw ceiling polygon
    ceiling.draw(ctx, { fill: 'white', stroke: 'white', lineWidth: 6 });

    // Draw sorted roof polygons (if generated)
    for (const poly of roofPolys) {
      poly.draw(ctx, {
        fill: '#D44',
        stroke: '#C44',
        lineWidth: 8,
        join: 'round', // Use round line joins for roof edges
      });
    }
  }
}
