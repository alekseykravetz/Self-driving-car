interface ICameraPoint {
  x: number;
  y: number;
  angle: number;
}

interface IColoredPolygon extends Polygon {
  fill: string;
  stroke: string;
}

/**
 * Represents a camera in a 2D/3D environment, handling projection and rendering.
 */
class Camera implements ICameraPoint {
  // Implement Point interface as Camera has x, y, z
  public x!: number;
  public y!: number;
  public z!: number;
  public angle!: number;
  public range: number;
  public distanceBehind: number;

  public center!: Point;
  public tip!: Point;
  public left!: Point;
  public right!: Point;
  public polygon!: Polygon; // View frustum polygon

  /**
   * Creates a Camera instance.
   * @param initialPosition - The initial {x, y, angle} the camera should follow.
   * @param range - The viewing distance range of the camera. Defaults to 1000.
   * @param distanceBehind - How far behind the target position the camera stays. Defaults to 100.
   */
  constructor(
    { x, y, angle }: ICameraPoint,
    range: number = 1000,
    distanceBehind: number = 100,
  ) {
    this.range = range;
    this.distanceBehind = distanceBehind;

    this.simpleMove({ x, y, angle });
  }

  /**
   * Moves the camera smoothly towards a target position and angle using interpolation.
   * @param targetPosition - The target {x, y, angle} to move towards.
   */
  move({ x, y, angle }: ICameraPoint): void {
    const t: number = 0.15; // Interpolation factor for smooth movement

    // Interpolate camera position towards a point behind the target
    this.x = lerp(this.x, x + this.distanceBehind * Math.sin(angle), t);
    this.y = lerp(this.y, y + this.distanceBehind * Math.cos(angle), t);
    this.z = -40; // Keep Z constant
    // Interpolate camera angle
    this.angle = lerp(this.angle, angle, t);

    // Update camera view frustum points based on new position/angle
    this.#updateFrustumPoints();
  }

  /**
   * Moves the camera instantly to a position and angle without interpolation.
   * @param targetPosition - The target {x, y, angle} to snap to.
   */
  simpleMove({ x, y, angle }: ICameraPoint): void {
    // Set camera position directly to a point behind the target
    this.x = x + this.distanceBehind * Math.sin(angle);
    this.y = y + this.distanceBehind * Math.cos(angle);
    this.z = -40; // Keep Z constant
    this.angle = angle;

    // Update camera view frustum points based on new position/angle
    this.#updateFrustumPoints();
  }

