/**
 * Tree placement, extracted from world generation. Rejection-samples candidate
 * points, rejecting those inside/near buildings & road envelopes or too close
 * to other trees, using a spatial grid so large maps stay responsive.
 */
import { Point } from '../../math/primitives/point.js';
import { Envelope } from '../../math/primitives/envelope.js';
import { Segment } from '../../math/primitives/segment.js';
import { Building } from '../items/building.js';
import { Tree, TreePrototype } from '../items/tree.js';
import { lerp, distance, mulberry32 } from '../../math/utils.js';
import { drainGenerator } from './generationProgress.js';
import { OwnerGrid } from './ownerGrid.js';

interface TreeGeneratable {
  roadBorders: Segment[];
  buildings: Building[];
  envelopes: Envelope[];
  treeSize: number;
  treePrototypes: TreePrototype[];
  treeSeed: number;
}

/**
 * Tree placement as a generator that yields a local `[0, 1]` progress fraction
 * during the rejection-sampling loop, so the async generator can time-slice it.
 * The tree count is not known ahead of time, so progress is an asymptotic
 * estimate over iterations (never reaching 1 until the loop ends). Drained
 * synchronously by {@link wgGenerateTrees}.
 */
export function* wgGenerateTreesGen(
  world: TreeGeneratable,
): Generator<number, Tree[]> {
  const points = [
    ...world.roadBorders.map((s) => [s.p1, s.p2]).flat(),
    ...world.buildings.map((b) => b.base.points).flat(),
  ];
  if (points.length === 0) return [];

  // Compute bounds with a loop, not `Math.min(...points)` — spreading a
  // whole-city point set (hundreds of thousands of points) as function
  // arguments overflows the call stack.
  let left = Infinity;
  let right = -Infinity;
  let top = Infinity;
  let bottom = -Infinity;
  for (const p of points) {
    if (p.x < left) left = p.x;
    if (p.x > right) right = p.x;
    if (p.y < top) top = p.y;
    if (p.y > bottom) bottom = p.y;
  }

  const illegalPolygons = [
    ...world.buildings.map((b) => b.base),
    ...world.envelopes.map((e) => e.polygon),
  ];

  // Spatial index over illegal-polygon edges so each candidate only tests the
  // handful of polygons near it. Query radius is treeSize*2 (the widest check
  // below), so the cell size is sized to keep that query to a small neighbourhood.
  const queryRadius = world.treeSize * 2;
  const polyGrid = new OwnerGrid(Math.max(world.treeSize, 1));
  for (let pi = 0; pi < illegalPolygons.length; pi++) {
    for (const s of illegalPolygons[pi].segments) {
      polyGrid.insertBounds(
        Math.min(s.p1.x, s.p2.x),
        Math.min(s.p1.y, s.p2.y),
        Math.max(s.p1.x, s.p2.x),
        Math.max(s.p1.y, s.p2.y),
        pi,
      );
    }
  }

  // Separate index for placed trees so the too-close check stays near-O(1)
  // instead of scanning every previously placed tree.
  const treeGrid = new OwnerGrid(Math.max(world.treeSize, 1));

  // Reproducible prototype set + a seeded RNG so instance variants/scales/types
  // are deterministic for a given world seed.
  const prototypes = world.treePrototypes;
  const rand = mulberry32((world.treeSeed ^ 0x9e3779b9) >>> 0);

  const trees: Tree[] = [];
  let tryCount = 0;
  let iterations = 0;
  while (tryCount < 100) {
    const p = new Point(
      lerp(left, right, Math.random()),
      lerp(bottom, top, Math.random()),
    );

    // Only polygons with an edge within treeSize*2 of the candidate can affect
    // any of the checks below (inside/near/close), so gather them once.
    const nearbyPolys = polyGrid.query(p.x, p.y, queryRadius);

    // check if tree inside or nearby building / road
    let keep = true;
    for (const pi of nearbyPolys) {
      const poly = illegalPolygons[pi];
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
      const nearbyTrees = treeGrid.query(p.x, p.y, world.treeSize);
      for (const ti of nearbyTrees) {
        if (distance(trees[ti].center, p) < world.treeSize) {
          keep = false;
          break;
        }
      }
    }

    // avoiding trees in the middle of nowhere
    if (keep) {
      let closeToSomething = false;
      for (const pi of nearbyPolys) {
        if (illegalPolygons[pi].distanceToPoint(p) < world.treeSize * 2) {
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
      treeGrid.insertPoint(p.x, p.y, trees.length);
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
    // Progress is indeterminate (final tree count is unknown), so advance the
    // bar asymptotically toward 1 based on total iterations.
    if ((++iterations & 511) === 0) {
      yield 1 - 1 / (1 + iterations / 20000);
    }
  }
  return trees;
}

/**
 * Tree placement (rejection sampling). Ensures the caller has already built the
 * world's tree prototype set. Drains {@link wgGenerateTreesGen}.
 */
export function wgGenerateTrees(world: TreeGeneratable): Tree[] {
  return drainGenerator(wgGenerateTreesGen(world));
}

/** Weighted tree-type pick: mostly classic, with some conifers and clusters. */
function wgPickTreeType(r: number): number {
  if (r < 0.6) return 0;
  if (r < 0.8) return 1;
  return 2;
}
