declare class Tree {
  center: Point;
  size: number;
  base: Polygon;
  constructor(center: Point, size: number);
  draw(ctx: CanvasRenderingContext2D, viewPoint: Point): void;
}
interface Car {
  draw(ctx: CanvasRenderingContext2D, drawSensors?: boolean): void;
}
interface Corridor {
  borders: Segment[];
  skeleton: Segment[];
}

type lightControlCenterPoint = Point & {
  lights: Light[];
  ticks?: number;
};

interface WorldInfo {
  graph: GraphInfo;
  roadWidth: number;
  roadRoundness: number;
  buildingWidth: number;
  buildingMinLength: number;
  spacing: number;
  treeSize: number;
  envelopes: EnvelopeInfo[];
  roadBorders: Segment[];
  buildings: BuildingInfo[];
  trees: { center: Point }[];
  laneGuides: { p1: Point; p2: Point }[];
  markings: MarkingInfo[];
  zoom?: number;
  offset?: Point;
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

  frameCount: number;
  corridor: Corridor | null = null;

  zoom?: number;
  offset?: Point;

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
    this.cars = [];

    this.bestCar = null;
    this.frameCount = 0;

    this.generate();
  }

  static load(info: WorldInfo): World {
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
        new Envelope(
          segment,
          segment.oneWay ? this.roadWidth / 2 : this.roadWidth, // todo: fix very small one way roads
          this.roadRoundness,
        ),
      );
    }

    // Clear and regenerate world elements if requested
    this.laneGuides.length = 0;
    this.roadBorders.length = 0;
    this.buildings = [];
    this.trees = [];

    if (generateWorld) {
      this.laneGuides.push(...this.#generateLaneGuides());

      const roadPolygons = this.envelopes.map((envelope) => envelope.polygon!);
      this.roadBorders.push(...Polygon.union(roadPolygons));

      this.buildings = this.#generateBuildings();
      this.trees = this.#generateTrees();
    }
    // Corridor is generated separately by generateCorridor method
    this.corridor = null;
  }

  generateCorridor(start: Point, end: Point, extendEnd: boolean = false): void {
    const startSeg = getNearestSegment(start, this.graph.segments)!;
    const endSeg = getNearestSegment(end, this.graph.segments)!;

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
      tempEnvelopes.map((envelope) => envelope.polygon!),
    );

    this.corridor = { borders: unionSegments, skeleton: segments };
  }

  #generateLaneGuides(): Segment[] {
    const tempEnvelopes: Envelope[] = [];
    for (const segment of this.graph.segments) {
      tempEnvelopes.push(
        new Envelope(
          segment,
          segment.oneWay ? 2 : this.roadWidth / 2, // todo: fix very small one way roads
          this.roadRoundness,
        ),
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

  #getIntersections(): Point[] {
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

  #updateLights(): void {
    const lights: Light[] = this.markings.filter(
      (m): m is Light => m instanceof Light,
    );
    if (lights.length === 0) return; // No lights to update

    const intersections = this.#getIntersections();
    if (intersections.length === 0) return; // No intersections to control lights

    const controlCenters: lightControlCenterPoint[] = [];

    for (const light of lights) {
      const point = getNearestPoint(light.center, intersections)!;
      let controlCenter = controlCenters.find((c) => c.equals(point));
      if (!controlCenter) {
        controlCenter = new Point(point.x, point.y) as lightControlCenterPoint;
        controlCenter.lights = [light];
        controlCenters.push(controlCenter);
      } else {
        controlCenter.lights.push(light);
      }
    }

    // Define light cycle durations
    const greenDuration = 2; // seconds
    const yellowDuration = 1; // seconds

    // Calculate ticks per full cycle for each control center
    for (const center of controlCenters) {
      center.ticks = center.lights.length * (greenDuration + yellowDuration);
    }

    // Determine current state based on frame count (assuming 60 FPS)
    const tick = Math.floor(this.frameCount / 60);

    for (const center of controlCenters) {
      if (!center.ticks || center.ticks === 0) continue; // Avoid division by zero if no lights/ticks

      const currentTickInCycle = tick % center.ticks;
      const cycleSegmentDuration = greenDuration + yellowDuration;
      const greenYellowIndex = Math.floor(
        currentTickInCycle / cycleSegmentDuration,
      );

      const stateWithinSegment = currentTickInCycle % cycleSegmentDuration;
      const currentPhase: 'green' | 'yellow' =
        stateWithinSegment < greenDuration ? 'green' : 'yellow';

      // Update the state of each light controlled by this center
      for (let i = 0; i < center.lights.length; i++) {
        if (i === greenYellowIndex) {
          center.lights[i].state = currentPhase;
        } else {
          center.lights[i].state = 'red';
        }
      }
    }
    this.frameCount++; // Increment frame count for next update
  }

  draw(
    ctx: CanvasRenderingContext2D,
    viewPoint: Point,
    showStartMarkings: boolean = true,
    renderRadius: number = 1000,
  ): void {
    // Update traffic light states before drawing
    this.#updateLights();

    // Draw road envelopes (base road color/shape)
    for (const env of this.envelopes) {
      env.draw(ctx, { fill: '#BBB', stroke: '#BBB', lineWidth: 15 });
    }
    // Draw road markings (yield, stop, start, crosswalks, lights)
    for (const marking of this.markings) {
      if (!(marking instanceof Start) || showStartMarkings) {
        marking.draw(ctx);
      }
    }
    // Draw lane separators (dashed lines for two-way roads)
    for (const seg of this.graph.segments) {
      if (!seg.oneWay) {
        seg.draw(ctx, { color: 'white', width: 4, dash: [10, 20] });
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

    // for (const seg of this.laneGuides) {
    //   seg.draw(ctx);
    // }
  }
}
