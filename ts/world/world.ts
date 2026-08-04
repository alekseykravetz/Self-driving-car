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
} from './types.js';
import {
  add,
  scale,
  lerp,
  lerp2D,
  normalize,
  perpendicular,
  angle,
  mulberry32,
  dot,
  subtract,
} from '../math/utils.js';
import { drawEnvelope } from '../rendering/envelopeRenderer.js';
import { drawSegment } from '../rendering/segmentRenderer.js';
import { drawPolygon } from '../rendering/polygonRenderer.js';
import { LANE_WIDTH_PX, PARKING_LANE_WIDTH_PX } from '../math/worldUnits.js';
import { WorldSignageRenderer } from './worldSignageRenderer.js';
import { sortEnvelopesByTier } from './roadTiers.js';
import { getRoadFillColor } from '../math/roadTypes.js';
import type { VisibleWorldRect } from '../viewport/viewport.js';

/** World-space padding (px) added around the visible rect when culling roads,
 * lane markings, and markings, so wide roads and labels straddling the screen
 * edge aren't clipped. Covers the widest road half-width plus signage. */
const WORLD_CULL_MARGIN_PX = 300;

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

  // Road signage placement cache, invalidated by Graph.hash() changes.
  #signageRenderer = new WorldSignageRenderer();
  #drawOrderCache: {
    hash: string;
    count: number;
    envelopes: Envelope[];
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

    // Legacy saves (version < 3) stored marking directionVector opposite to
    // the canonical travel direction — negate it and recompute anchor.flipped
    // so reanchoring reproduces the corrected direction.
    const infoVersion = (info as unknown as { version?: number }).version;
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
      // Draw road envelopes (asphalt style, more wider then road borders itself)
      // Tier-sorted: higher-class roads paint on top of lower-class at overlaps.
      for (const env of this.#getDrawOrderedEnvelopes(graphHash)) {
        if (screenBounds && !this.#polygonInView(env.polygon, screenBounds)) {
          continue;
        }
        const seg = env.skeleton;
        const fill = getRoadFillColor(seg.highwayType);
        drawEnvelope(ctx, env, { fill, stroke: fill, lineWidth: 15 });
      }

      // Draw bridge elevation shadows (under borders, above asphalt fills).
      this.#drawBridgeShadows(ctx, screenBounds);

      // Draw road borders (solid white lines)
      for (const seg of this.roadBorders) {
        if (screenBounds && !this.#segmentInView(seg, screenBounds)) continue;
        drawSegment(ctx, seg, { color: 'white', width: 4 });
      }

      // Draw lane separators or direction arrows
      this.#drawLaneMarkings(ctx, screenBounds);

      // Draw parking-lane 'P' markings (from segment metadata)
      this.#drawParkingLanes(ctx, screenBounds);

      // Draw one-way arrows
      this.#signageRenderer.drawOneWayArrows(ctx, this.graph);

      // Draw bridge deck details: concrete overlay, parapet railings,
      // guardrail posts, and expansion joints.
      this.#drawBridgeDetails(ctx, screenBounds);

      // Draw road name labels
      this.#signageRenderer.drawRoadNames(ctx, this.graph, this.zoom);

      // Draw speed limit signs
      this.#signageRenderer.drawSpeedLimits(ctx, this.graph, this.zoom);

      // Draw road shield badges (ref) and gantry exit signs (destination)
      this.#signageRenderer.drawRoadShields(ctx, this.graph, this.zoom);
      this.#signageRenderer.drawExitSigns(ctx, this.graph, this.zoom);
    }

    // Draw road markings (yield, stop, start, crosswalks, lights)
    if (layers.markings) {
      for (const marking of this.markings) {
        if (screenBounds && !this.#pointInView(marking.center, screenBounds)) {
          continue;
        }
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
  #drawLaneMarkings(
    ctx: CanvasRenderingContext2D,
    screenBounds?: VisibleWorldRect,
  ): void {
    for (const seg of this.graph.segments) {
      if (seg.laneMarkings === false) continue;
      if (screenBounds && !this.#segmentInView(seg, screenBounds)) continue;
      const laneCount = seg.lanes ?? (seg.oneWay ? 1 : 2);
      const roadWidth = laneCount * LANE_WIDTH_PX;

      if (laneCount > 2) {
        this.#drawMultiLaneDividers(ctx, seg, laneCount, roadWidth);
      } else {
        this.#drawSimpleLaneMarkings(ctx, seg, laneCount);
      }
    }
  }

  /**
   * Draws spaced 'P' glyphs along each segment's parking lane(s). Parking is a
   * per-segment property (`parkingLeft`/`parkingRight`) that widens the road
   * envelope; the glyphs sit at the parking-lane centre
   * (`drivingWidth/2 + PARKING_LANE_WIDTH_PX/2`) on the tagged side(s).
   */
  #drawParkingLanes(
    ctx: CanvasRenderingContext2D,
    screenBounds?: VisibleWorldRect,
  ): void {
    const bayLen = LANE_WIDTH_PX;
    const spacing = bayLen * 1.5;
    for (const seg of this.graph.segments) {
      if (!seg.parkingRight && !seg.parkingLeft) continue;
      if (screenBounds && !this.#segmentInView(seg, screenBounds)) continue;
      const laneCount = seg.lanes ?? (seg.oneWay ? 1 : 2);
      const drivingWidth = laneCount * LANE_WIDTH_PX;
      const laneCenter = drivingWidth / 2 + PARKING_LANE_WIDTH_PX / 2;
      const dir = seg.directionVector();
      const perp = perpendicular(dir); // unit; +perp = right of p1→p2
      const rot = angle(dir);
      const segLen = seg.length();
      if (segLen < bayLen) continue;
      const n = Math.max(1, Math.floor(segLen / spacing));

      const sides: number[] = [];
      if (seg.parkingRight) sides.push(1);
      if (seg.parkingLeft) sides.push(-1);

      for (const side of sides) {
        for (let i = 0; i < n; i++) {
          const along = lerp2D(seg.p1, seg.p2, (i + 0.5) / n);
          const center = add(along, scale(perp, laneCenter * side));
          ctx.save();
          ctx.translate(center.x, center.y);
          ctx.rotate(rot);
          ctx.beginPath();
          ctx.textBaseline = 'middle';
          ctx.textAlign = 'center';
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.font = 'bold ' + PARKING_LANE_WIDTH_PX * 0.8 + 'px Arial';
          ctx.fillText('P', 0, 0);
          ctx.restore();
        }
      }
    }
  }

  #drawSimpleLaneMarkings(
    ctx: CanvasRenderingContext2D,
    seg: Segment,
    laneCount: number,
  ): void {
    // Single-lane roads have no center line to draw.
    if (laneCount <= 1) {
      return;
    }

    if (seg.oneWay) {
      // For 2+ lane one-way roads, draw a dashed center divider between lanes
      if (laneCount >= 2) {
        drawSegment(ctx, seg, { color: 'white', width: 3, dash: [10, 20] });
      }
    } else if (seg.separated) {
      drawSegment(ctx, seg, { color: 'white', width: 4 });
    } else {
      drawSegment(ctx, seg, { color: 'white', width: 4, dash: [15, 25] });
    }
  }

  #drawMultiLaneDividers(
    ctx: CanvasRenderingContext2D,
    seg: Segment,
    laneCount: number,
    roadWidth: number,
  ): void {
    const dir = seg.directionVector();
    const perpDir = normalize(new Point(-dir.y, dir.x));
    const laneWidth = roadWidth / laneCount;

    for (let i = 0; i < laneCount - 1; i++) {
      const offset = (i + 1 - laneCount / 2) * laneWidth;
      if (Math.abs(offset) >= roadWidth / 2 - 1) continue;
      const distFromCenter = Math.abs(offset);
      const isCenterDivider = distFromCenter < laneWidth * 0.6;
      const p1 = add(seg.p1, scale(perpDir, offset));
      const p2 = add(seg.p2, scale(perpDir, offset));
      const dividerSeg = new Segment(p1, p2);

      if (seg.oneWay) {
        drawSegment(ctx, dividerSeg, {
          color: 'white',
          width: 2,
          dash: [8, 16],
        });
      } else if (seg.separated && isCenterDivider) {
        drawSegment(ctx, dividerSeg, { color: 'white', width: 4 });
      } else if (isCenterDivider) {
        drawSegment(ctx, dividerSeg, {
          color: 'white',
          width: 4,
          dash: [15, 25],
        });
      } else {
        drawSegment(ctx, dividerSeg, {
          color: 'white',
          width: 2,
          dash: [8, 16],
        });
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
      this.#drawOrderCache = {
        hash: graphHash,
        count: this.envelopes.length,
        envelopes: sortEnvelopesByTier(this.envelopes),
      };
    }
    return this.#drawOrderCache.envelopes;
  }

  /** True if a point lies within the visible rect, expanded by a margin. */
  #pointInView(
    p: Point,
    b: VisibleWorldRect,
    margin: number = WORLD_CULL_MARGIN_PX,
  ): boolean {
    return (
      p.x >= b.minX - margin &&
      p.x <= b.maxX + margin &&
      p.y >= b.minY - margin &&
      p.y <= b.maxY + margin
    );
  }

  /** True if a segment's AABB (plus margin) overlaps the visible rect. */
  #segmentInView(
    seg: Segment,
    b: VisibleWorldRect,
    margin: number = WORLD_CULL_MARGIN_PX,
  ): boolean {
    const minX = Math.min(seg.p1.x, seg.p2.x);
    const maxX = Math.max(seg.p1.x, seg.p2.x);
    const minY = Math.min(seg.p1.y, seg.p2.y);
    const maxY = Math.max(seg.p1.y, seg.p2.y);
    return (
      maxX >= b.minX - margin &&
      minX <= b.maxX + margin &&
      maxY >= b.minY - margin &&
      minY <= b.maxY + margin
    );
  }

  /** True if a polygon's AABB overlaps the visible rect (polygon already
   * includes road width, so no extra margin is needed). */
  #polygonInView(poly: { points: Point[] }, b: VisibleWorldRect): boolean {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of poly.points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    return maxX >= b.minX && minX <= b.maxX && maxY >= b.minY && minY <= b.maxY;
  }

  /**
   * Bridge elevation shadows: a dark, semi-transparent copy of each bridge
   * envelope's polygon, offset slightly to the lower-right, painted
   * between the asphalt fill and the road borders. Uses the tier-sorted
   * envelope order so higher-tier bridges cast over lower-tier roads.
   */
  #drawBridgeShadows(
    ctx: CanvasRenderingContext2D,
    screenBounds?: VisibleWorldRect,
  ): void {
    const SHADOW_DX = 4;
    const SHADOW_DY = 6;
    // Accumulate every bridge envelope's offset polygon into a SINGLE path and
    // fill once. Filling all sub-paths in one `fill()` call means overlapping
    // regions (e.g. where two connected bridge segments meet, including their
    // rounded end-caps) are painted only once — so the shadow stays a uniform
    // 30% black instead of darkening into a circle at the overlap.
    let hasBridge = false;
    ctx.beginPath();
    for (const env of this.#getDrawOrderedEnvelopes()) {
      if (!env.skeleton.bridge) continue;
      if (screenBounds && !this.#polygonInView(env.polygon, screenBounds)) {
        continue;
      }
      hasBridge = true;
      const poly = env.polygon;
      ctx.moveTo(poly.points[0].x + SHADOW_DX, poly.points[0].y + SHADOW_DY);
      for (let i = 1; i < poly.points.length; i++) {
        ctx.lineTo(poly.points[i].x + SHADOW_DX, poly.points[i].y + SHADOW_DY);
      }
      ctx.closePath();
    }
    if (!hasBridge) return;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.strokeStyle = 'transparent';
    ctx.fill();
  }

  /**
   * Bridge deck details: concrete surface overlay, parapet railings,
   * guardrail posts, and expansion joints.
   *
   * Designed to be subtle but readable — gives bridges a distinct
   * "engineered structure" feel without adding visual noise.
   */
  #drawBridgeDetails(
    ctx: CanvasRenderingContext2D,
    screenBounds?: VisibleWorldRect,
  ): void {
    const PARAPET_WIDTH = 6;
    const PARAPET_INSET = 3; // px inset from the road border (white line)
    const GUARDRAIL_INTERVAL = 35; // px spacing between posts
    const GUARDRAIL_POST_LEN = 10; // px length of each post tick
    const JOINT_INTERVAL = 120; // px spacing between expansion joints

    // --- 1. Concrete deck overlay: a subtle light-gray tint so the bridge
    //     reads as concrete rather than asphalt. Accumulate every bridge
    //     envelope into a SINGLE path and fill once — filling all sub-paths
    //     in one `fill()` means the overlapping rounded end-caps of connected
    //     bridge segments are painted only once, so the tint stays uniform
    //     instead of stacking into brighter/darker circles at the joints.
    let hasBridge = false;
    ctx.beginPath();
    for (const env of this.#getDrawOrderedEnvelopes()) {
      if (!env.skeleton.bridge) continue;
      if (screenBounds && !this.#polygonInView(env.polygon, screenBounds)) {
        continue;
      }
      hasBridge = true;
      const poly = env.polygon;
      ctx.moveTo(poly.points[0].x, poly.points[0].y);
      for (let i = 1; i < poly.points.length; i++) {
        ctx.lineTo(poly.points[i].x, poly.points[i].y);
      }
      ctx.closePath();
    }
    if (hasBridge) {
      ctx.fillStyle = 'rgba(210, 210, 200, 0.15)';
      ctx.fill();
    }

    for (const env of this.#getDrawOrderedEnvelopes()) {
      if (screenBounds && !this.#polygonInView(env.polygon, screenBounds)) {
        continue;
      }
      if (!env.skeleton.bridge) continue;

      const seg = env.skeleton;
      const dirVec = seg.directionVector();
      const perp = perpendicular(dirVec);
      const halfWidth = ((seg.lanes ?? 2) * LANE_WIDTH_PX) / 2;
      const segLen = seg.length();
      if (segLen < 1) continue;

      // --- 2. Parapet walls: thick gray lines running along both road
      //     edges, inset slightly from the white road borders.
      const parapetOffset = halfWidth - PARAPET_INSET;
      const leftOffset = scale(perp, parapetOffset);
      const rightOffset = scale(perp, -parapetOffset);

      ctx.strokeStyle = '#888';
      ctx.lineWidth = PARAPET_WIDTH;
      ctx.lineCap = 'round';

      // Left parapet
      ctx.beginPath();
      ctx.moveTo(seg.p1.x + leftOffset.x, seg.p1.y + leftOffset.y);
      ctx.lineTo(seg.p2.x + leftOffset.x, seg.p2.y + leftOffset.y);
      ctx.stroke();

      // Right parapet
      ctx.beginPath();
      ctx.moveTo(seg.p1.x + rightOffset.x, seg.p1.y + rightOffset.y);
      ctx.lineTo(seg.p2.x + rightOffset.x, seg.p2.y + rightOffset.y);
      ctx.stroke();

      // --- 3. Guardrail posts: small perpendicular tick marks at
      //     regular intervals along both edges.
      ctx.strokeStyle = '#999';
      ctx.lineWidth = 2;
      const postCount = Math.max(1, Math.floor(segLen / GUARDRAIL_INTERVAL));
      for (let i = 1; i < postCount; i++) {
        const t = i / postCount;
        const mid = lerp2D(seg.p1, seg.p2, t);

        // Left side — post extends outward from the parapet.
        const leftPost = scale(perp, parapetOffset + GUARDRAIL_POST_LEN);
        ctx.beginPath();
        ctx.moveTo(mid.x + leftOffset.x, mid.y + leftOffset.y);
        ctx.lineTo(mid.x + leftPost.x, mid.y + leftPost.y);
        ctx.stroke();

        // Right side
        const rightPost = scale(perp, -(parapetOffset + GUARDRAIL_POST_LEN));
        ctx.beginPath();
        ctx.moveTo(mid.x + rightOffset.x, mid.y + rightOffset.y);
        ctx.lineTo(mid.x + rightPost.x, mid.y + rightPost.y);
        ctx.stroke();
      }

      // --- 4. Expansion joints: thin dark lines spanning the full road
      //     width at regular intervals, suggesting deck segments.
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
      ctx.lineWidth = 1.5;
      const jointCount = Math.max(1, Math.floor(segLen / JOINT_INTERVAL));
      for (let i = 1; i < jointCount; i++) {
        const t = i / jointCount;
        const mid = lerp2D(seg.p1, seg.p2, t);
        const jointOffset = scale(perp, halfWidth);

        ctx.beginPath();
        ctx.moveTo(mid.x - jointOffset.x, mid.y - jointOffset.y);
        ctx.lineTo(mid.x + jointOffset.x, mid.y + jointOffset.y);
        ctx.stroke();
      }
    }
  }
}