  /**
   * Updates the points defining the camera's view frustum (center, tip, left, right)
   * and the view polygon based on the current camera x, y, angle, and range.
   */
  #updateFrustumPoints(): void {
    this.center = new Point(this.x, this.y); // Camera's own position
    // Point directly in front of the camera at max range
    this.tip = new Point(
      this.x - this.range * Math.sin(this.angle),
      this.y - this.range * Math.cos(this.angle),
    );
    // Left corner of the view frustum
    this.left = new Point(
      this.x - this.range * Math.sin(this.angle - Math.PI / 4), // 45 degrees left
      this.y - this.range * Math.cos(this.angle - Math.PI / 4),
    );
    // Right corner of the view frustum
    this.right = new Point(
      this.x - this.range * Math.sin(this.angle + Math.PI / 4), // 45 degrees right
      this.y - this.range * Math.cos(this.angle + Math.PI / 4),
    );
    // Define the 2D view polygon (triangle)
    this.polygon = new Polygon([this.center, this.left, this.right]);
  }

  /**
   * Projects a 3D point onto the 2D canvas based on the camera's perspective.
   * @param ctx - The canvas rendering context (used for canvas dimensions).
   * @param p - The 3D Point to project.
   * @returns The projected 2D Point on the canvas.
   */
  #projectPoint(ctx: CanvasRenderingContext2D, p: Point): Point {
    // Project onto the camera's forward vector (center to tip)
    const segment: Segment = new Segment(this.center, this.tip);
    const { point: p1 }: { point: Point; offset: number } =
      segment.projectPoint(p); // p1 is projection of p onto camera axis

    // Calculate perpendicular distance (x-offset) using cross product
    const thisPoint = new Point(this.x, this.y); // 'this' refers to camera center (Point)
    const c: number = cross(subtract(p1, thisPoint), subtract(p, thisPoint));
    // Normalize x-offset by distance along the camera axis
    const x: number =
      (Math.sign(c) * distance(p, p1)) / distance(thisPoint, p1);

    // Calculate y-offset based on Z difference and distance along camera axis
    const y: number = (p.z - this.z) / distance(thisPoint, p1);

    // Scale projected coordinates to canvas coordinates
    const cX: number = ctx.canvas.width / 2;
    const cY: number = ctx.canvas.height / 2;
    const scaler: number = Math.max(cX, cY); // Scaling factor based on canvas size

    return new Point(cX + x * scaler, cY + y * scaler);
  }

  /**
   * Filters a list of polygons, keeping only those intersecting or contained within the camera's view frustum.
   * Breaks intersecting polygons at the intersection points.
   * @param polygons - An array of Polygons to filter.
   * @returns An array of filtered and potentially modified Polygons.
   */
  #filter(polygons: Polygon[]): Polygon[] {
    const filteredPolygons: Polygon[] = [];
    for (const polygon of polygons) {
      // Check for intersection with the camera's view polygon
      if (polygon.intersectsPolygon(this.polygon)) {
        const copy1: Polygon = new Polygon(polygon.points);
        const copy2: Polygon = new Polygon(this.polygon.points);

        // Break polygons at intersections (modifies copy1 and copy2)
        Polygon.break(copy1, copy2, true);

        // Get points from the modified polygon (copy1)
        const points: Point[] = copy1.segments.map(
          (segment: Segment) => segment.p1,
        );

        // Keep points that are intersection points OR are inside the camera view
        const filteredPoints: Point[] = points.filter(
          (point: Point) =>
            point.intersection || this.polygon.containsPoint(point),
        );

        // Create a new polygon from the filtered points if any exist
        if (filteredPoints.length > 0) {
          filteredPolygons.push(new Polygon(filteredPoints));
        }
      } else if (this.polygon.containsPolygon(polygon)) {
        // If the polygon is fully contained within the view, keep it as is
        filteredPolygons.push(polygon);
      }
    }
    return filteredPolygons;
  }

  /**
   * Extrudes 2D polygons vertically to create 3D shapes (like simple buildings).
   * @param polygons - An array of 2D Polygons (bases).
   * @param height - The extrusion height. Defaults to 10.
   * @returns An array of 3D Polygons representing the extruded shapes (sides + ceiling).
   */
  #extrude(polygons: Polygon[], height: number = 10): Polygon[] {
    const extrudedPolygons: Polygon[] = [];
    for (const polygon of polygons) {
      // Create the ceiling polygon by copying points and setting Z coordinate
      const ceiling: Polygon = new Polygon(
        polygon.points.map(
          (point: Point) => new Point(point.x, point.y, -height),
        ),
      );

      // Create side polygons connecting base points to ceiling points
      const sides: Polygon[] = [];
      for (let i: number = 0; i < polygon.points.length; i++) {
        sides.push(
          new Polygon([
            polygon.points[i], // Base point 1
            polygon.points[(i + 1) % polygon.points.length], // Base point 2
            ceiling.points[(i + 1) % ceiling.points.length], // Ceiling point 2
            ceiling.points[i], // Ceiling point 1
          ]),
        );
      }

      // Add sides and ceiling to the result list
      extrudedPolygons.push(...sides, ceiling);
    }
    return extrudedPolygons;
  }

  /**
   * Extrudes a car shape with more detail, including wheel wells and a sloped roof.
   * @param polygon - The base 2D Polygon of the car.
   * @param height - The main height of the car body. Defaults to 15.
   * @param wheelRadius - Used to offset the base height. Defaults to 5.
   * @returns An array of 3D Polygons representing the car model.
   */
  #extrudeCar(
    polygon: Polygon,
    height: number = 15,
    wheelRadius: number = 5,
  ): Polygon[] {
    if (polygon.points.length < 4) {
      console.warn('Cannot extrude car: Invalid base polygon provided.');
      return []; // Return empty if polygon is invalid/missing
    }

    // --- Define key points on the car base ---
    // Assuming polygon points are [frontRight, frontLeft, backLeft, backRight]
    const frontRight: Point = new Point(
      polygon.points[0].x,
      polygon.points[0].y,
    );
    const frontLeft: Point = new Point(
      polygon.points[1].x,
      polygon.points[1].y,
    );
    const backLeft: Point = new Point(polygon.points[2].x, polygon.points[2].y);
    const backRight: Point = new Point(
      polygon.points[3].x,
      polygon.points[3].y,
    );

    // Calculate intermediate points along the sides
    const middleLeft: Point = average(frontLeft, backLeft);
    const middleRight: Point = average(frontRight, backRight);
    const quarterFrontLeft: Point = average(frontLeft, middleLeft);
    const quarterBackLeft: Point = average(backLeft, middleLeft);
    const quarterFrontRight: Point = average(frontRight, middleRight);
    const quarterBackRight: Point = average(backRight, middleRight);

    // --- Modify base shape for detail (e.g., tapering) ---
    this.#moveInward(frontLeft, frontRight, 0.2); // Taper front
    this.#moveInward(backLeft, backRight, 0.1); // Taper back slightly

    // --- Create the detailed base polygon ---
    const base: Polygon = new Polygon([
      frontLeft,
      quarterFrontLeft,
      middleLeft,
      quarterBackLeft,
      backLeft,
      backRight,
      quarterBackRight,
      middleRight,
      quarterFrontRight,
      frontRight,
    ]);

    // Offset base points down by wheel radius
    for (const point of base.points) {
      point.z -= wheelRadius;
    }

    // --- Create ceiling and midline polygons ---
    const ceiling: Polygon = new Polygon(
      base.points.map((p: Point) => new Point(p.x, p.y, -height)),
    );
    const midLine: Polygon = new Polygon(
      base.points.map((p: Point) => new Point(p.x, p.y, -height / 2)),
    );

    // --- Modify ceiling shape for roofline ---
    // Get references to ceiling points for easier access
    const [
      c_frontLeft,
      c_quarterFrontLeft,
      c_middleLeft,
      c_quarterBackLeft,
      c_backLeft,
      c_backRight,
      c_quarterBackRight,
      c_middleRight,
      c_quarterFrontRight,
      c_frontRight,
    ] = ceiling.points;

    // Adjust Z coordinates for sloped roof
    c_frontLeft.z += 7;
    c_frontRight.z += 7;
    c_quarterFrontLeft.z += 6;
    c_quarterFrontRight.z += 6;
    c_backLeft.z += 4;
    c_backRight.z += 4;

    // Taper the ceiling inwards
    this.#moveInward(c_frontLeft, c_frontRight);
    this.#moveInward(c_quarterFrontLeft, c_quarterFrontRight);
    this.#moveInward(c_middleLeft, c_middleRight);
    this.#moveInward(c_quarterBackLeft, c_quarterBackRight);
    this.#moveInward(c_backLeft, c_backRight);
    this.#moveInward(c_frontLeft, c_backLeft, 0.1); // Taper sides slightly
    this.#moveInward(c_frontRight, c_backRight, 0.1);

    // --- Create side polygons (split at midline) ---
    const sides: Polygon[] = [];
    // Lower sides (base to midline)
    for (let i: number = 0; i < base.points.length; i++) {
      sides.push(
        new Polygon([
          base.points[i],
          base.points[(i + 1) % base.points.length],
          midLine.points[(i + 1) % midLine.points.length],
          midLine.points[i],
        ]),
      );
    }
    // Upper sides (midline to ceiling)
    for (let i: number = 0; i < base.points.length; i++) {
      sides.push(
        new Polygon([
          midLine.points[i],
          midLine.points[(i + 1) % midLine.points.length],
          ceiling.points[(i + 1) % ceiling.points.length],
          ceiling.points[i],
        ]),
      );
    }

    // --- Create ceiling part polygons ---
    const ceilingParts: Polygon[] = [];
    // Hood area
    ceilingParts.push(
      new Polygon([
        c_frontLeft,
        c_quarterFrontLeft,
        c_quarterFrontRight,
        c_frontRight,
      ]),
    );
    // Front roof
    ceilingParts.push(
      new Polygon([
        c_quarterFrontLeft,
        c_middleLeft,
        c_middleRight,
        c_quarterFrontRight,
      ]),
    );
    // Rear roof
    ceilingParts.push(
      new Polygon([
        c_middleLeft,
        c_quarterBackLeft,
        c_quarterBackRight,
        c_middleRight,
      ]),
    );
    // Trunk area
    ceilingParts.push(
      new Polygon([
        c_quarterBackLeft,
        c_backLeft,
        c_backRight,
        c_quarterBackRight,
      ]),
    );

    // Return all generated polygons
    return [...sides, ...ceilingParts];
  }

  /**
   * Moves two points towards each other by a certain percentage of the distance between them.
   * Modifies the points in place.
   * @param p1 - The first Point.
   * @param p2 - The second Point.
   * @param percent - The percentage to move inward (0 to 1). Defaults to 0.3.
   */
  #moveInward(p1: Point, p2: Point, percent: number = 0.3): void {
    // Calculate new positions using 2D linear interpolation
    const new_p1: Point = lerp2D(p1, p2, percent);
    const new_p2: Point = lerp2D(p2, p1, percent);
    // Update original points
    p1.x = new_p1.x;
    p1.y = new_p1.y;
    p2.x = new_p2.x;
    p2.y = new_p2.y;
  }

  /**
   * Calculates the centroid (average position) of a set of points.
   * @param points - An array of Points.
   * @returns A new Point representing the centroid.
   */
  #getCentroid(points: Point[]): Point {
    let xSum: number = 0;
    let ySum: number = 0;
    const n: number = points.length;

    points.forEach((p: Point) => {
      xSum += p.x;
      ySum += p.y;
    });
    const x: number = xSum / n;
    const y: number = ySum / n;
    return new Point(x, y);
  }

  /**
   * Extrudes tree base polygons into trunk and canopy shapes.
   * @param polygons - An array of 2D Polygons representing tree bases.
   * @param height - The height of the tree canopy peak. Defaults to 200.
   * @returns An array of 3D Polygons representing the tree models.
   */
  #extrudeTrees(polygons: Polygon[], height: number = 200): Polygon[] {
    const extrudedPolygons: Polygon[] = [];
    const trunkHeight: number = 40; // Separate height for the trunk

    for (const polygon of polygons) {
      // --- Create Trunk ---
      // Create a copy for the trunk base, slightly moved inward
      const sPolygon: Polygon = new Polygon(
        polygon.points.map((point: Point) => new Point(point.x, point.y)), // Create 2D copy
      );
      const half: number = Math.floor(sPolygon.points.length / 2);
      // Move opposite points inward to form a narrower trunk base
      for (let i: number = 0; i < half; i++) {
        // Ensure points exist before moving inward
        if (sPolygon.points[i] && sPolygon.points[half + i]) {
          this.#moveInward(sPolygon.points[i], sPolygon.points[half + i], 0.4);
        } else {
          console.warn(
            'Skipping moveInward due to missing points in tree trunk polygon.',
          );
        }
      }

      // Define the ceiling of the trunk
      const sLegCeiling: Polygon = new Polygon(
        sPolygon.points.map(
          (point: Point) => new Point(point.x, point.y, -trunkHeight),
        ),
      );
      // Create the sides of the trunk
      const sLegSides: Polygon[] = [];
      for (let i: number = 0; i < sPolygon.points.length; i++) {
        sLegSides.push(
          new Polygon([
            sPolygon.points[i], // Trunk base point 1
            sPolygon.points[(i + 1) % sPolygon.points.length], // Trunk base point 2
            sLegCeiling.points[(i + 1) % sLegCeiling.points.length], // Trunk ceiling point 2
            sLegCeiling.points[i], // Trunk ceiling point 1
          ]),
        );
      }

      sLegSides.forEach((poly: Polygon) => {
        const cPoly = poly as IColoredPolygon;
        cPoly.fill = 'rgba(150, 150, 150, 0.2)';
        cPoly.stroke = 'rgba(150, 150, 150, 0.2)';
      });

      // --- Create Canopy ---
      // The base of the canopy is the ceiling of the trunk
      const hBase: Polygon = new Polygon(
        polygon.points.map(
          (point) => new Point(point.x, point.y, -trunkHeight),
        ),
      );

      // Define the peak of the canopy (centroid of the original base polygon)
      const centroid = this.#getCentroid(polygon.points);
      centroid.z = -height; // Canopy peak

      // Create the sides of the canopy (triangles from canopy base to peak)
      const sSides: Polygon[] = [];
      for (let i: number = 0; i < hBase.points.length; i++) {
        sSides.push(
          new Polygon([
            hBase.points[i], // Canopy base point 1
            hBase.points[(i + 1) % hBase.points.length], // Canopy base point 2
            centroid, // Canopy peak
          ]),
        );
      }

      sSides.forEach((poly) => {
        const cPoly = poly as IColoredPolygon;
        cPoly.fill = 'rgba(34, 196, 74, 0.2)';
        cPoly.stroke = 'rgba(34, 196, 74, 0.2)';
      });
      const cPoly = hBase as IColoredPolygon;
      cPoly.fill = 'rgba(34, 196, 74, 0.2)';
      cPoly.stroke = 'rgba(34, 196, 74, 0.2)';

      // Add trunk sides, canopy sides, and canopy base (trunk ceiling) to results
      // Note: hBase is the trunk ceiling, which also acts as the canopy floor visually
      extrudedPolygons.push(...sLegSides, ...sSides, hBase);
    }
    return extrudedPolygons;
  }

  /**
   * Gathers, filters, and extrudes all relevant polygons from the world for rendering.
   * @param world - The World object containing scene elements.
   * @returns An array of 3D Polygons ready for projection and rendering.
   */
  #getPolygons(world: World): Polygon[] {
    // Filter and extrude buildings
    const buildingPolygons: Polygon[] = this.#extrude(
      this.#filter(world.buildings.map((b) => b.base)),
      200, // Building height
    );

    // Filter and extrude trees
    const treePolygons: Polygon[] = this.#extrudeTrees(
      this.#filter(world.trees.map((t) => t.base)),
      200,
    );

    // Filter and extrude road borders (simplified roads)
    // Determine which road source to use (corridor or roadBorders)
    const roadSegments: Segment[] = world.corridor
      ? world.corridor.borders
      : world.roadBorders || [];
    const roadPolygons: Polygon[] = this.#extrude(
      this.#filter(
        roadSegments.map((s: Segment) => new Polygon([s.p1, s.p2])), // Convert segments to thin polygons
      ),
      10,
    );

    // Filter and extrude the best car
    const filteredCarBase: Polygon[] = this.#filter([
      new Polygon(
        world.bestCar
          ? world.bestCar.polygon.map(
              (point: Point) => new Point(point.x, point.y),
            )
          : [],
      ),
    ]);
    const carPolygons: Polygon[] = this.#extrudeCar(filteredCarBase?.[0] || []);

    // Filter car shadows (don't extrude)
    const carShadowBases: Polygon[] = this.#filter(
      world.cars.map(
        (c) =>
          new Polygon(
            c.polygon.map((point: Point) => new Point(point.x, point.y)),
          ),
      ),
    );

    // Style the polygons
    carShadowBases.forEach((poly) => {
      const cPoly = poly as IColoredPolygon;
      cPoly.fill = 'rgba(220, 220, 220, 1)';
      cPoly.stroke = 'rgba(0, 0, 0, 0)';
    });

    buildingPolygons.forEach((poly) => {
      const cPoly = poly as IColoredPolygon;
      cPoly.fill = 'rgba(150, 150, 150, 0.2)';
      cPoly.stroke = 'rgba(150, 150, 150, 0.2)';
    });

    // treePolygons.forEach((poly) => {
    //   // Simple styling, could be improved (e.g., different colors for trunk/canopy)
    //   const cPoly = poly as IColoredPolygon;
    //   cPoly.fill = 'rgba(34, 196, 74, 0.2)';
    //   cPoly.stroke = 'rgba(34, 196, 74, 0.2)';
    // });

    // Combine all polygons in rendering order (shadows first, then roads, buildings, trees, car)
    const polygons: Polygon[] = [
      ...carShadowBases,
      ...roadPolygons,
      ...buildingPolygons,
      ...treePolygons,
      ...carPolygons,
    ];
    return polygons;
  }

  /**
   * Renders the world from the camera's perspective onto the main canvas.
   * Optionally draws the raw 3D polygons onto a secondary context for debugging.
   * @param ctx - The main 2D rendering context for the perspective view.
   * @param world - The World object to render.
   * @param gameCtx - An optional secondary 2D context for drawing the raw 3D polygons.
   */
  public render(
    ctx: CanvasRenderingContext2D,
    world: World,
    gameCtx?: CanvasRenderingContext2D,
  ): void {
    // Get all filtered and extruded polygons from the world
    const polygons: Polygon[] = this.#getPolygons(world);

    // Project each 3D polygon's points onto the 2D canvas
    const projectedPolygons: Polygon[] = polygons.map(
      (polygon: Polygon) =>
        new Polygon(
          polygon.points.map((point: Point) => this.#projectPoint(ctx, point)),
        ),
    );

    // Clear the main canvas
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const thisPoint = new Point(this.x, this.y); // 'this' refers to camera center (Point)
    // --- Render projected polygons with fog effect ---
    for (let i = 0; i < projectedPolygons.length; i++) {
      // Calculate distance to the original 3D polygon for fog effect
      const distance: number = polygons[i].distanceToPoint(thisPoint); // 'this' is camera center
      // Apply fog: reduce opacity based on distance (closer to 1 for near, closer to 0 for far)
      ctx.globalAlpha = Math.max(0, (1 - distance / this.range) ** 2); // Adjusted exponent for faster falloff

      // Get fill/stroke style from the original 3D polygon
      const { fill, stroke } = polygons[i] as IColoredPolygon;
      // Draw the projected 2D polygon with the calculated alpha and original styles
      projectedPolygons[i].draw(ctx, { fill, stroke, join: 'round' });
    }
    ctx.globalAlpha = 1; // Reset global alpha

    // --- Optional: Draw raw 3D polygons on secondary context ---
    if (gameCtx) {
      for (const polygon of polygons) {
        // Draw the original 3D polygons (using their 2D points) onto the game context
        polygon.draw(gameCtx);
      }
      // // Also draw the camera's view frustum on the debug context
      // this.draw(gameCtx); // Draw camera frustum
    }
  }

  /**
   * Draws the camera's view frustum polygon (and optional centroid) onto a canvas context.
   * Useful for debugging in a top-down view.
   * @param ctx - The 2D rendering context to draw on.
   */
  public draw(ctx: CanvasRenderingContext2D): void {
    // Draw the camera's view polygon (the triangle representing the frustum)
    this.polygon.draw(ctx);
  }
}
