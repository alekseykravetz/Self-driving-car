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
import type { GenerationProgressCallback } from './generation/generationProgress.js';
import {
  IWorld,
  WorldDrawOptions,
  WorldDecoration,
  WorldLayerVisibility,
  DEFAULT_LAYER_VISIBILITY,
  type BuildingSource,
} from './types.js';
import { lerp, mulberry32, dot, subtract, normalize } from '../math/utils.js';
import { drawEnvelope } from '../rendering/envelopeRenderer.js';
import { drawSegment } from '../rendering/segmentRenderer.js';
import { WorldSignageRenderer } from './worldSignageRenderer.js';
import { WorldRoadMarkingsRenderer } from './worldRoadMarkingsRenderer.js';
import { WorldBridgeRenderer } from './worldBridgeRenderer.js';
import { WorldItemsRenderer } from './worldItemsRenderer.js';
import { sortEnvelopesByTier } from './roadTiers.js';
import { getRoadFillColor } from '../math/roadTypes.js';
import {
  pointInView,
  segmentInView,
  polygonBounds,
  aabbInView,
  type Aabb,
} from './worldViewCulling.js';

/** Optional legacy/versioned fields a saved world may carry that are not part
 * of the live {@link World} shape. All optional, so a `World` is assignable. */
interface LegacyWorldInfo {
  corridors?: Corridor[];
  corridor?: Corridor | null;
  decoration?: WorldDecoration;
  version?: number;
  buildingSource?: BuildingSource;
}

/** Reconstructs corridors from a saved world, accepting both the new
 * `corridors` array and the legacy single `corridor` field.
 * @internal Exported for testing only. */
