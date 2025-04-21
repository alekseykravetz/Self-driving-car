interface Corridor {
  borders: Segment[];
  skeleton: Segment[];
}

class World {
  graph: Graph;
  roadWidth: number;
  roadRoundness: number;
  buildingWidth: number;
  buildingMinLength: number;
  spacing: number;
  treeSize: number;

  envelopes: Envelope[];
  roadBorders: Segment[];
  buildings: Building[];
  trees: Tree[];
  laneGuides: Segment[];
  markings: Marking[];

  cars: Car[];
  bestCar: Car | null;

  corridor: Corridor | null = null;

  zoom?: number;
  offset?: Point;

  trafficManager: TrafficManager;

  constructor(
    graph: Graph,
    roadWidth: number = 100,
    roadRoundness: number = 10,
    buildingWidth: number = 150,
    buildingMinLength: number = 150,
    spacing: number = 50,
    treeSize: number = 160,
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
    this.trafficManager = new TrafficManager(this);
    this.cars = [];

    this.bestCar = null;

    this.generate();
  }

  static load(info: World): World {
    // Create a world with default graph, properties will be overwritten
    const world = new World(new Graph());
    // Load graph structure first
    world.graph = Graph.load(info.graph);
    //this version trigger world generation and it is slower
    // const graph = Graph.load(info.graph);
    // const world = new World(graph);

    // Load world parameters
    world.roadWidth = info.roadWidth;
    world.roadRoundness = info.roadRoundness;
    world.buildingWidth = info.buildingWidth;
    world.buildingMinLength = info.buildingMinLength;
    world.spacing = info.spacing;
    world.treeSize = info.treeSize;

    // Load generated geometry/entities
    world.envelopes = info.envelopes.map((e) => Envelope.load(e));
    world.roadBorders = info.roadBorders.map((s) => new Segment(s.p1, s.p2));
    world.buildings = info.buildings.map((building) => Building.load(building));
    world.trees = info.trees.map((t) => new Tree(t.center, info.treeSize));
    world.laneGuides = info.laneGuides.map((g) => new Segment(g.p1, g.p2));
    world.markings = info.markings.map((m) => Marking.load(m)!);
    world.trafficManager = new TrafficManager(world);

    // Load view state if available
    world.zoom = info.zoom;
    world.offset = info.offset;

    // Note: This loaded world doesn't call generate() again,
    // preserving the loaded state exactly.
    return world;
  }

  generate(generateWorld: boolean = true): void {
    this.envelopes.length = 0; // Clear array while keeping reference
    for (const segment of this.graph.segments) {
      this.envelopes.push(
        new Envelope(segment, this.roadWidth, this.roadRoundness),
      );
    }

    this.laneGuides.length = 0;
    this.roadBorders.length = 0;
    this.buildings = [];
    this.trees = [];

    if (generateWorld) {
      const roadPolygons = this.envelopes.map((envelope) => envelope.polygon!);
      this.roadBorders.push(...Polygon.union(roadPolygons));

      this.laneGuides.push(...this.#generateLaneGuides());

      this.buildings = this.#generateBuildings();
      this.trees = this.#generateTrees();
    }
    // Corridor is generated separately by generateCorridor method
    this.corridor = null;
  }

  generateCorridor(start: Point, end: Point, extendEnd: boolean = false): void {
    const segments = this.graph.getShortestPath(start, end);

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
      tempEnvelopes.map((envelope) => envelope.polygon!),
    );

    this.corridor = { borders: unionSegments, skeleton: segments };
  }

  #generateLaneGuides(): Segment[] {
    const tempEnvelopes: Envelope[] = [];
    for (const segment of this.graph.segments) {
      tempEnvelopes.push(
        new Envelope(segment, this.roadWidth / 2, this.roadRoundness),
      );
    }

