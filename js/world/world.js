'use strict';
/** Reconstructs corridors from a saved world, accepting both the new
 * `corridors` array and the legacy single `corridor` field. */
function loadWorldCorridors(info) {
  const legacy = info;
  if (legacy.corridors) {
    return legacy.corridors.map((c) => Corridor.load(c));
  }
  if (legacy.corridor) {
    return [Corridor.load(legacy.corridor)];
  }
  return [];
}

class World {
  graph;
  roadWidth;
  roadRoundness;
  buildingWidth;
  buildingMinLength;
  spacing;
  treeSize;
  // Generated world data
  envelopes; // Road shape from graph.segments (asphalt, wider than the road borders)
  roadBorders; // Polygon union of envelopes (road shape)
  separatorBorders; // Center lines of hard-separated two-way roads
  buildings;
  trees;
  laneGuides;
  markings;
  trafficManager;
  corridors = [];
  // Viewport state
  zoom;
  offset;
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
    this.separatorBorders = [];
    this.buildings = [];
    this.trees = [];
    this.laneGuides = [];
    this.markings = [];
    this.trafficManager = new TrafficManager(this.graph, this.markings);
    this.generate();
  }

  static load(info) {
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
    world.separatorBorders = (info.separatorBorders ?? []).map(
      (s) => new Segment(new Point(s.p1.x, s.p1.y), new Point(s.p2.x, s.p2.y)),
    );
    world.buildings = info.buildings.map((building) => Building.load(building));
    world.trees = info.trees.map((t) => new Tree(t.center, info.treeSize));
    world.laneGuides = info.laneGuides.map((g) => new Segment(g.p1, g.p2));
    world.markings = info.markings.map((m) => Marking.load(m));
    world.corridors = loadWorldCorridors(info);
    world.trafficManager = new TrafficManager(world.graph, world.markings);
    // Load view state if available
    world.zoom = info.zoom;
    world.offset = info.offset;
    // Note: This loaded world doesn't call generate() again,
    // preserving the loaded state exactly.
    return world;
  }

  generate(generateBuildings = true) {
    WorldGenerator.generate(this, generateBuildings);
  }

  /** Back-compat accessor: the primary (first) corridor, or null. */
  get corridor() {
    return this.corridors[0] ?? null;
  }

  /**
   * Builds a single dynamic corridor from `start` to `end` and makes it the
   * world's only corridor. Used by the race game and training simulator to
   * constrain cars to a computed path.
   */
  generateCorridor(start, end, extendEnd = false) {
    const path = this.graph.getShortestPath(start, end);
    const corridor = Corridor.fromPath(
      path,
      this.roadWidth,
      this.roadRoundness,
      { extendEnd },
    );
    this.corridors = [corridor];
  }

  /** Adds an authored corridor (e.g. from the corridor editor). */
  addCorridor(corridor) {
    this.corridors.push(corridor);
  }

  /**
   * All collision boundaries cars must respect: road borders, hard-separation
   * center lines, and every corridor's walls.
   */
  getCollisionBorders() {
    const borders = [...this.roadBorders, ...this.separatorBorders];
    for (const corridor of this.corridors) {
      borders.push(...corridor.borders);
    }
    return borders;
  }

  draw(ctx, options) {
    const {
      viewPoint,
      cars = [],
      bestCar = null,
      showStartMarkings = true,
      renderRadius = 1000,
      carAlpha = 0.2,
      showCarNames = false,
    } = options;
    // Update traffic light states before drawing
    this.trafficManager.update();
    // Draw road envelopes (asphalt style, more wider then road borders itself)
    for (const env of this.envelopes) {
      env.draw(ctx, { fill: '#BBB', stroke: '#BBB', lineWidth: 15 });
    }
    // Draw road borders (solid white lines)
    for (const seg of this.roadBorders) {
      seg.draw(ctx, { color: 'white', width: 4 });
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
      } else if (seg.separated) {
        // Hard separation: solid white center line (also a collision border)
        seg.draw(ctx, {
          color: 'white',
          width: 4,
        });
      } else {
        // Draw dashed lines for two-way roads
        seg.draw(ctx, {
          color: 'white',
          width: 4,
          dash: [15, 25],
        });
      }
    }
    // Draw road markings (yield, stop, start, crosswalks, lights)
    for (const marking of this.markings) {
      if (!(marking instanceof Start) || showStartMarkings) {
        marking.draw(ctx);
      }
    }
    // Draw corridors (consistent style, owned by Corridor.draw)
    for (const corridor of this.corridors) {
      corridor.draw(ctx);
    }
    // Draw cars
    for (const car of cars) {
      car.draw(ctx, { alpha: carAlpha, showName: showCarNames });
    }
    if (bestCar) {
      bestCar.draw(ctx, { showSensor: true, showName: showCarNames });
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
      item.draw(ctx, { viewPoint });
    }
    // Optional: Draw lane guides for debugging
    // for (const seg of this.laneGuides) {
    //   seg.draw(ctx, { color: 'cyan', width: 1 });
    // }
  }
}
