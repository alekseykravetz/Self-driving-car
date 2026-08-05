/**
 * Procedural world geometry generation, extracted from the World class so the
 * World stays a data + draw + load container. All heavy generation lives here.
 *
 * Split-generation policy: road geometry (envelopes, road borders, lane guides,
 * separator borders) is cheap and deterministic, so `generateRoads` runs on
 * every graph edit. Building and tree placement is expensive, so it lives in
 * `generateBuildings` / `generateTrees` and runs only on demand (the editor's
 * "Regenerate items" action). `generate(opts)` is a convenience that runs a
 * chosen subset of stages.
 */

import { Graph } from '../../math/graph/graph.js';
import { Envelope } from '../../math/primitives/envelope.js';
import { Segment } from '../../math/primitives/segment.js';
import { Point } from '../../math/primitives/point.js';
import { Building } from '../items/building.js';
import { Tree, TreePrototype, buildTreePrototypes } from '../items/tree.js';
import { Marking } from '../markings/marking.js';
import { Corridor } from '../corridor.js';
import { add, scale, normalize } from '../../math/utils.js';
import { LANE_WIDTH_PX, PARKING_LANE_WIDTH_PX } from '../../math/worldUnits.js';
import {
  GenerationProgress,
  GenerationProgressCallback,
  drainGenerator,
  runChunkedGenerator,
  yieldToBrowser,
} from './generationProgress.js';
import { remapGen, unionGen } from './chunkedUnion.js';
import {
  wgGenerateBuildings,
  wgGenerateBuildingsGen,
} from './buildingGenerator.js';
import { wgGenerateTrees, wgGenerateTreesGen } from './treeGenerator.js';

export interface WorldGeneratable {
  graph: Graph;
  roadWidth: number;
  roadRoundness: number;
  buildingWidth: number;
  buildingMinLength: number;
  spacing: number;
  treeSize: number;
  treeSeed: number;
  treePrototypeCount: number;
  treePrototypes: TreePrototype[];
  envelopes: Envelope[];
  roadBorders: Segment[];
  separatorBorders: Segment[];
  laneGuides: Segment[];
  buildings: Building[];
  trees: Tree[];
  markings: Marking[];
  corridors: Corridor[];
}

/** Compute road width for a segment based on its lane count. */
function getSegmentRoadWidth(segment: Segment): number {
  return (segment.lanes ?? 2) * LANE_WIDTH_PX;
}

/**
 * Collision/asphalt envelope geometry for a segment, accounting for parking
 * lanes. Parking on a side adds one `PARKING_LANE_WIDTH_PX` to that side. Since
 * the envelope band is symmetric, one-sided parking is represented by widening
 * the band AND shifting it toward the parking side (`lateralOffset`), so the
 * driving lanes stay put and the collision border sits past the parking lane.
 *   - both sides  → width += 2P, offset 0
 *   - right only  → width += P,  offset +P/2 (perpendicular = right of p1→p2)
 *   - left only   → width += P,  offset −P/2
 */
export function getSegmentEnvelopeGeometry(segment: Segment): {
  width: number;
  offset: number;
} {
  const driving = getSegmentRoadWidth(segment);
  const right = segment.parkingRight ? 1 : 0;
  const left = segment.parkingLeft ? 1 : 0;
  const width = driving + (right + left) * PARKING_LANE_WIDTH_PX;
  const offset = ((right - left) * PARKING_LANE_WIDTH_PX) / 2;
  return { width, offset };
}

/** Per-lane guidance lines for marking placement.
 *
 * Generates one guide per lane at the center of each lane. This replaces the
 * old half-width envelope union which only placed guides at ±¼-road-width —
 * correct only for 2-lane roads. Per-lane guides work for all lane counts.
 *
 * Canonical convention: `directionVector()` is the lane's true travel
 * direction — cars face ALONG the guide (via `carAngleFromDirection`).
 *   - One-way roads: ALL lanes point p1→p2 (the traffic flow direction).
 *   - Two-way roads: even-indexed lanes (from the left) point p2→p1,
 *     odd-indexed lanes point p1→p2. This preserves which physical lane
 *     travels which way; only the stored orientation flips.
 */