    const laneGuidePolygons = tempEnvelopes.map(
      (envelope) => envelope.polygon!,
    );
    // Polygon.union returns segments forming the boundary of the union
    const segments: Segment[] = Polygon.union(laneGuidePolygons);
    return segments;
  }

  #generateTrees(): Tree[] {
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
      ...this.envelopes.map((e) => e.polygon!),
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

  #generateBuildings(): Building[] {
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

    const guides = Polygon.union(tempEnvelopes.map((e) => e.polygon!));

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

    const bases: Polygon[] = [];
    for (const seg of supports) {
      bases.push(new Envelope(seg, this.buildingWidth).polygon!);
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

  draw(
    ctx: CanvasRenderingContext2D,
    viewPoint: Point,
    showStartMarkings: boolean = true,
    renderRadius: number = 1000,
  ): void {
    // Update traffic light states before drawing
    this.trafficManager.update();

    // Draw road envelopes
    for (const env of this.envelopes) {
      env.draw(ctx, { fill: '#BBB', stroke: '#BBB', lineWidth: 15 });
    }

    // Draw road markings (yield, stop, start, crosswalks, lights)
    for (const marking of this.markings) {
      if (!(marking instanceof Start) || showStartMarkings) {
        marking.draw(ctx);
      }
    }

    // Draw lane separators or direction arrows
    for (const seg of this.graph.segments) {
      if (seg.oneWay) {
        // Draw direction arrows for one-way roads
        const arrowSpacing = 200;
        const arrowLength = 20;
        const arrowAngle = Math.PI / 8;

        const len = seg.length();
        if (len < arrowLength * 2) continue;

        const numArrows = Math.max(1, Math.floor(len / arrowSpacing));

        const dirVector = seg.directionVector();
        const dir =
          magnitude(dirVector) > 0.001 ? normalize(dirVector) : new Point(1, 0);

        // Store original context state
        const originalLineCap = ctx.lineCap;
        const originalLineWidth = ctx.lineWidth;

        // Set arrow style
        ctx.strokeStyle = 'white';
        ctx.fillStyle = 'white';
        ctx.lineWidth = 2;
        ctx.lineCap = 'butt';

        for (let i = 0; i < numArrows; i++) {
          const t = (i + 0.5) / numArrows;
          const clampedT = Math.max(0, Math.min(1, t));
          const tip = lerp2D(seg.p1, seg.p2, clampedT);

          const arrowBaseDir = scale(dir, -1);
          const start1 = add(
            tip,
            scale(rotate(arrowBaseDir, arrowAngle), arrowLength),
          );
          const start2 = add(
            tip,
            scale(rotate(arrowBaseDir, -arrowAngle), arrowLength),
          );

          // Draw arrow (start1 to tip and tip to start2)
          ctx.beginPath();
          ctx.moveTo(start1.x, start1.y);
          ctx.lineTo(tip.x, tip.y);
          ctx.lineTo(start2.x, start2.y);
          ctx.closePath();
          ctx.stroke();
          ctx.fill();
        }

        // Restore original context state
        ctx.lineCap = originalLineCap;
        ctx.lineWidth = originalLineWidth;
      } else {
        // Draw dashed lines for two-way roads
        seg.draw(ctx, {
          color: 'white',
          width: 4,
          dash: [15, 25],
        });
      }
    }

    // Draw road borders (solid white lines)
    for (const seg of this.roadBorders) {
      seg.draw(ctx, { color: 'white', width: 4 });
    }

    if (this.corridor) {
      for (const seg of this.corridor.borders) {
        seg.draw(ctx, { color: 'red', width: 4 });
      }
    }

    // Draw cars
    ctx.globalAlpha = 0.2;
    for (const car of this.cars) {
      car.draw(ctx);
    }
    ctx.globalAlpha = 1;
    if (this.bestCar) {
      this.bestCar.draw(ctx, true);
    }

    // Draw buildings and trees (sorted by distance)
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

    // Optional: Draw lane guides for debugging
    // for (const seg of this.laneGuides) {
    //   seg.draw(ctx, { color: 'cyan', width: 1 });
    // }
  }
}
