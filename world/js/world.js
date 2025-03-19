class World {
  constructor(
    graph,
    roadWidth = 100,
    roadRoundness = 10,
    buildingWidth = 150,
    buildingMinLength = 150,
    spacing = 50,
    treeSize = 160
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
    world.roadBorders = info.roadBorders.map((b) => new Segment(b.p1, b.p2));
    world.buildings = info.buildings.map((b) => Building.load(b));
    world.trees = info.trees.map((t) => new Tree(t.center, t.size));
    world.laneGuides = info.laneGuides.map((g) => new Segment(g.p1, g.p2));
    world.markings = info.markings.map((m) => Marking.load(m));

    world.zoom = info.zoom;
    world.offset = info.offset;

    return world;
  }

  generate() {
    this.envelopes = [];
    for (const segment of this.graph.segments) {
      this.envelopes.push(new Envelope(segment, this.roadWidth, this.roadRoundness));
    }

    this.roadBorders = Polygon.union(this.envelopes.map((envelope) => envelope.polygon));
    this.buildings = this.#generateBuildings();
    this.trees = this.#generateTrees();

    this.laneGuides = [];
    this.laneGuides.push(...this.#generateLaneGuides());
  }

  #generateLaneGuides() {
    const tempEnvelopes = [];
    for (const segment of this.graph.segments) {
      tempEnvelopes.push(new Envelope(segment, this.roadWidth / 2, this.roadRoundness));
    }

    const segments = Polygon.union(tempEnvelopes.map((envelope) => envelope.polygon));
    return segments;
  }

  #generateTrees() {
    const points = [
      ...this.roadBorders.map((segment) => [segment.p1, segment.p2]).flat(),
      ...this.buildings.map((building) => building.base.points).flat(),
    ];
    const left = Math.min(...points.map((point) => point.x));
    const right = Math.max(...points.map((point) => point.x));
    const top = Math.min(...points.map((point) => point.y));
    const bottom = Math.max(...points.map((point) => point.y));

    const illegalPolygons = [
      ...this.buildings.map((building) => building.base),
      ...this.envelopes.map((envelope) => envelope.polygon),
    ];

    const trees = [];
    let tryCount = 0;
    while (tryCount < 100) {
      const point = new Point(lerp(left, right, Math.random()), lerp(bottom, top, Math.random()));

      // Check if tree inside or nearby building / road
      let keep = true;
      for (const polygon of illegalPolygons) {
        if (polygon.containsPoint(point) || polygon.distanceToPoint(point) < this.treeSize / 2) {
          keep = false;
          break;
        }
      }

      // Check if tree too close to other trees
      if (keep) {
        for (const tree of trees) {
          if (distance(tree.center, point) < this.treeSize) {
            keep = false;
            break;
          }
        }
      }

      // Avoiding trees in the middle of nowhere
      if (keep) {
        let closeToSomething = false;
        for (const polygon of illegalPolygons) {
          if (polygon.distanceToPoint(point) < this.treeSize * 2) {
            closeToSomething = true;
            break;
          }
        }
        keep = closeToSomething;
      }

      if (keep) {
        trees.push(new Tree(point, this.treeSize));
        tryCount = 0;
      }
      tryCount++;
    }
    return trees;
  }

  #generateBuildings() {
    const tempEnvelopes = [];
    for (const segment of this.graph.segments) {
      tempEnvelopes.push(new Envelope(segment, this.roadWidth + this.buildingWidth + this.spacing, this.roadRoundness));
    }

    const guides = Polygon.union(tempEnvelopes.map((envelope) => envelope.polygon));

    for (let i = 0; i < guides.length; i++) {
      const segment = guides[i];
      if (segment.length() < this.buildingMinLength) {
        guides.splice(i, 1);
        i--;
      }
    }

    const supports = [];
    for (const segment of guides) {
      const length = segment.length() + this.spacing;
      const buildingCount = Math.floor(length / (this.buildingMinLength + this.spacing));
      const buildingLength = length / buildingCount - this.spacing;
      const direction = segment.directionVector();

      let q1 = segment.p1;
      let q2 = add(q1, scale(direction, buildingLength));
      supports.push(new Segment(q1, q2));

      for (let i = 2; i < buildingCount; i++) {
        q1 = add(q2, scale(direction, this.spacing));
        q2 = add(q1, scale(direction, buildingLength));
        supports.push(new Segment(q1, q2));
      }
    }

    const bases = [];
    for (const segment of supports) {
      bases.push(new Envelope(segment, this.buildingWidth).polygon);
    }

    const epsilon = 0.001;
    for (let i = 0; i < bases.length - 1; i++) {
      for (let j = i + 1; j < bases.length; j++) {
        if (bases[i].intersectsPolygon(bases[j]) || bases[i].distanceToPolygon(bases[j]) < this.spacing - epsilon) {
          bases.splice(j, 1);
          j--;
        }
      }
    }
    return bases.map((b) => new Building(b));
  }

  draw(ctx, viewPoint, showStartMarkings = true) {
    for (const envelope of this.envelopes) {
      envelope.draw(ctx, { fill: '#BBB', stroke: '#BBB', lineWidth: 15 });
    }
    for (const marking of this.markings) {
      if (marking instanceof Start && !showStartMarkings) continue;
      marking.draw(ctx);
    }
    for (const segment of this.graph.segments) {
      segment.draw(ctx, { color: 'white', width: 4, dash: [10, 10] });
    }
    for (const segment of this.roadBorders) {
      segment.draw(ctx, { color: 'white', width: 4 });
    }

    ctx.globalAlpha = 0.2;
    for (const car of this.cars) {
      car.draw(ctx);
    }
    ctx.globalAlpha = 1;
    if (this.bestCar) {
      this.bestCar.draw(ctx, true);
    }

    const items = [...this.buildings, ...this.trees];
    items.sort((a, b) => b.base.distanceToPoint(viewPoint) - a.base.distanceToPoint(viewPoint));
    for (const item of items) item.draw(ctx, viewPoint);
  }
}
