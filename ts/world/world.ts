import { Graph } from '../math/graph/graph.js';
import { Envelope } from '../math/primitives/envelope.js';
import { Segment } from '../math/primitives/segment.js';
import { Point } from '../math/primitives/point.js';
import { Building } from './items/building.js';
import {
  Tree,
  TreePrototype,
  TreeInstance,
  buildTreePrototypes,
  DEFAULT_TREE_SEED,
  DEFAULT_TREE_PROTOTYPE_COUNT,
} from './items/tree.js';
import { loadMarking } from './markings/markingLoader.js';
import type { Marking } from './markings/marking.js';
import { Start } from './markings/start.js';
import { Corridor } from './corridor.js';
import { TrafficManager } from './trafficManager.js';
import { WorldGenerator } from './generation/worldGenerator.js';
import {
  IWorld,
  WorldDrawOptions,
  WorldDecoration,
  WorldLayerVisibility,
  DEFAULT_LAYER_VISIBILITY,
} from './types.js';
import {
  add,
  scale,
  lerp2D,
  lerp,
  normalize,
  magnitude,
  rotate,
  mulberry32,
} from '../math/utils.js';
import { drawEnvelope } from '../rendering/envelopeRenderer.js';
import { drawSegment } from '../rendering/segmentRenderer.js';
import { drawPolygon } from '../rendering/polygonRenderer.js';

/** Reconstructs corridors from a saved world, accepting both the new
 * `corridors` array and the legacy single `corridor` field.
 * @internal Exported for testing only. */
export function loadWorldCorridors(info: World): Corridor[] {
  const legacy = info as unknown as {
    corridors?: Corridor[];
    corridor?: Corridor | null;
  };
  if (legacy.corridors) {
    return legacy.corridors.map((c) => Corridor.load(c));
  }
  if (legacy.corridor) {
    return [Corridor.load(legacy.corridor)];
  }
  return [];
}

/** Rebuilds a Tree from a compact v2 instance bound to the world's prototypes.
 * @internal Exported for testing only. */
export function loadTreeInstance(inst: TreeInstance, world: World): Tree {
  const p = inst.p ?? 0;
  const prototype = world.treePrototypes[p] ?? world.treePrototypes[0];
  return new Tree(
    new Point(inst.x, inst.y),
    world.treeSize,
    prototype,
    p,
    inst.t ?? 0,
    inst.s ?? 1,
  );
}

export class World implements IWorld {
  graph: Graph;
  roadWidth: number;
  roadRoundness: number;
  buildingWidth: number;
  buildingMinLength: number;
  spacing: number;
  treeSize: number;

  // Tree decoration: a reproducible prototype set (seed + count) referenced by
  // lightweight tree instances. Persisted as `decoration.treeSeed`/`Count`.
  treeSeed: number = DEFAULT_TREE_SEED;
  treePrototypeCount: number = DEFAULT_TREE_PROTOTYPE_COUNT;
  treePrototypes: TreePrototype[] = [];

  // Generated world data
  envelopes: Envelope[]; // Road shape from graph.segments (asphalt, wider than the road borders)
  roadBorders: Segment[]; // Polygon union of envelopes (road shape)
  separatorBorders: Segment[]; // Center lines of hard-separated two-way roads
  buildings: Building[];
  trees: Tree[];
  laneGuides: Segment[];

  markings: Marking[];
  trafficManager: TrafficManager;
  corridors: Corridor[] = [];

  // Viewport state
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
    this.separatorBorders = [];
    this.buildings = [];
    this.trees = [];
    this.laneGuides = [];

    this.markings = [];
    this.trafficManager = new TrafficManager(this.graph, this.markings);