export function laneGuidesForSegment(segment: Segment): Segment[] {
  const guides: Segment[] = [];
  const laneCount = segment.lanes ?? (segment.oneWay ? 1 : 2);
  const dir = segment.directionVector();
  const perpDir = normalize(new Point(-dir.y, dir.x));
  const laneWidth = LANE_WIDTH_PX;
  const halfRoadWidth = (laneCount * laneWidth) / 2;

  for (let k = 0; k < laneCount; k++) {
    // Lane center offset from road center (leftmost lane = most negative)
    const offset = (k + 0.5) * laneWidth - halfRoadWidth;
    const p1 = add(segment.p1, scale(perpDir, offset));
    const p2 = add(segment.p2, scale(perpDir, offset));

    if (segment.oneWay) {
      // All lanes point p1→p2 (the traffic flow direction).
      guides.push(new Segment(p1, p2));
    } else {
      // Two-way: even k = backward (p2→p1), odd k = forward (p1→p2)
      if (k % 2 === 0) {
        guides.push(new Segment(p2, p1));
      } else {
        guides.push(new Segment(p1, p2));
      }
    }
  }
  return guides;
}

function wgGenerateLaneGuides(graph: Graph): Segment[] {
  const guides: Segment[] = [];
  for (const segment of graph.segments) {
    guides.push(...laneGuidesForSegment(segment));
  }
  return guides;
}

/**
 * Collision lines for two-way roads flagged as hard-separated. Each separated
 * (non-one-way) segment contributes its center line as a wall so cars cannot
 * cross to the opposing side.
 */
function wgGenerateSeparatorBorders(graph: Graph): Segment[] {
  const borders: Segment[] = [];
  for (const segment of graph.segments) {
    if (segment.separated && !segment.oneWay) {
      borders.push(
        new Segment(
          new Point(segment.p1.x, segment.p1.y),
          new Point(segment.p2.x, segment.p2.y),
        ),
      );
    }
  }
  return borders;
}

/**
 * Road geometry as a generator: envelopes, then the (chunked) border union,
 * lane guides and separator borders. Yields a local `[0, 1]` fraction so the
 * async path stays responsive; drained synchronously by
 * {@link WorldGenerator.generateRoads}.
 */
function* wgGenerateRoadsGen(world: WorldGeneratable): Generator<number, void> {
  world.envelopes.length = 0;
  world.laneGuides.length = 0;
  world.roadBorders.length = 0;
  world.separatorBorders.length = 0;

  const segments = world.graph.segments;
  const segTotal = Math.max(segments.length, 1);
  for (let s = 0; s < segments.length; s++) {
    const segment = segments[s];
    const { width, offset } = getSegmentEnvelopeGeometry(segment);
    world.envelopes.push(
      new Envelope(segment, width, world.roadRoundness, undefined, offset),
    );
    // Envelope construction is O(segments); yield periodically so a large map
    // doesn't block the main thread here before the union even starts. The
    // union itself (below) reports the bulk of the [0, 1] road progress.
    if ((s & 255) === 0) yield (0.1 * s) / segTotal;
  }

  const roadPolygons = world.envelopes.map((envelope) => envelope.polygon);
  const borders = yield* remapGen(unionGen(roadPolygons), 0.1, 1);
  world.roadBorders.push(...borders);
  world.laneGuides.push(...wgGenerateLaneGuides(world.graph));
  world.separatorBorders.push(...wgGenerateSeparatorBorders(world.graph));
}

export class WorldGenerator {
  /**
   * Cheap, deterministic road geometry: envelopes, road borders, lane guides
   * and separator borders. Safe to run on every graph edit.
   */
  static generateRoads(world: WorldGeneratable): void {
    drainGenerator(wgGenerateRoadsGen(world));
  }

  /** Expensive building placement (O(n²) footprint collision filter). */
  static generateBuildings(world: WorldGeneratable): void {
    world.buildings = wgGenerateBuildings(world);
  }

