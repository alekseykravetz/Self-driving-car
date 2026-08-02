import { describe, it, expect } from 'vitest';
import { Graph } from '../../../ts/math/graph/graph.js';
import { Point } from '../../../ts/math/primitives/point.js';
import { Segment } from '../../../ts/math/primitives/segment.js';
import { dot, subtract } from '../../../ts/math/utils.js';
import {
  expandDirectionalMarking,
  STOP_LINE_SETBACK_PX,
} from '../../../ts/world/osmDirectionalMarkings.js';

/**
 * Horizontal road (0,0)->(200,0). A stop/yield node sits at p2=(200,0); its
 * seed direction points UPSTREAM (toward the far endpoint p1), i.e. (-1, 0).
 */
function makeRoad(
  oneWay: boolean,
  lanes: number,
): { graph: Graph; node: Point } {
  const p1 = new Point(0, 0);
  const p2 = new Point(200, 0);
  const seg = new Segment(p1, p2, oneWay, false, { lanes });
  return { graph: new Graph([p1, p2], [seg]), node: p2 };
}

const SEED_DIR = new Point(-1, 0);

describe('expandDirectionalMarking', () => {
  it('one-way 2-lane road → one placement per lane, all same direction', () => {
    const { graph, node } = makeRoad(true, 2);
    const out = expandDirectionalMarking(node, SEED_DIR, graph);
    expect(out.length).toBe(2);
    for (const p of out) {
      // Emitted facing is flipped 180° from the seed travel direction.
      expect(dot(p.directionVector, SEED_DIR)).toBeLessThan(0);
    }
  });

  it('two-way 2-lane road → only the entering lane', () => {
    const { graph, node } = makeRoad(false, 2);
    const out = expandDirectionalMarking(node, SEED_DIR, graph);
    expect(out.length).toBe(1);
    expect(dot(out[0].directionVector, SEED_DIR)).toBeLessThan(0);
  });

  it('two-way 4-lane road → half the lanes', () => {
    const { graph, node } = makeRoad(false, 4);
    const out = expandDirectionalMarking(node, SEED_DIR, graph);
    expect(out.length).toBe(2);
    for (const p of out) {
      expect(dot(p.directionVector, SEED_DIR)).toBeLessThan(0);
    }
  });

  it('every returned direction matches the seed orientation', () => {
    const { graph, node } = makeRoad(true, 3);
    const out = expandDirectionalMarking(node, SEED_DIR, graph);
    for (const p of out) {
      expect(dot(p.directionVector, SEED_DIR)).toBeLessThan(0);
    }
  });

  it('places centres at distinct lane centres (lateral spread)', () => {
    const { graph, node } = makeRoad(true, 2);
    const out = expandDirectionalMarking(node, SEED_DIR, graph);
    const ys = out.map((p) => p.center.y).sort((a, b) => a - b);
    expect(ys.length).toBe(2);
    expect(ys[0]).toBeCloseTo(-25);
    expect(ys[1]).toBeCloseTo(25);
  });

  it('setback moves centres upstream (against the travel direction)', () => {
    const { graph, node } = makeRoad(false, 2);
    const base = expandDirectionalMarking(node, SEED_DIR, graph, 0);
    const shifted = expandDirectionalMarking(node, SEED_DIR, graph, 10);
    // Seed (travel) is (-1, 0); upstream (against travel) is +x, so x increases.
    expect(shifted[0].center.x).toBeCloseTo(base[0].center.x + 10);
    expect(shifted[0].center.y).toBeCloseTo(base[0].center.y);
  });

  it('falls back to the single seed placement for an orphan node', () => {
    const { graph } = makeRoad(false, 2);
    const orphan = new Point(500, 500);
    const out = expandDirectionalMarking(orphan, SEED_DIR, graph);
    expect(out.length).toBe(1);
    expect(out[0].center).toBe(orphan);
    // Facing is flipped 180° from the seed.
    expect(out[0].directionVector.x).toBeCloseTo(-SEED_DIR.x);
    expect(out[0].directionVector.y).toBeCloseTo(-SEED_DIR.y);
  });

  it('default setback constant is 0', () => {
    expect(STOP_LINE_SETBACK_PX).toBe(0);
  });

  it('one-way approach still expands to every lane when the seed points downstream', () => {
    // One-way lane guides all share one direction. Regression: the two-way
    // "aligned lane" filter would reject them all and fall back to the node
    // centre (marking in the middle of the road). One-way roads must keep all
    // lanes at their distinct lane centres.
    const { graph, node } = makeRoad(true, 2);
    const downstream = new Point(1, 0); // opposite to the guide direction
    const out = expandDirectionalMarking(node, downstream, graph);
    expect(out.length).toBe(2);
    const ys = out.map((p) => p.center.y).sort((a, b) => a - b);
    expect(ys[0]).toBeCloseTo(-25);
    expect(ys[1]).toBeCloseTo(25);
    // Not collapsed onto the node centre.
    for (const p of out) expect(p.center.y).not.toBeCloseTo(0);
  });

  it('picks the collinear approach segment at a bend, not a cross street', () => {
    // Node where the approach road (horizontal) bends into a vertical road.
    // Regression: the old node→far heuristic rejected the approach segment and
    // fell back to the node centre; axis-collinearity must pick the approach.
    const a = new Point(-100, 0);
    const n = new Point(0, 0);
    const b = new Point(0, 100);
    const approach = new Segment(a, n, false, false, { lanes: 2 }); // horizontal
    const cross = new Segment(n, b, false, false, { lanes: 2 }); // vertical
    const graph = new Graph([a, n, b], [approach, cross]);
    const seed = new Point(1, 0); // travel along the horizontal approach

    const out = expandDirectionalMarking(n, seed, graph);
    expect(out.length).toBe(1);
    // On a lane of the horizontal approach (y offset), not the node centre.
    expect(out[0].center.x).toBeCloseTo(0);
    expect(Math.abs(out[0].center.y)).toBeCloseTo(25);
  });

  it('every placement faces 180° from the seed travel direction', () => {
    for (const [oneWay, lanes] of [
      [false, 2],
      [true, 2],
      [false, 4],
    ] as [boolean, number][]) {
      const { graph, node } = makeRoad(oneWay, lanes);
      for (const p of expandDirectionalMarking(node, SEED_DIR, graph)) {
        expect(p.directionVector.x).toBeCloseTo(-SEED_DIR.x);
        expect(p.directionVector.y).toBeCloseTo(-SEED_DIR.y);
      }
    }
  });

  it('places the two-way marking on the driver’s right (right-hand traffic)', () => {
    // Horizontal road, node at p2=(200,0), seed travel = (-1,0) (west). The
    // driver’s right is (0,-1) (north / negative y), so the approach lane centre
    // must have a negative y offset.
    const { graph, node } = makeRoad(false, 2);
    const out = expandDirectionalMarking(node, SEED_DIR, graph);
    expect(out.length).toBe(1);
    const right = new Point(-SEED_DIR.y, SEED_DIR.x);
    const side = dot(subtract(out[0].center, node), right);
    expect(side).toBeGreaterThan(0); // on the driver’s right
  });
});
