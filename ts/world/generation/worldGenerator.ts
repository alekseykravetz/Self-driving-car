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
import { Polygon } from '../../math/primitives/polygon.js';
import { Building } from '../items/building.js';
import { Tree, TreePrototype, buildTreePrototypes } from '../items/tree.js';
import { Marking } from '../markings/marking.js';
import { Corridor } from '../corridor.js';
import { add, scale, lerp, distance, mulberry32 } from '../../math/utils.js';
import { LANE_WIDTH_PX } from '../../math/worldUnits.js';

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

/** Center-line lane guides for marking placement.
 *
 * Each graph segment contributes its center line as a single lane guide.
 * This produces a guide at the road center for every lane count, which is
 * ideal for road-spanning markings (stop lines, crossings, lights, etc.)
 * that snap at the road center.
 *
 * Previously this used half-width envelope unions, which placed guides at
 * ±quarter-road-width — only correct for 2-lane roads. The center-line
 * approach is correct for all lane counts (1, 2, 3, 4, ...).
 *
 * One-way direction is inherent in the graph segment's directionVector
 * (p1→p2), so no post-processing is needed.
 */
function wgGenerateLaneGuides(graph: Graph): Segment[] {
  return graph.segments.map((seg) => new Segment(seg.p1, seg.p2));
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

function wgGenerateBuildings(world: WorldGeneratable): Building[] {
  const tempEnvelopes: Envelope[] = [];
  for (const seg of world.graph.segments) {
    const segWidth = getSegmentRoadWidth(seg);
    tempEnvelopes.push(
      new Envelope(
        seg,
        segWidth + world.buildingWidth + world.spacing * 2,
        world.roadRoundness,
      ),
    );
  }

  const guides = Polygon.union(tempEnvelopes.map((e) => e.polygon));

  for (let i = 0; i < guides.length; i++) {
    const seg = guides[i];
    if (seg.length() < world.buildingMinLength) {
      guides.splice(i, 1);
      i--;
    }
  }

  const supports: Segment[] = [];
  for (const seg of guides) {
    const length = seg.length() + world.spacing;
    const buildingCount = Math.floor(
      length / (world.buildingMinLength + world.spacing),
    );
    const buildingLength = length / buildingCount - world.spacing;

    const direction = seg.directionVector();

    let q1 = seg.p1;
    let q2 = add(q1, scale(direction, buildingLength));
    supports.push(new Segment(q1, q2));

    for (let i = 2; i <= buildingCount; i++) {
      q1 = add(q2, scale(direction, world.spacing));
      q2 = add(q1, scale(direction, buildingLength));
      supports.push(new Segment(q1, q2));
    }
  }

  const bases: Polygon[] = [];
  for (const seg of supports) {
    bases.push(new Envelope(seg, world.buildingWidth).polygon);
  }

  const epsilon = 0.001;
  for (let i = 0; i < bases.length - 1; i++) {
    for (let j = i + 1; j < bases.length; j++) {
      if (
        bases[i].intersectsPolygon(bases[j]) ||
        bases[i].distanceToPolygon(bases[j]) < world.spacing - epsilon
      ) {
        bases.splice(j, 1);
        j--;
      }
    }
  }
  return bases.map((b) => new Building(b));
}

function wgGenerateTrees(world: WorldGeneratable): Tree[] {
  const points = [
    ...world.roadBorders.map((s) => [s.p1, s.p2]).flat(),
    ...world.buildings.map((b) => b.base.points).flat(),
  ];
  if (points.length === 0) return [];

  const left = Math.min(...points.map((p) => p.x));
  const right = Math.max(...points.map((p) => p.x));
  const top = Math.min(...points.map((p) => p.y));
  const bottom = Math.max(...points.map((p) => p.y));

  const illegalPolygons = [
    ...world.buildings.map((b) => b.base),
    ...world.envelopes.map((e) => e.polygon),
  ];

  // Reproducible prototype set + a seeded RNG so instance variants/scales/types
  // are deterministic for a given world seed.
  const prototypes = world.treePrototypes;
  const rand = mulberry32((world.treeSeed ^ 0x9e3779b9) >>> 0);

  const trees: Tree[] = [];
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
        poly.distanceToPoint(p) < world.treeSize / 2
      ) {
        keep = false;
        break;
      }
    }

    // check if tree too close to other trees
    if (keep) {
      for (const tree of trees) {
        if (distance(tree.center, p) < world.treeSize) {
          keep = false;
          break;
        }
      }
    }

    // avoiding trees in the middle of nowhere
    if (keep) {
      let closeToSomething = false;
      for (const poly of illegalPolygons) {
        if (poly.distanceToPoint(p) < world.treeSize * 2) {
          closeToSomething = true;
          break;
        }
      }
      keep = closeToSomething;
    }

    if (keep) {
      const protoIndex = Math.floor(rand() * prototypes.length);
      const type = wgPickTreeType(rand());
      const scale = lerp(0.8, 1.2, rand());
      trees.push(
        new Tree(
          p,
          world.treeSize,
          prototypes[protoIndex],
          protoIndex,
          type,
          scale,
        ),
      );
      tryCount = 0;
    }
    tryCount++;
  }
  return trees;
}

/** Weighted tree-type pick: mostly classic, with some conifers and clusters. */
function wgPickTreeType(r: number): number {
  if (r < 0.6) return 0;
  if (r < 0.8) return 1;
  return 2;
}

export class WorldGenerator {
  /**
   * Cheap, deterministic road geometry: envelopes, road borders, lane guides
   * and separator borders. Safe to run on every graph edit.
   */
  static generateRoads(world: WorldGeneratable): void {
    world.envelopes.length = 0;
    world.laneGuides.length = 0;
    world.roadBorders.length = 0;
    world.separatorBorders.length = 0;

    for (const segment of world.graph.segments) {
      world.envelopes.push(
        new Envelope(
          segment,
          getSegmentRoadWidth(segment),
          world.roadRoundness,
        ),
      );
    }

    const roadPolygons = world.envelopes.map((envelope) => envelope.polygon);
    world.roadBorders.push(...Polygon.union(roadPolygons));
    world.laneGuides.push(...wgGenerateLaneGuides(world.graph));
    world.separatorBorders.push(...wgGenerateSeparatorBorders(world.graph));
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
}