export function loadWorldCorridors(info: World): Corridor[] {
  const legacy = info as LegacyWorldInfo;
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
  // Schema version of a live instance. Marks an already-loaded World as
  // canonical (v3) so re-loading one via World.load() does not re-run the
  // legacy marking-direction migration (which would flip every marking 180°).
  readonly version = 3;
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

  // Whether buildings come from real OSM footprints (`'osm'`) or the procedural
  // generator (`'generated'`, default). OSM buildings are never overwritten by
  // building generation, so editing roads after an import keeps real footprints.
  buildingSource: BuildingSource = 'generated';

  markings: Marking[];
  trafficManager: TrafficManager;
  corridors: Corridor[] = [];

  // Viewport state
  zoom?: number;
  offset?: Point;

  // Road signage placement cache, invalidated by Graph.hash() changes.
  #signageRenderer = new WorldSignageRenderer();
  #roadMarkingsRenderer = new WorldRoadMarkingsRenderer();
  #bridgeRenderer = new WorldBridgeRenderer();
  #itemsRenderer = new WorldItemsRenderer();
  #drawOrderCache: {
    hash: string;
    count: number;
    envelopes: Envelope[];
    // Envelope AABBs, parallel to `envelopes`, computed once per hash change so
    // per-frame viewport culling is an O(1) box test instead of re-walking
    // every (rounded, many-point) envelope polygon each frame.
    bounds: Aabb[];
  } | null = null;
  // The graph hash computed once at the top of the current draw() frame. Lets
  // internal helpers (bridge shadows/details) reuse it instead of triggering a
  // fresh O(n) Graph.hash() via the default parameter.
  #frameGraphHash: string | null = null;

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
    // Building provenance (additive; absent → generated for legacy saves).
    world.buildingSource =
      (info as LegacyWorldInfo).buildingSource ?? 'generated';

    // Rebuild cheap road geometry from the graph (dropped from v2 files, and
    // recomputed rather than trusted even for v1 files — it is deterministic).
    WorldGenerator.generateRoads(world);

    const decoration = (info as LegacyWorldInfo).decoration;
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

    // Legacy saves (version < 3) stored marking directionVector opposite to
    // the canonical travel direction — negate it and recompute anchor.flipped
    // so reanchoring reproduces the corrected direction.
    const infoVersion = (info as LegacyWorldInfo).version;
    if (infoVersion !== 3) {
      for (const m of world.markings) {
        m.directionVector = new Point(
          -m.directionVector.x,
          -m.directionVector.y,
        );
        if (m.anchor) {
          const segDir = normalize(subtract(m.anchor.p2, m.anchor.p1));
          m.anchor.flipped = dot(m.directionVector, segDir) < 0;
        }
      }
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
      version: 3,
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
      buildingSource: this.buildingSource,
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
    this.#drawOrderCache = null;
    WorldGenerator.generate(this, opts);
  }

  /**
   * Cooperative, time-sliced generation that keeps the UI responsive and
   * reports progress. Used for large OSM imports and "Regenerate items".
   */
  async generateAsync(opts?: {
    roads?: boolean;
    buildings?: boolean;
    trees?: boolean;
    onProgress?: GenerationProgressCallback;
  }): Promise<void> {
    this.#drawOrderCache = null;
    await WorldGenerator.generateAsync(this, opts);
    // Envelopes were repopulated in place (stable array ref, unchanged graph
    // hash); drop the cache so the next draw rebuilds the tier order from the
    // freshly generated set.
    this.#drawOrderCache = null;
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
      graphHash: providedGraphHash,
      screenBounds,
    } = options;

    const layers: WorldLayerVisibility = {
      ...DEFAULT_LAYER_VISIBILITY,
      ...layerOverrides,
    };

    // Graph.hash() is O(n); compute it once per frame and share it with every
    // consumer (traffic manager, draw-order cache, signage caches) instead of
    // recomputing it in each — that was ~5 redundant passes per frame. When the
    // caller already computed it (editor change-detection), reuse that.
    const graphHash = providedGraphHash ?? this.graph.hash();
    this.#frameGraphHash = graphHash;
    this.#signageRenderer.setFrameHash(graphHash);

    // Update traffic light states before drawing
    this.trafficManager.update(graphHash);

    if (layers.roads) {
      this.#drawRoadLayer(ctx, graphHash, screenBounds);
    }

    // Draw road markings (yield, stop, start, crosswalks, lights)
    if (layers.markings) {
      this.#drawMarkingLayer(ctx, screenBounds, showStartMarkings);
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

    // Decorative items: flat placeholders and distance-sorted pseudo-3D.
    this.#itemsRenderer.draw(ctx, {
      buildings: this.buildings,
      trees: this.trees,
      viewPoint,
      renderRadius,
      showItemBases: layers.itemBases,
      showBuildings: layers.buildings,
      showTrees: layers.trees,
      flatRoofs: this.buildingSource === 'osm',
    });
  }

  /** Roads layer: tier-sorted asphalt, bridges, borders, lane/parking marks,
   *  one-way arrows, and all road signage. */
  #drawRoadLayer(
    ctx: CanvasRenderingContext2D,
    graphHash: string,
    screenBounds: WorldDrawOptions['screenBounds'],
  ): void {
    // Draw road envelopes (asphalt style, more wider then road borders itself)
    // Tier-sorted: higher-class roads paint on top of lower-class at overlaps.
    const ordered = this.#getDrawOrderedEnvelopes(graphHash);
    const orderedBounds = this.#drawOrderCache!.bounds;
    for (let i = 0; i < ordered.length; i++) {
      const env = ordered[i];
      if (screenBounds && !aabbInView(orderedBounds[i], screenBounds)) {
        continue;
      }
      const seg = env.skeleton;
      const fill = getRoadFillColor(seg.highwayType);
      drawEnvelope(ctx, env, { fill, stroke: fill, lineWidth: 15 });
    }

    // Draw bridge elevation shadows (under borders, above asphalt fills).
    this.#bridgeRenderer.drawShadows(
      ctx,
      this.#getDrawOrderedEnvelopes(graphHash),
      screenBounds,
    );

    // Draw road borders (solid white lines)
    for (const seg of this.roadBorders) {
      if (screenBounds && !segmentInView(seg, screenBounds)) continue;
      drawSegment(ctx, seg, { color: 'white', width: 4 });
    }

    // Draw lane separators or direction arrows
    this.#roadMarkingsRenderer.drawLaneMarkings(
      ctx,
      this.graph.segments,
      screenBounds,
    );

    // Draw parking-lane 'P' markings (from segment metadata)
    this.#roadMarkingsRenderer.drawParkingLanes(
      ctx,
      this.graph.segments,
      screenBounds,
    );

    // Draw one-way arrows
    this.#signageRenderer.drawOneWayArrows(ctx, this.graph, screenBounds);

    // Draw bridge deck details: concrete overlay, parapet railings,
    // guardrail posts, and expansion joints.
    this.#bridgeRenderer.drawDetails(
      ctx,
      this.#getDrawOrderedEnvelopes(graphHash),
      screenBounds,
    );

    // Draw road name labels
    this.#signageRenderer.drawRoadNames(
      ctx,
      this.graph,
      this.zoom,
      screenBounds,
    );

    // Draw speed limit signs
    this.#signageRenderer.drawSpeedLimits(
      ctx,
      this.graph,
      this.zoom,
      screenBounds,
    );

    // Draw road shield badges (ref) and gantry exit signs (destination)
    this.#signageRenderer.drawRoadShields(
      ctx,
      this.graph,
      this.zoom,
      screenBounds,
    );
    this.#signageRenderer.drawExitSigns(
      ctx,
      this.graph,
      this.zoom,
      screenBounds,
    );
  }

  /** Markings layer: yield/stop/start/crossing/light markings, viewport-culled. */
  #drawMarkingLayer(
    ctx: CanvasRenderingContext2D,
    screenBounds: WorldDrawOptions['screenBounds'],
    showStartMarkings: boolean,
  ): void {
    for (const marking of this.markings) {
      if (screenBounds && !pointInView(marking.center, screenBounds)) {
        continue;
      }
      if (!(marking instanceof Start) || showStartMarkings) {
        marking.draw(ctx);
      }
    }
  }

  /**
   * Tier-sorted envelopes, recomputed only when the graph changes, as
   * detected by its hash. Higher-class roads paint on top at overlaps.
   */
  #getDrawOrderedEnvelopes(
    graphHash: string = this.#frameGraphHash ?? this.graph.hash(),
  ): Envelope[] {
    // Key on the envelope count as well as the graph hash: async generation
    // repopulates `this.envelopes` WITHOUT changing the graph hash, so a
    // hash-only key would keep serving the pre-generation (empty/old) set and
    // leave the roads unfilled until the next hash change.
    if (
      !this.#drawOrderCache ||
      this.#drawOrderCache.hash !== graphHash ||
      this.#drawOrderCache.count !== this.envelopes.length
    ) {
      const envelopes = sortEnvelopesByTier(this.envelopes);
      this.#drawOrderCache = {
        hash: graphHash,
        count: this.envelopes.length,
        envelopes,
        bounds: envelopes.map((e) => polygonBounds(e.polygon)),
      };
    }
    return this.#drawOrderCache.envelopes;
  }
}