  /**
   * Expensive tree placement (rejection sampling). Ensures the world's tree
   * prototype set exists first, then assigns each instance a prototype/type/scale.
   */
  static generateTrees(world: WorldGeneratable): void {
    if (world.treePrototypes.length !== world.treePrototypeCount) {
      world.treePrototypes = buildTreePrototypes(
        world.treeSeed,
        world.treePrototypeCount,
      );
    }
    world.trees = wgGenerateTrees(world);
  }

  /** Re-anchors markings to the (possibly edited) graph. */
  static reanchorMarkings(world: WorldGeneratable): void {
    for (const marking of world.markings) {
      marking.reanchor(world.graph);
    }
  }

  /**
   * Builds a single dynamic corridor from `start` to `end` and makes it the
   * world's only corridor. Used by the race game and training simulator to
   * constrain cars to a computed path.
   */
  static generateCorridor(
    world: WorldGeneratable,
    start: Point,
    end: Point,
    extendEnd: boolean = false,
  ): void {
    const path = world.graph.getShortestPath(start, end);
    const corridor = Corridor.fromPath(
      path,
      world.roadWidth,
      world.roadRoundness,
      { extendEnd },
    );
    world.corridors = [corridor];
  }

  /**
   * Convenience generator. By default runs every stage; pass `opts` to run only
   * a subset (e.g. `{ roads: true }` for a cheap refresh). Markings are always
   * re-anchored afterwards.
   */
  static generate(
    world: WorldGeneratable,
    opts: { roads?: boolean; buildings?: boolean; trees?: boolean } = {},
  ): void {
    const { roads = true, buildings = true, trees = true } = opts;
    if (roads) this.generateRoads(world);
    if (buildings) this.generateBuildings(world);
    if (trees) this.generateTrees(world);
    this.reanchorMarkings(world);
  }

  /**
   * Cooperative, time-sliced version of {@link generate}. Runs the same stages
   * but yields to the browser between chunks so the main thread never blocks
   * long enough to freeze the tab, reporting progress via `onProgress`. Used by
   * the world editor for large OSM imports and the "Regenerate items" action.
   */
  static async generateAsync(
    world: WorldGeneratable,
    opts: {
      roads?: boolean;
      buildings?: boolean;
      trees?: boolean;
      onProgress?: GenerationProgressCallback;
    } = {},
  ): Promise<void> {
    const { roads = true, buildings = true, trees = true, onProgress } = opts;

    // Split the [0, 1] progress range evenly across the active stages.
    const stages: GenerationProgress['stage'][] = [];
    if (roads) stages.push('roads');
    if (buildings) stages.push('buildings');
    if (trees) stages.push('trees');
    const bandCount = stages.length || 1;

    const report = (
      stage: GenerationProgress['stage'],
      label: string,
      local: number,
    ): void => {
      if (!onProgress) return;
      const idx = stages.indexOf(stage);
      const start = idx / bandCount;
      const clamped = Math.max(0, Math.min(1, local));
      onProgress({ stage, label, fraction: start + clamped / bandCount });
    };

    if (roads) {
      report('roads', 'Generating road geometry…', 0);
      await yieldToBrowser();
      await runChunkedGenerator(wgGenerateRoadsGen(world), (f) =>
        report('roads', 'Generating road geometry…', f),
      );
    }

    if (buildings) {
      report('buildings', 'Placing buildings…', 0);
      await yieldToBrowser();
      world.buildings = await runChunkedGenerator(
        wgGenerateBuildingsGen(world),
        (f) => report('buildings', 'Placing buildings…', f),
      );
    }

    if (trees) {
      report('trees', 'Planting trees…', 0);
      await yieldToBrowser();
      if (world.treePrototypes.length !== world.treePrototypeCount) {
        world.treePrototypes = buildTreePrototypes(
          world.treeSeed,
          world.treePrototypeCount,
        );
      }
      world.trees = await runChunkedGenerator(wgGenerateTreesGen(world), (f) =>
        report('trees', 'Planting trees…', f),
      );
    }

    this.reanchorMarkings(world);
    onProgress?.({
      stage: stages[stages.length - 1] ?? 'trees',
      label: 'Done',
      fraction: 1,
    });
  }
}
