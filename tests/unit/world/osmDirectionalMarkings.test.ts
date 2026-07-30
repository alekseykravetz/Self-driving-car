import { describe, it, expect } from 'vitest';
import { Graph } from '../../../ts/math/graph/graph.js';
import { Point } from '../../../ts/math/primitives/point.js';
import { Segment } from '../../../ts/math/primitives/segment.js';
import { dot } from '../../../ts/math/utils.js';
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
      expect(dot(p.directionVector, SEED_DIR)).toBeGreaterThan(0);
    }
  });

  it('two-way 2-lane road → only the entering lane', () => {
    const { graph, node } = makeRoad(false, 2);
    const out = expandDirectionalMarking(node, SEED_DIR, graph);
    expect(out.length).toBe(1);
    expect(dot(out[0].directionVector, SEED_DIR)).toBeGreaterThan(0);
  });

  it('two-way 4-lane road → half the lanes', () => {
    const { graph, node } = makeRoad(false, 4);
    const out = expandDirectionalMarking(node, SEED_DIR, graph);
    expect(out.length).toBe(2);
    for (const p of out) {
      expect(dot(p.directionVector, SEED_DIR)).toBeGreaterThan(0);
    }
  });

  it('every returned direction matches the seed orientation', () => {
    const { graph, node } = makeRoad(true, 3);
    const out = expandDirectionalMarking(node, SEED_DIR, graph);
    for (const p of out) {
      expect(dot(p.directionVector, SEED_DIR)).toBeGreaterThan(0);
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

  it('setback moves centres upstream along the seed direction', () => {
    const { graph, node } = makeRoad(false, 2);
    const base = expandDirectionalMarking(node, SEED_DIR, graph, 0);
    const shifted = expandDirectionalMarking(node, SEED_DIR, graph, 10);
    // Seed direction is (-1, 0) so x decreases by 10.
    expect(shifted[0].center.x).toBeCloseTo(base[0].center.x - 10);
    expect(shifted[0].center.y).toBeCloseTo(base[0].center.y);
  });

  it('falls back to the single seed placement for an orphan node', () => {
    const { graph } = makeRoad(false, 2);
    const orphan = new Point(500, 500);
    const out = expandDirectionalMarking(orphan, SEED_DIR, graph);
    expect(out.length).toBe(1);
    expect(out[0].center).toBe(orphan);
    expect(out[0].directionVector).toBe(SEED_DIR);
  });

  it('default setback constant is 0', () => {
    expect(STOP_LINE_SETBACK_PX).toBe(0);
  });
});
