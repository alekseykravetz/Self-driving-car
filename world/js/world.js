class World {
  constructor(
    graph,
    roadWidth = 100,
    roadRoundness = 10,
    buildingWidth = 150,
    buildingMinLength = 150,
    spacing = 50,
    treeSize = 160,
  ) {
    this.graph = graph;
    this.roadWidth = roadWidth;
    this.roadRoundness = roadRoundness;
    this.buildingWidth = buildingWidth;
    this.buildingMinLength = buildingMinLength;
    this.spacing = spacing;
    this.treeSize = treeSize;

    this.envelopes = [];
    this.roadBorders = [];
    this.buildings = [];
    this.trees = [];
    this.laneGuides = [];

    this.markings = [];

    this.cars = [];
    this.bestCar = null;

    this.frameCount = 0;

    this.generate();
  }

  static load(info) {
    const world = new World(new Graph());
    world.graph = Graph.load(info.graph);

    world.roadWidth = info.roadWidth;
    world.roadRoundness = info.roadRoundness;
    world.buildingWidth = info.buildingWidth;
    world.buildingMinLength = info.buildingMinLength;
    world.spacing = info.spacing;
    world.treeSize = info.treeSize;

    world.envelopes = info.envelopes.map((envelope) => Envelope.load(envelope));
    world.roadBorders = info.roadBorders.map(
      (segment) => new Segment(segment.p1, segment.p2),
    );
    world.buildings = info.buildings.map((building) => Building.load(building));
    world.trees = info.trees.map((t) => new Tree(t.center, info.treeSize));
    world.laneGuides = info.laneGuides.map((g) => new Segment(g.p1, g.p2));
    world.markings = info.markings.map((m) => Marking.load(m));

    world.zoom = info.zoom;
    world.offset = info.offset;

    return world;
  }

  generate() {
    this.envelopes.length = 0; // re instantiated the same reference
    for (const segment of this.graph.segments) {
      this.envelopes.push(
        new Envelope(segment, this.roadWidth, this.roadRoundness),
      );
    }

    this.roadBorders = Polygon.union(
      this.envelopes.map((envelope) => envelope.polygon),
    );
    this.buildings = this.#generateBuildings();
    this.trees = this.#generateTrees();

    // re instantiated the same reference
    this.laneGuides.length = 0;
    this.laneGuides.push(...this.#generateLaneGuides());
  }

  generateCorridor(start, end, extendEnd = false) {
    const startSeg = getNearestSegment(start, this.graph.segments);
    const endSeg = getNearestSegment(end, this.graph.segments);

    const { point: projStart } = startSeg.projectPoint(start);
    const { point: projEnd } = endSeg.projectPoint(end);

    this.graph.points.push(projStart);
    this.graph.points.push(projEnd);

    const tempSegments = [
      new Segment(startSeg.p1, projStart),
      new Segment(projStart, startSeg.p2),
      new Segment(endSeg.p1, projEnd),
      new Segment(projEnd, endSeg.p2),
    ];

    if (startSeg.equals(endSeg)) {
      tempSegments.push(new Segment(projStart, projEnd));
    }

    this.graph.segments = this.graph.segments.concat(tempSegments);

    const path = this.graph.getShortestPath(projStart, projEnd);

    this.graph.removePoint(projStart);
    this.graph.removePoint(projEnd);

    const segments = [];
    for (let i = 1; i < path.length; i++) {
      segments.push(new Segment(path[i - 1], path[i]));
    }
    if (extendEnd) {
      const lastSeg = segments[segments.length - 1];
      const lastSegDir = lastSeg.directionVector();
      segments.push(
        new Segment(
          lastSeg.p2,
          add(lastSeg.p2, scale(lastSegDir, this.roadWidth * 2)),
        ),
      );
    }
    const tempEnvelopes = segments.map(
      (s) => new Envelope(s, this.roadWidth, this.roadRoundness),
    );
    if (extendEnd) {
      segments.pop();
    }
    const unionSegments = Polygon.union(
      tempEnvelopes.map((envelope) => envelope.polygon),
    );

    this.corridor = { borders: unionSegments, skeleton: segments };
  }

  #generateLaneGuides() {
    const tempEnvelopes = [];
    for (const segment of this.graph.segments) {
      tempEnvelopes.push(
        new Envelope(segment, this.roadWidth / 2, this.roadRoundness),
      );
    }

    const segments = Polygon.union(
      tempEnvelopes.map((envelope) => envelope.polygon),
    );
    return segments;
  }

  #generateTrees() {
    const points = [
      ...this.roadBorders.map((s) => [s.p1, s.p2]).flat(),
      ...this.buildings.map((b) => b.base.points).flat(),
    ];
    const left = Math.min(...points.map((p) => p.x));
    const right = Math.max(...points.map((p) => p.x));
    const top = Math.min(...points.map((p) => p.y));
    const bottom = Math.max(...points.map((p) => p.y));

    const illegalPolygons = [
      ...this.buildings.map((b) => b.base),
      ...this.envelopes.map((e) => e.polygon),
    ];

    const trees = [];
    let tryCount = 0;
    while (tryCount < 100) {
      const p = new Point(
        lerp(left, right, Math.random()),
        lerp(bottom, top, Math.random()),
      );

      // check if tree inside or nearby building / road
      let keep = true;
      for (const poly of illegalPolygons) {
        if (
          poly.containsPoint(p) ||
          poly.distanceToPoint(p) < this.treeSize / 2
        ) {
          keep = false;
          break;
        }
      }

      // check if tree too close to other trees
      if (keep) {
        for (const tree of trees) {
          if (distance(tree.center, p) < this.treeSize) {
            keep = false;
            break;
          }
        }
      }

      // avoiding trees in the middle of nowhere
      if (keep) {
        let closeToSomething = false;
        for (const poly of illegalPolygons) {
          if (poly.distanceToPoint(p) < this.treeSize * 2) {
            closeToSomething = true;
            break;
          }
        }
        keep = closeToSomething;
      }

      if (keep) {
        trees.push(new Tree(p, this.treeSize));
        tryCount = 0;
      }
      tryCount++;
    }
    return trees;
  }

  #generateBuildings() {
    const tempEnvelopes = [];
    for (const seg of this.graph.segments) {
      tempEnvelopes.push(
        new Envelope(
          seg,
          this.roadWidth + this.buildingWidth + this.spacing * 2,
          this.roadRoundness,
        ),
      );
    }

    const guides = Polygon.union(tempEnvelopes.map((e) => e.polygon));

    for (let i = 0; i < guides.length; i++) {
      const seg = guides[i];
      if (seg.length() < this.buildingMinLength) {
        guides.splice(i, 1);
        i--;
      }
    }

    const supports = [];
    for (let seg of guides) {
      const length = seg.length() + this.spacing;
      const buildingCount = Math.floor(
        length / (this.buildingMinLength + this.spacing),
      );
      const buildingLength = length / buildingCount - this.spacing;

      const direction = seg.directionVector();

      let q1 = seg.p1;
      let q2 = add(q1, scale(direction, buildingLength));
      supports.push(new Segment(q1, q2));

      for (let i = 2; i <= buildingCount; i++) {
        q1 = add(q2, scale(direction, this.spacing));
        q2 = add(q1, scale(direction, buildingLength));
        supports.push(new Segment(q1, q2));
      }
    }

    const bases = [];
    for (const seg of supports) {
      bases.push(new Envelope(seg, this.buildingWidth).polygon);
    }

    const epsilon = 0.001;
    for (let i = 0; i < bases.length - 1; i++) {
      for (let j = i + 1; j < bases.length; j++) {
        if (
          bases[i].intersectsPolygon(bases[j]) ||
          bases[i].distanceToPolygon(bases[j]) < this.spacing - epsilon
        ) {
          bases.splice(j, 1);
          j--;
        }
      }
    }
    return bases.map((b) => new Building(b));
  }

  #getIntersections() {
    const subset = [];
    for (const point of this.graph.points) {
      let degree = 0;
      for (const seg of this.graph.segments) {
        if (seg.includes(point)) {
          degree++;
        }
      }

      if (degree > 2) {
        subset.push(point);
      }
    }
    return subset;
  }

  #updateLights() {
    const lights = this.markings.filter((m) => m instanceof Light);
    const controlCenters = [];
    for (const light of lights) {
      const point = getNearestPoint(light.center, this.#getIntersections());
      let controlCenter = controlCenters.find((c) => c.equals(point));
      if (!controlCenter) {
        controlCenter = new Point(point.x, point.y);
        controlCenter.lights = [light];
        controlCenters.push(controlCenter);
      } else {
        controlCenter.lights.push(light);
      }
    }
    const greenDuration = 2;
    const yellowDuration = 1;
    for (const center of controlCenters) {
      center.ticks = center.lights.length * (greenDuration + yellowDuration);
    }
    const tick = Math.floor(this.frameCount / 60);
    for (const center of controlCenters) {
      const cTick = tick % center.ticks;
      const greenYellowIndex = Math.floor(
        cTick / (greenDuration + yellowDuration),
      );
      const greenYellowState =
        cTick % (greenDuration + yellowDuration) < greenDuration
          ? 'green'
          : 'yellow';
      for (let i = 0; i < center.lights.length; i++) {
        if (i == greenYellowIndex) {
          center.lights[i].state = greenYellowState;
        } else {
          center.lights[i].state = 'red';
        }
      }
    }
    this.frameCount++;
  }

  draw(ctx, viewPoint, showStartMarkings = true, renderRadius = 1000) {
    this.#updateLights();

    for (const env of this.envelopes) {
      env.draw(ctx, { fill: '#BBB', stroke: '#BBB', lineWidth: 15 });
    }
    for (const marking of this.markings) {
      if (!(marking instanceof Start) || showStartMarkings) {
        marking.draw(ctx);
      }
    }
    for (const seg of this.graph.segments) {
      seg.draw(ctx, { color: 'white', width: 4, dash: [10, 10] });
    }
    for (const seg of this.roadBorders) {
      seg.draw(ctx, { color: 'white', width: 4 });
    }

    if (this.corridor) {
      for (const seg of this.corridor.borders) {
        seg.draw(ctx, { color: 'red', width: 4 });
      }
    }

    ctx.globalAlpha = 0.2;
    for (const car of this.cars) {
      car.draw(ctx);
    }
    ctx.globalAlpha = 1;
    if (this.bestCar) {
      this.bestCar.draw(ctx, true);
    }

    const items = [...this.buildings, ...this.trees].filter(
      (i) => i.base.distanceToPoint(viewPoint) < renderRadius,
    );
    items.sort(
      (a, b) =>
        b.base.distanceToPoint(viewPoint) - a.base.distanceToPoint(viewPoint),
    );
    for (const item of items) {
      item.draw(ctx, viewPoint);
    }
  }
}
