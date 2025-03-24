class Camera {
  constructor({ x, y, angle }, range = 1000, distanceBehind = 150) {
    this.range = range;
    this.distanceBehind = distanceBehind;
    this.simpleMove({ x, y, angle });
  }

  move({ x, y, angle }) {
    const t = 0.1;
    this.x = lerp(this.x, x + this.distanceBehind * Math.sin(angle), t);
    this.y = lerp(this.y, y + this.distanceBehind * Math.cos(angle), t);
    this.z = -40;
    this.angle = lerp(this.angle, angle, t);
    this.center = new Point(this.x, this.y);
    this.tip = new Point(this.x - this.range * Math.sin(this.angle), this.y - this.range * Math.cos(this.angle));
    this.left = new Point(
      this.x - this.range * Math.sin(this.angle - Math.PI / 4),
      this.y - this.range * Math.cos(this.angle - Math.PI / 4)
    );
    this.right = new Point(
      this.x - this.range * Math.sin(this.angle + Math.PI / 4),
      this.y - this.range * Math.cos(this.angle + Math.PI / 4)
    );
    this.polygon = new Polygon([this.center, this.left, this.right]);
  }

  simpleMove({ x, y, angle }) {
    this.x = x + this.distanceBehind * Math.sin(angle);
    this.y = y + this.distanceBehind * Math.cos(angle);
    this.z = -40;
    this.angle = angle;
    this.center = new Point(this.x, this.y);
    this.tip = new Point(this.x - this.range * Math.sin(this.angle), this.y - this.range * Math.cos(this.angle));
    this.left = new Point(
      this.x - this.range * Math.sin(this.angle - Math.PI / 4),
      this.y - this.range * Math.cos(this.angle - Math.PI / 4)
    );
    this.right = new Point(
      this.x - this.range * Math.sin(this.angle + Math.PI / 4),
      this.y - this.range * Math.cos(this.angle + Math.PI / 4)
    );
    this.polygon = new Polygon([this.center, this.left, this.right]);
  }

  #projectPoint(ctx, p) {
    const segment = new Segment(this.center, this.tip);
    const { point: p1 } = segment.projectPoint(p);
    const c = cross(subtract(p1, this), subtract(p, this));
    const x = (Math.sign(c) * distance(p, p1)) / distance(this, p1);
    const y = (p.z - this.z) / distance(this, p1);

    const cX = ctx.canvas.width / 2;
    const cY = ctx.canvas.height / 2;
    const scaler = Math.max(cX, cY);
    return new Point(cX + x * scaler, cY + y * scaler);
  }

  #filter(polygons) {
    const filteredPolygons = [];
    for (const polygon of polygons) {
      if (polygon.intersectsPolygon(this.polygon)) {
        const copy1 = new Polygon(polygon.points);
        const copy2 = new Polygon(this.polygon.points);
        Polygon.break(copy1, copy2, true);
        const points = copy1.segments.map((segment) => segment.p1);
        const filteredPoints = points.filter((point) => point.intersection || this.polygon.containsPoint(point));
        filteredPolygons.push(new Polygon(filteredPoints));
      } else if (this.polygon.containsPolygon(polygon)) {
        filteredPolygons.push(polygon);
      }
    }
    return filteredPolygons;
  }

  #extrude(polygons, height = 10) {
    const extrudedPolygons = [];
    for (const polygon of polygons) {
      const ceiling = new Polygon(polygon.points.map((point) => new Point(point.x, point.y, -height)));
      const sides = [];
      for (let i = 0; i < polygon.points.length; i++) {
        sides.push(
          new Polygon([
            polygon.points[i],
            polygon.points[(i + 1) % polygon.points.length],
            ceiling.points[(i + 1) % ceiling.points.length],
            ceiling.points[i],
          ])
        );
      }

      extrudedPolygons.push(...sides, ceiling);
    }
    return extrudedPolygons;
  }

  #getPolygons(world) {
    const buildingPolygons = this.#extrude(this.#filter(world.buildings.map((b) => b.base)), 200);
    // const treePolygons = this.#extrude(this.#filter(world.trees.map((b) => b.base)), 200);
    const roadPolygons = this.#extrude(this.#filter(world.corridor.borders.map((s) => new Polygon([s.p1, s.p2]))), 10);
    // const carPolygons = this.#extrude(
    //   this.#filter(
    //     world.cars.map((c) => new Polygon(c.polygon.map((point) => new Point(point.x, point.y))))
    //   ),
    //   10
    // );
    const carPolygons = this.#extrude(
      this.#filter([new Polygon(world.bestCar.polygon.map((point) => new Point(point.x, point.y)))]),
      10
    );

    const polygons = [...buildingPolygons, ...carPolygons, ...roadPolygons];
    return polygons;
  }

  render(ctx, world) {
    const polygons = this.#getPolygons(world);

    const projectedPolygons = polygons.map(
      (polygon) => new Polygon(polygon.points.map((point) => this.#projectPoint(ctx, point)))
    );

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    for (const polygon of projectedPolygons) {
      polygon.draw(ctx);
    }

    //to show the camera visible polygons on main ctx
    // for (const polygon of polygons) {
    //   polygon.draw(gameCtx);
    // }
  }

  draw(ctx) {
    this.polygon.draw(ctx);
  }
}
