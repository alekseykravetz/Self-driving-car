class Camera {
  constructor({ x, y, angle }, range = 1000, distanceBehind = 100) {
    this.range = range;
    this.distanceBehind = distanceBehind;
    this.simpleMove({ x, y, angle });
  }

  move({ x, y, angle }) {
    const t = 0.15;
    this.x = lerp(this.x, x + this.distanceBehind * Math.sin(angle), t);
    this.y = lerp(this.y, y + this.distanceBehind * Math.cos(angle), t);
    this.z = -40;
    this.angle = lerp(this.angle, angle, t);
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

  simpleMove({ x, y, angle }) {
    this.x = x + this.distanceBehind * Math.sin(angle);
    this.y = y + this.distanceBehind * Math.cos(angle);
    this.z = -40;
    this.angle = angle;
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
        const filteredPoints = points.filter(
          (point) => point.intersection || this.polygon.containsPoint(point),
        );
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
      const ceiling = new Polygon(
        polygon.points.map((point) => new Point(point.x, point.y, -height)),
      );
      const sides = [];
      for (let i = 0; i < polygon.points.length; i++) {
        sides.push(
          new Polygon([
            polygon.points[i],
            polygon.points[(i + 1) % polygon.points.length],
            ceiling.points[(i + 1) % ceiling.points.length],
            ceiling.points[i],
          ]),
        );
      }

      extrudedPolygons.push(...sides, ceiling);
    }
    return extrudedPolygons;
  }

  #extrudeCar(polygon, height = 15, wheelRadius = 5) {
    const frontRight = new Point(polygon.points[0].x, polygon.points[0].y);
    const frontLeft = new Point(polygon.points[1].x, polygon.points[1].y);
    const backLeft = new Point(polygon.points[2].x, polygon.points[2].y);
    const backRight = new Point(polygon.points[3].x, polygon.points[3].y);
    const middleLeft = average(frontLeft, backLeft);
    const middleRight = average(frontRight, backRight);
    const quarterFrontLeft = average(frontLeft, middleLeft);
    const quarterBackLeft = average(backLeft, middleLeft);
    const quarterFrontRight = average(frontRight, middleRight);
    const quarterBackRight = average(backRight, middleRight);

    this.#moveInward(frontLeft, frontRight, 0.2);
    this.#moveInward(backLeft, backRight, 0.1);

    const base = new Polygon([
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

    for (const point of base.points) {
      point.z -= wheelRadius;
    }

    const ceiling = new Polygon(
      base.points.map((p) => new Point(p.x, p.y, -height)),
    );
    const midLine = new Polygon(
      base.points.map((p) => new Point(p.x, p.y, -height / 2)),
    );

    const c_frontLeft = ceiling.points[0];
    const c_quarterFrontLeft = ceiling.points[1];
    const c_middleLeft = ceiling.points[2];
    const c_quarterBackLeft = ceiling.points[3];
    const c_backLeft = ceiling.points[4];
    const c_backRight = ceiling.points[5];
    const c_quarterBackRight = ceiling.points[6];
    const c_middleRight = ceiling.points[7];
    const c_quarterFrontRight = ceiling.points[8];
    const c_frontRight = ceiling.points[9];

    c_frontLeft.z += 7;
    c_frontRight.z += 7;
    c_quarterFrontLeft.z += 6;
    c_quarterFrontRight.z += 6;
    c_backLeft.z += 4;
    c_backRight.z += 4;

    this.#moveInward(c_frontLeft, c_frontRight);
    this.#moveInward(c_quarterFrontLeft, c_quarterFrontRight);
    this.#moveInward(c_middleLeft, c_middleRight);
    this.#moveInward(c_quarterBackLeft, c_quarterBackRight);
    this.#moveInward(c_backLeft, c_backRight);
    this.#moveInward(c_frontLeft, c_backLeft, 0.1);
    this.#moveInward(c_frontRight, c_backRight, 0.1);

    const sides = [];
    for (let i = 0; i < base.points.length; i++) {
      sides.push(
        new Polygon([
          base.points[i],
          base.points[(i + 1) % base.points.length],
          midLine.points[(i + 1) % midLine.points.length],
          midLine.points[i],
        ]),
      );
    }
    for (let i = 0; i < base.points.length; i++) {
      sides.push(
        new Polygon([
          midLine.points[i],
          midLine.points[(i + 1) % midLine.points.length],
          ceiling.points[(i + 1) % ceiling.points.length],
          ceiling.points[i],
        ]),
      );
    }

    const ceilingParts = [];

    ceilingParts.push(
      new Polygon([
        c_frontLeft,
        c_quarterFrontLeft,
        c_quarterFrontRight,
        c_frontRight,
      ]),
    );
    ceilingParts.push(
      new Polygon([
        c_quarterFrontLeft,
        c_middleLeft,
        c_middleRight,
        c_quarterFrontRight,
      ]),
    );
    ceilingParts.push(
      new Polygon([
        c_middleLeft,
        c_quarterBackLeft,
        c_quarterBackRight,
        c_middleRight,
      ]),
    );
    ceilingParts.push(
      new Polygon([
        c_quarterBackLeft,
        c_backLeft,
        c_backRight,
        c_quarterBackRight,
      ]),
    );

    return [...sides, ...ceilingParts];
  }

  #moveInward(p1, p2, percent = 0.3) {
    const new_p1 = lerp2D(p1, p2, percent);
    const new_p2 = lerp2D(p2, p1, percent);
    p1.x = new_p1.x;
    p1.y = new_p1.y;
    p2.x = new_p2.x;
    p2.y = new_p2.y;
  }

  #getCentroid(points) {
    let xSum = 0,
      ySum = 0,
      n = points.length;
    points.forEach((p) => {
      xSum += p.x;
      ySum += p.y;
    });
    const x = xSum / n;
    const y = ySum / n;
    return new Point(x, y);
  }

  #extrudeTrees(polygons, height = 10) {
    const extrudedPolygons = [];

    for (const polygon of polygons) {
      const sPolygon = new Polygon(
        polygon.points.map((point) => new Point(point.x, point.y)),
      );
      const half = Math.floor(sPolygon.points.length / 2);
      for (let i = 0; i < half; i++) {
        this.#moveInward(sPolygon.points[i], sPolygon.points[half + i], 0.4);
      }
      const sLegCeiling = new Polygon(
        sPolygon.points.map((point) => new Point(point.x, point.y, -40)),
      );
      const sLegSides = [];
      for (let i = 0; i < sPolygon.points.length; i++) {
        sLegSides.push(
          new Polygon([
            sPolygon.points[i],
            sPolygon.points[(i + 1) % sPolygon.points.length],
            sLegCeiling.points[(i + 1) % sLegCeiling.points.length],
            sLegCeiling.points[i],
          ]),
        );
      }

      const hBase = new Polygon(
        polygon.points.map((point) => new Point(point.x, point.y, -40)),
      );
      // const sCeiling = new Polygon(
      //   sPolygon.points.map(
      //     (point) => new Point(point.x, point.y, -height - 200),
      //   ),
      // );
      this.centroid = this.#getCentroid(polygon.points);
      this.centroid.z = -height;

      const sSides = [];
      for (let i = 0; i < hBase.points.length; i++) {
        sSides.push(
          new Polygon([
            hBase.points[i],
            hBase.points[(i + 1) % hBase.points.length],
            this.centroid,
          ]),
        );
      }

      extrudedPolygons.push(...sSides, ...sLegSides, hBase);
    }
    return extrudedPolygons;
  }

  #getPolygons(world) {
    const buildingPolygons = this.#extrude(
      this.#filter(world.buildings.map((b) => b.base)),
      200,
    );
    const treePolygons = this.#extrudeTrees(
      this.#filter(world.trees.map((b) => b.base)),
      200,
    );
    const roadPolygons = this.#extrude(
      this.#filter(
        world.corridor
          ? world.corridor.borders.map((s) => new Polygon([s.p1, s.p2]))
          : world.roadBorders.map((s) => new Polygon([s.p1, s.p2])),
      ),
      10,
    );
    // const carPolygons = this.#extrude(
    //   this.#filter(
    //     world.cars.map((c) => new Polygon(c.polygon.map((point) => new Point(point.x, point.y))))
    //   ),
    //   10
    // );
    const carPolygons = this.#extrudeCar(
      this.#filter([
        new Polygon(
          world.bestCar.polygon.map((point) => new Point(point.x, point.y)),
        ),
      ])[0],
    );

    const carShadows = this.#filter(
      world.cars.map(
        (c) =>
          new Polygon(c.polygon.map((point) => new Point(point.x, point.y))),
      ),
    );

    for (const poly of carShadows) {
      poly.fill = 'rgba(220, 220, 220, 1)';
      poly.stroke = 'rgba(0, 0, 0, 0)';
    }

    for (const poly of buildingPolygons) {
      poly.fill = 'rgba(150, 150, 150, 0.2)';
      poly.stroke = 'rgba(150, 150, 150, 0.2)';
    }

    for (const poly of treePolygons) {
      poly.fill = 'rgba(34, 196, 74, 0.2)';
      poly.stroke = 'rgba(34, 196, 74, 0.2)';
    }

    const polygons = [
      ...carShadows,
      ...buildingPolygons,
      ...carPolygons,
      ...roadPolygons,
      ...treePolygons,
    ];
    return polygons;
  }

  render(ctx, world, gameCtx) {
    const polygons = this.#getPolygons(world);

    const projectedPolygons = polygons.map(
      (polygon) =>
        new Polygon(
          polygon.points.map((point) => this.#projectPoint(ctx, point)),
        ),
    );

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // for (const polygon of projectedPolygons) {
    //   polygon.draw(ctx);
    // }

    for (let i = 0; i < projectedPolygons.length; i++) {
      // Fog effect
      const distance = polygons[i].distanceToPoint(this); // this is camera x, y
      ctx.globalAlpha = (1 - distance / this.range) ** 2;

      const { fill, stroke } = polygons[i];
      projectedPolygons[i].draw(ctx, { fill, stroke, join: 'round' });
    }

    //to show the camera visible polygons on main ctx
    if (gameCtx) {
      for (const polygon of polygons) {
        polygon.draw(gameCtx);
      }
    }
  }

  draw(ctx) {
    this.polygon.draw(ctx);
    this.centroid?.draw(ctx);
  }
}