    this.generate();
  }

  static load(info: World): World {
    // Create a world with default graph, properties will be overwritten
    const world = new World(new Graph());
    // Load graph structure first
    world.graph = Graph.load(info.graph);

    // Load world parameters
    world.roadWidth = info.roadWidth;
    world.roadRoundness = info.roadRoundness;
    world.buildingWidth = info.buildingWidth;
    world.buildingMinLength = info.buildingMinLength;
    world.spacing = info.spacing;
    world.treeSize = info.treeSize;

    // Load authored, must-have data.
    world.markings = (info.markings ?? []).map((m) => loadMarking(m)!);
    world.corridors = loadWorldCorridors(info);
    world.zoom = info.zoom;
    world.offset = info.offset;

    // Rebuild cheap road geometry from the graph (dropped from v2 files, and
    // recomputed rather than trusted even for v1 files — it is deterministic).
    WorldGenerator.generateRoads(world);

    const decoration = (info as unknown as { decoration?: WorldDecoration })
      .decoration;
    if (decoration) {
      // --- v2 lean format: compact decoration + reproducible prototypes ---
      world.treeSeed = decoration.treeSeed ?? DEFAULT_TREE_SEED;
      world.treePrototypeCount =
        decoration.treePrototypeCount ?? DEFAULT_TREE_PROTOTYPE_COUNT;
      world.treePrototypes = buildTreePrototypes(
        world.treeSeed,
        world.treePrototypeCount,
      );
      world.trees = (decoration.trees ?? []).map((inst) =>
        loadTreeInstance(inst, world),
      );
      world.buildings = (decoration.buildings ?? []).map((b) =>
        Building.loadFootprint(b),
      );
    } else {
      // --- v1 back-compat: file carries baked geometry. Convert into the lean
      // model so a re-save emits v2. Tree canopy shapes become prototype-based
      // (they differ slightly from the baked originals); positions are kept. ---
      world.treeSeed = DEFAULT_TREE_SEED;
      world.treePrototypeCount = DEFAULT_TREE_PROTOTYPE_COUNT;
      world.treePrototypes = buildTreePrototypes(
        world.treeSeed,
        world.treePrototypeCount,
      );
      const rand = mulberry32((world.treeSeed ^ 0x9e3779b9) >>> 0);
      const legacyTrees = (info.trees ?? []) as { center: Point }[];
      world.trees = legacyTrees.map((t) => {
        const p = Math.floor(rand() * world.treePrototypeCount);
        const type = rand() < 0.6 ? 0 : rand() < 0.5 ? 1 : 2;
        const scale = lerp(0.8, 1.2, rand());
        return new Tree(
          new Point(t.center.x, t.center.y),
          world.treeSize,
          world.treePrototypes[p],
          p,
          type,
          scale,
        );
      });
      world.buildings = (info.buildings ?? []).map((b) => Building.load(b));
    }

    WorldGenerator.reanchorMarkings(world);
    world.trafficManager = new TrafficManager(world.graph, world.markings);

    return world;
  }

  /**
   * Serializes to the lean v2 world schema: must-have data (graph, params,
   * markings, corridors, viewport) plus a compact `decoration` block (tree seed
   * + prototype count + lightweight tree instances, and footprint-only
   * buildings). Derived road geometry (envelopes, road borders, lane guides,
   * separator borders) is intentionally dropped and rebuilt on load.
   */
  toJSON(): object {
    return {
      version: 2,
      graph: this.graph,
      roadWidth: this.roadWidth,
      roadRoundness: this.roadRoundness,
      buildingWidth: this.buildingWidth,
      buildingMinLength: this.buildingMinLength,
      spacing: this.spacing,
      treeSize: this.treeSize,
      markings: this.markings,
      corridors: this.corridors,
      zoom: this.zoom,
      offset: this.offset,
      decoration: {
        treeSeed: this.treeSeed,
        treePrototypeCount: this.treePrototypeCount,
        trees: this.trees.map((t) => t.toInstance()),
        buildings: this.buildings.map((b) => b.toFootprint()),
      },
    };
  }

  generate(opts?: {
    roads?: boolean;
    buildings?: boolean;
    trees?: boolean;
  }): void {
    WorldGenerator.generate(this, opts);
  }

  /** Back-compat accessor: the primary (first) corridor, or null. */
  get corridor(): Corridor | null {
    return this.corridors[0] ?? null;
  }

  /**
   * Builds a single dynamic corridor from `start` to `end` and makes it the
   * world's only corridor. Used by the race game and training simulator to
   * constrain cars to a computed path.
   */
  generateCorridor(start: Point, end: Point, extendEnd: boolean = false): void {
    WorldGenerator.generateCorridor(this, start, end, extendEnd);
  }

  /** Adds an authored corridor (e.g. from the corridor editor). */
  addCorridor(corridor: Corridor): void {
    this.corridors.push(corridor);
  }

  /**
   * All collision boundaries cars must respect: road borders, hard-separation
   * center lines, and every corridor's walls.
   */
  getCollisionBorders(): Segment[] {
    const borders: Segment[] = [...this.roadBorders, ...this.separatorBorders];
    for (const corridor of this.corridors) {
      borders.push(...corridor.borders);
    }
    return borders;
  }

  draw(ctx: CanvasRenderingContext2D, options: WorldDrawOptions): void {
    const {
      viewPoint,
      cars = [],
      bestCar = null,
      showStartMarkings = true,
      renderRadius = 1000,
      carAlpha = 0.2,
      showCarNames = false,
      layers: layerOverrides,
    } = options;

    const layers: WorldLayerVisibility = {
      ...DEFAULT_LAYER_VISIBILITY,
      ...layerOverrides,
    };

    // Update traffic light states before drawing
    this.trafficManager.update();

    if (layers.roads) {
      // Draw road envelopes (asphalt style, more wider then road borders itself)
      for (const env of this.envelopes) {
        drawEnvelope(ctx, env, { fill: '#BBB', stroke: '#BBB', lineWidth: 15 });
      }

      // Draw road borders (solid white lines)
      for (const seg of this.roadBorders) {
        drawSegment(ctx, seg, { color: 'white', width: 4 });
      }

      // Draw lane separators or direction arrows
      this.#drawLaneMarkings(ctx);
    }

    // Draw road markings (yield, stop, start, crosswalks, lights)
    if (layers.markings) {
      for (const marking of this.markings) {
        if (!(marking instanceof Start) || showStartMarkings) {
          marking.draw(ctx);
        }
      }
    }

    // Draw corridors (consistent style, owned by Corridor.draw)
    if (layers.corridors) {
      for (const corridor of this.corridors) {
        corridor.draw(ctx);
      }
    }

    // Draw cars (draw-time input, always shown)
    for (const car of cars) {
      car.draw(ctx, { alpha: carAlpha, showName: showCarNames });
    }
    if (bestCar) {
      bestCar.draw(ctx, { showSensor: true, showName: showCarNames });
    }

    // Flat item placeholders (cheap outlines) for inspection on big maps.
    if (layers.itemBases) {
      for (const building of this.buildings) {
        drawPolygon(ctx, building.base, {
          fill: 'rgba(150,150,150,0.25)',
          stroke: 'rgba(0,0,0,0.35)',
          lineWidth: 2,
        });
      }
      for (const tree of this.trees) {
        drawPolygon(ctx, tree.base, {
          fill: 'rgba(30,150,70,0.2)',
          stroke: 'rgba(0,90,40,0.5)',
          lineWidth: 2,
        });
      }
    }

    // Rendered pseudo-3D buildings and trees (distance-sorted, painter's order).
    const renderBuildings = layers.buildings ? this.buildings : [];
    const renderTrees = layers.trees ? this.trees : [];
    if (renderBuildings.length || renderTrees.length) {
      const items = [...renderBuildings, ...renderTrees].filter(
        (i) => i.base.distanceToPoint(viewPoint) < renderRadius,
      );
      items.sort(
        (a, b) =>
          b.base.distanceToPoint(viewPoint) - a.base.distanceToPoint(viewPoint),
      );
      for (const item of items) {
        item.draw(ctx, { viewPoint });
      }
    }

    // Optional: Draw lane guides for debugging
    // for (const seg of this.laneGuides) {
    //   drawSegment(ctx, seg, { color: 'cyan', width: 1 });
    // }
  }

  /** Draws one-way arrows, hard-separation center lines, and dashed dividers. */
  #drawLaneMarkings(ctx: CanvasRenderingContext2D): void {
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
        drawSegment(ctx, seg, {
          color: 'white',
          width: 4,
        });
      } else {
        // Draw dashed lines for two-way roads
        drawSegment(ctx, seg, {
          color: 'white',
          width: 4,
          dash: [15, 25],
        });
      }
    }
  }
}
