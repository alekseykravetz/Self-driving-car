/**
 * Represents a camera in a 2D/3D environment, handling projection and rendering.
 */
class Camera implements ICameraPoint {
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
  public polygon!: Polygon;

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
   * Moves the camera smoothly towards a target position using interpolation.
   */
  move({ x, y, angle }: ICameraPoint): void {
    const t: number = 0.15;

    this.x = lerp(this.x, x + this.distanceBehind * Math.sin(angle), t);
    this.y = lerp(this.y, y + this.distanceBehind * Math.cos(angle), t);
    this.z = -40;
    this.angle = lerp(this.angle, angle, t);

    this.#updateFrustumPoints();
  }

  /**
   * Moves the camera instantly to a position without interpolation.
   */
  simpleMove({ x, y, angle }: ICameraPoint): void {
    this.x = x + this.distanceBehind * Math.sin(angle);
    this.y = y + this.distanceBehind * Math.cos(angle);
    this.z = -40;
    this.angle = angle;

    this.#updateFrustumPoints();
  }

  /**
   * Updates the camera's view frustum points based on current position/angle.
   */
  #updateFrustumPoints(): void {
    this.center = new Point(this.x, this.y);
    this.tip = new Point(
      this.x - this.range * Math.sin(this.angle),
      this.y - this.range * Math.cos(this.angle),
    );
    this.left = new Point(
      this.x - this.range * Math.sin(this.angle - Math.PI / 4),
      this.y - this.range * Math.cos(this.angle - Math.PI / 4),
    );
    this.right = new Point(
      this.x - this.range * Math.sin(this.angle + Math.PI / 4),
      this.y - this.range * Math.cos(this.angle + Math.PI / 4),
    );
    this.polygon = new Polygon([this.center, this.left, this.right]);
  }

  /**
   * Projects a 3D point onto the 2D canvas based on the camera's perspective.
   */
  #projectPoint(ctx: CanvasRenderingContext2D, p: Point): Point {
    const segment: Segment = new Segment(this.center, this.tip);
    const { point: p1 }: { point: Point; offset: number } =
      segment.projectPoint(p);

    const thisPoint = new Point(this.x, this.y);
    const c: number = cross(subtract(p1, thisPoint), subtract(p, thisPoint));
    const x: number =
      (Math.sign(c) * distance(p, p1)) / distance(thisPoint, p1);
    const y: number = (p.z - this.z) / distance(thisPoint, p1);

    const cX: number = ctx.canvas.width / 2;
    const cY: number = ctx.canvas.height / 2;
    const scaler: number = Math.max(cX, cY);

    return new Point(cX + x * scaler, cY + y * scaler);
  }

  /**
   * Filters polygons to only those visible within the camera's view frustum.
   */
  #filter(polygons: Polygon[]): Polygon[] {
    const filteredPolygons: Polygon[] = [];
    for (const polygon of polygons) {
      if (polygon.intersectsPolygon(this.polygon)) {
        const copy1: Polygon = new Polygon(polygon.points);
        const copy2: Polygon = new Polygon(this.polygon.points);

        Polygon.break(copy1, copy2, true);

        const points: Point[] = copy1.segments.map(
          (segment: Segment) => segment.p1,
        );
        const filteredPoints: Point[] = points.filter(
          (point: Point) =>
            point.intersection || this.polygon.containsPoint(point),
        );

        if (filteredPoints.length > 0) {
          filteredPolygons.push(new Polygon(filteredPoints));
        }
      } else if (this.polygon.containsPolygon(polygon)) {
        filteredPolygons.push(polygon);
      }
    }
    return filteredPolygons;
  }

  /**
   * Gathers, filters, and extrudes all relevant polygons from the world for rendering.
   */
  #getPolygons(world: IWorld, options: ICameraRenderOptions = {}): Polygon[] {
    const {
      keyCar,
      bestCar,
      cars = [],
      traffic,
      showTrees = true,
      showBuildings = true,
    } = options;

    // Buildings
    const buildingPolygons: Polygon[] = showBuildings
      ? extrudePolygons(this.#filter(world.buildings.map((b) => b.base)), 200)
      : [];

    // Trees
    const treePolygons: Polygon[] = showTrees
      ? extrudeTreeShapes(this.#filter(world.trees.map((t) => t.base)), 200)
      : [];

    // Road borders
    const roadSegments: Segment[] = world.corridors.length
      ? world.corridors.flatMap((c: Corridor) => c.borders)
      : world.roadBorders || [];
    const roadPolygons: Polygon[] = extrudePolygons(
      this.#filter(roadSegments.map((s: Segment) => new Polygon([s.p1, s.p2]))),
      10,
    );

    // Key car (always extruded as detailed 3D car)
    let keyCarPolygons: Polygon[] = [];
    if (keyCar && keyCar.polygon.length >= 4) {
      const filteredKeyCar: Polygon[] = this.#filter([
        new Polygon(
          keyCar.polygon.map((point: Point) => new Point(point.x, point.y)),
        ),
      ]);
      if (filteredKeyCar.length) {
        keyCarPolygons = extrudeCarShape(filteredKeyCar[0]);
        keyCarPolygons.forEach((poly) => {
          const cPoly = poly as IColoredPolygon;
          cPoly.fill = keyCar.color || 'rgba(0, 100, 255, 0.6)';
          cPoly.stroke = 'rgba(0, 0, 0, 0.4)';
        });
      }
    }

    // Traffic cars
    let trafficPolygons: Polygon[] = [];
    if (traffic && traffic.length > 0) {
      for (const car of traffic) {
        if (!car.polygon || car.polygon.length < 4) continue;
        const filteredBase: Polygon[] = this.#filter([
          new Polygon(
            car.polygon.map((point: Point) => new Point(point.x, point.y)),
          ),
        ]);
        if (filteredBase.length) {
          const carPolys = extrudeCarShape(filteredBase[0], 12, 4);
          carPolys.forEach((poly) => {
            const cPoly = poly as IColoredPolygon;
            cPoly.fill = car.color || 'rgba(200, 50, 50, 0.5)';
            cPoly.stroke = 'rgba(0, 0, 0, 0.3)';
          });
          trafficPolygons.push(...carPolys);
        }
      }
    }

    // Best car (highlighted, separate from keyCar)
    let bestCarPolygons: Polygon[] = [];
    const bestCarSource = bestCar ?? null;
    if (
      bestCarSource &&
      bestCarSource !== keyCar &&
      bestCarSource.polygon.length >= 4
    ) {
      const filteredCarBase: Polygon[] = this.#filter([
        new Polygon(
          bestCarSource.polygon.map(
            (point: Point) => new Point(point.x, point.y),
          ),
        ),
      ]);
      if (filteredCarBase.length) {
        bestCarPolygons = extrudeCarShape(filteredCarBase[0]);
        bestCarPolygons.forEach((poly) => {
          const cPoly = poly as IColoredPolygon;
          cPoly.fill = 'rgba(255, 200, 0, 0.6)';
          cPoly.stroke = 'rgba(0, 0, 0, 0.4)';
        });
      }
    }

    // Car shadows (flat projections)
    const carShadowBases: Polygon[] = this.#filter(
      cars
        .filter((c) => c !== keyCar && c !== bestCarSource)
        .map(
          (c) =>
            new Polygon(
              c.polygon.map((point: Point) => new Point(point.x, point.y)),
            ),
        ),
    );
    carShadowBases.forEach((poly) => {
      const cPoly = poly as IColoredPolygon;
      cPoly.fill = 'rgba(220, 220, 220, 1)';
      cPoly.stroke = 'rgba(0, 0, 0, 0)';
    });

    // Style buildings
    buildingPolygons.forEach((poly) => {
      const cPoly = poly as IColoredPolygon;
      cPoly.fill = 'rgba(150, 150, 150, 0.2)';
      cPoly.stroke = 'rgba(150, 150, 150, 0.2)';
    });

    return [
      ...carShadowBases,
      ...roadPolygons,
      ...buildingPolygons,
      ...treePolygons,
      ...trafficPolygons,
      ...bestCarPolygons,
      ...keyCarPolygons,
    ];
  }

  /**
   * Renders the world from the camera's perspective onto the canvas.
   */
  public render(
    ctx: CanvasRenderingContext2D,
    world: IWorld,
    options: ICameraRenderOptions = {},
  ): void {
    const polygons: Polygon[] = this.#getPolygons(world, options);

    const projectedPolygons: Polygon[] = polygons.map(
      (polygon: Polygon) =>
        new Polygon(
          polygon.points.map((point: Point) => this.#projectPoint(ctx, point)),
        ),
    );

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const thisPoint = new Point(this.x, this.y);
    for (let i = 0; i < projectedPolygons.length; i++) {
      const dist: number = polygons[i].distanceToPoint(thisPoint);
      ctx.globalAlpha = Math.max(0, (1 - dist / this.range) ** 2);

      const { fill, stroke } = polygons[i] as IColoredPolygon;
      drawPolygon(ctx, projectedPolygons[i], { fill, stroke, join: 'round' });
    }
    ctx.globalAlpha = 1;

    if (options.debugCtx) {
      for (const polygon of polygons) {
        drawPolygon(options.debugCtx, polygon);
      }
    }
  }

  /**
   * Draws the camera's view frustum polygon onto a context (for debugging).
   */
  public draw(ctx: CanvasRenderingContext2D): void {
    drawPolygon(ctx, this.polygon);
  }
}
