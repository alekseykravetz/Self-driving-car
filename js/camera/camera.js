'use strict';
/**
 * Represents a camera in a 2D/3D environment, handling projection and rendering.
 */
class Camera {
  x;
  y;
  z;
  angle;
  range;
  distanceBehind;
  center;
  tip;
  left;
  right;
  polygon;
  constructor({ x, y, angle }, range = 1000, distanceBehind = 100) {
    this.range = range;
    this.distanceBehind = distanceBehind;
    this.simpleMove({ x, y, angle });
  }

  /**
   * Moves the camera smoothly towards a target position using interpolation.
   */
  move({ x, y, angle }) {
    const t = 0.15;
    this.x = lerp(this.x, x + this.distanceBehind * Math.sin(angle), t);
    this.y = lerp(this.y, y + this.distanceBehind * Math.cos(angle), t);
    this.z = -40;
    this.angle = lerp(this.angle, angle, t);
    this.#updateFrustumPoints();
  }

  /**
   * Moves the camera instantly to a position without interpolation.
   */
  simpleMove({ x, y, angle }) {
    this.x = x + this.distanceBehind * Math.sin(angle);
    this.y = y + this.distanceBehind * Math.cos(angle);
    this.z = -40;
    this.angle = angle;
    this.#updateFrustumPoints();
  }

  /**
   * Updates the camera's view frustum points based on current position/angle.
   */
  #updateFrustumPoints() {
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
  #projectPoint(ctx, p) {
    const segment = new Segment(this.center, this.tip);
    const { point: p1 } = segment.projectPoint(p);
    const thisPoint = new Point(this.x, this.y);
    const c = cross(subtract(p1, thisPoint), subtract(p, thisPoint));
    const x = (Math.sign(c) * distance(p, p1)) / distance(thisPoint, p1);
    const y = (p.z - this.z) / distance(thisPoint, p1);
    const cX = ctx.canvas.width / 2;
    const cY = ctx.canvas.height / 2;
    const scaler = Math.max(cX, cY);
    return new Point(cX + x * scaler, cY + y * scaler);
  }

  /**
   * Filters polygons to only those visible within the camera's view frustum.
   */
  #filter(polygons) {
    const filteredPolygons = [];
    for (const polygon of polygons) {
      if (polygon.intersectsPolygon(this.polygon)) {
        const copy1 = new Polygon(polygon.points);
        const copy2 = new Polygon(this.polygon.points);
        Polygon.break(copy1, copy2, true);
        const points = copy1.segments.map((segment) => segment.p1);
        const filteredPoints = points.filter(
          (point) => point.intersection || this.polygon.containsPoint(point),
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
  #getPolygons(world, options = {}) {
    const { keyCar, bestCar, traffic } = options;
    // Buildings
    const buildingPolygons = extrudePolygons(
      this.#filter(world.buildings.map((b) => b.base)),
      200,
    );
    // Trees
    const treePolygons = extrudeTreeShapes(
      this.#filter(world.trees.map((t) => t.base)),
      200,
    );
    // Road borders
    const roadSegments = world.corridor
      ? world.corridor.borders
      : world.roadBorders || [];
    const roadPolygons = extrudePolygons(
      this.#filter(roadSegments.map((s) => new Polygon([s.p1, s.p2]))),
      10,
    );
    // Key car (always extruded as detailed 3D car)
    let keyCarPolygons = [];
    if (keyCar && keyCar.polygon.length >= 4) {
      const filteredKeyCar = this.#filter([
        new Polygon(keyCar.polygon.map((point) => new Point(point.x, point.y))),
      ]);
      if (filteredKeyCar.length) {
        keyCarPolygons = extrudeCarShape(filteredKeyCar[0]);
        keyCarPolygons.forEach((poly) => {
          const cPoly = poly;
          cPoly.fill = keyCar.color || 'rgba(0, 100, 255, 0.6)';
          cPoly.stroke = 'rgba(0, 0, 0, 0.4)';
        });
      }
    }
    // Traffic cars
    let trafficPolygons = [];
    if (traffic && traffic.length > 0) {
      for (const car of traffic) {
        if (!car.polygon || car.polygon.length < 4) continue;
        const filteredBase = this.#filter([
          new Polygon(car.polygon.map((point) => new Point(point.x, point.y))),
        ]);
        if (filteredBase.length) {
          const carPolys = extrudeCarShape(filteredBase[0], 12, 4);
          carPolys.forEach((poly) => {
            const cPoly = poly;
            cPoly.fill = car.color || 'rgba(200, 50, 50, 0.5)';
            cPoly.stroke = 'rgba(0, 0, 0, 0.3)';
          });
          trafficPolygons.push(...carPolys);
        }
      }
    }
    // Best car (highlighted, separate from keyCar)
    let bestCarPolygons = [];
    const bestCarSource = bestCar || (!keyCar ? world.bestCar : null);
    if (
      bestCarSource &&
      bestCarSource !== keyCar &&
      bestCarSource.polygon.length >= 4
    ) {
      const filteredCarBase = this.#filter([
        new Polygon(
          bestCarSource.polygon.map((point) => new Point(point.x, point.y)),
        ),
      ]);
      if (filteredCarBase.length) {
        bestCarPolygons = extrudeCarShape(filteredCarBase[0]);
        bestCarPolygons.forEach((poly) => {
          const cPoly = poly;
          cPoly.fill = 'rgba(255, 200, 0, 0.6)';
          cPoly.stroke = 'rgba(0, 0, 0, 0.4)';
        });
      }
    }
    // Car shadows (flat projections)
    const carShadowBases = this.#filter(
      world.cars
        .filter((c) => c !== keyCar && c !== bestCarSource)
        .map(
          (c) =>
            new Polygon(c.polygon.map((point) => new Point(point.x, point.y))),
        ),
    );
    carShadowBases.forEach((poly) => {
      const cPoly = poly;
      cPoly.fill = 'rgba(220, 220, 220, 1)';
      cPoly.stroke = 'rgba(0, 0, 0, 0)';
    });
    // Style buildings
    buildingPolygons.forEach((poly) => {
      const cPoly = poly;
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
  render(ctx, world, options = {}) {
    const polygons = this.#getPolygons(world, options);
    const projectedPolygons = polygons.map(
      (polygon) =>
        new Polygon(
          polygon.points.map((point) => this.#projectPoint(ctx, point)),
        ),
    );
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const thisPoint = new Point(this.x, this.y);
    for (let i = 0; i < projectedPolygons.length; i++) {
      const dist = polygons[i].distanceToPoint(thisPoint);
      ctx.globalAlpha = Math.max(0, (1 - dist / this.range) ** 2);
      const { fill, stroke } = polygons[i];
      projectedPolygons[i].draw(ctx, { fill, stroke, join: 'round' });
    }
    ctx.globalAlpha = 1;
    if (options.debugCtx) {
      for (const polygon of polygons) {
        polygon.draw(options.debugCtx);
      }
    }
  }

  /**
   * Draws the camera's view frustum polygon onto a context (for debugging).
   */
  draw(ctx) {
    this.polygon.draw(ctx);
  }
}
