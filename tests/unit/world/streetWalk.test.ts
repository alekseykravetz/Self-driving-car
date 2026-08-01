import { describe, it, expect } from 'vitest';
import { Point } from '../../../ts/math/primitives/point.js';
import { Segment } from '../../../ts/math/primitives/segment.js';
import {
  sharesEndpoint,
  buildConnectedComponents,
  orderSegmentWalk,
} from '../../../ts/world/streetWalk.js';

describe('sharesEndpoint', () => {
  it('returns true when a.p1 equals b.p1', () => {
    const p = new Point(0, 0);
    const a = new Segment(p, new Point(10, 0));
    const b = new Segment(p, new Point(0, 10));
    expect(sharesEndpoint(a, b)).toBe(true);
  });

  it('returns true when a.p1 equals b.p2', () => {
    const p = new Point(0, 0);
    const a = new Segment(new Point(10, 0), p);
    const b = new Segment(new Point(0, 10), p);
    expect(sharesEndpoint(a, b)).toBe(true);
  });

  it('returns true when a.p2 equals b.p1', () => {
    const p = new Point(0, 0);
    const a = new Segment(new Point(10, 0), p);
    const b = new Segment(p, new Point(0, 10));
    expect(sharesEndpoint(a, b)).toBe(true);
  });

  it('returns true when a.p2 equals b.p2', () => {
    const p = new Point(0, 0);
    const a = new Segment(new Point(10, 0), p);
    const b = new Segment(new Point(0, 10), p);
    expect(sharesEndpoint(a, b)).toBe(true);
  });

  it('returns false for disjoint segments', () => {
    const a = new Segment(new Point(0, 0), new Point(10, 0));
    const b = new Segment(new Point(20, 0), new Point(30, 0));
    expect(sharesEndpoint(a, b)).toBe(false);
  });
});

describe('buildConnectedComponents', () => {
  it('produces 2 components for two disconnected pairs', () => {
    const a1 = new Point(0, 0);
    const a2 = new Point(10, 0);
    const b1 = new Point(20, 0);
    const b2 = new Point(30, 0);
    const segs = [new Segment(a1, a2), new Segment(b1, b2)];
    const components = buildConnectedComponents(segs);
    expect(components).toHaveLength(2);
    expect(components[0]).toHaveLength(1);
    expect(components[1]).toHaveLength(1);
  });

  it('single segment produces 1 component', () => {
    const seg = new Segment(new Point(0, 0), new Point(10, 0));
    const components = buildConnectedComponents([seg]);
    expect(components).toHaveLength(1);
    expect(components[0]).toHaveLength(1);
  });

  it('connects two segments sharing an endpoint into 1 component', () => {
    const p1 = new Point(0, 0);
    const p2 = new Point(10, 0);
    const p3 = new Point(20, 0);
    const segs = [new Segment(p1, p2), new Segment(p2, p3)];
    const components = buildConnectedComponents(segs);
    expect(components).toHaveLength(1);
    expect(components[0]).toHaveLength(2);
  });

  it('matches a brute-force reference on a mixed graph (membership)', () => {
    // A grid-ish network with a couple of disconnected extras.
    const pt = (x: number, y: number): Point => new Point(x, y);
    const grid: Segment[] = [];
    const nodes: Point[][] = [];
    for (let x = 0; x <= 3; x++) {
      nodes[x] = [];
      for (let y = 0; y <= 3; y++) nodes[x][y] = pt(x * 10, y * 10);
    }
    for (let x = 0; x <= 3; x++) {
      for (let y = 0; y <= 3; y++) {
        if (x < 3) grid.push(new Segment(nodes[x][y], nodes[x + 1][y]));
        if (y < 3) grid.push(new Segment(nodes[x][y], nodes[x][y + 1]));
      }
    }
    // Two disconnected extra edges.
    grid.push(new Segment(pt(100, 100), pt(110, 100)));
    grid.push(new Segment(pt(200, 200), pt(200, 210)));

    // Brute-force connected components via sharesEndpoint (the old semantics).
    const remaining = new Set(grid);
    const refComponents: Set<Segment>[] = [];
    while (remaining.size > 0) {
      const seed = remaining.values().next().value!;
      remaining.delete(seed);
      const comp = new Set([seed]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const seg of [...remaining]) {
          if ([...comp].some((c) => sharesEndpoint(c, seg))) {
            remaining.delete(seg);
            comp.add(seg);
            grew = true;
          }
        }
      }
      refComponents.push(comp);
    }

    const components = buildConnectedComponents(grid);
    // Same component count, and each result component's membership matches a
    // reference component exactly.
    expect(components).toHaveLength(refComponents.length);
    const toKeySet = (segs: Segment[]): string =>
      segs
        .map((s) => `${s.p1.x},${s.p1.y}->${s.p2.x},${s.p2.y}`)
        .sort()
        .join('|');
    const refKeys = new Set(refComponents.map((c) => toKeySet([...c])));
    for (const comp of components) {
      expect(refKeys.has(toKeySet(comp))).toBe(true);
    }
  });
});

describe('orderSegmentWalk', () => {
  it('orients a backward middle segment end-to-start and preserves seg refs', () => {
    // Three collinear segments: A: (0,0)→(10,0), B: (20,0)→(10,0) (backward),
    // C: (20,0)→(30,0). B's p2 touches A's p2 and B's p1 touches C's p1,
    // forming a continuous chain.
    const p0 = new Point(0, 0);
    const p1 = new Point(10, 0);
    const p2 = new Point(20, 0);
    const p3 = new Point(30, 0);
    const segA = new Segment(p0, p1);
    const segB = new Segment(p2, p1);
    const segC = new Segment(p2, p3);

    const walk = orderSegmentWalk([segA, segB, segC]);

    expect(walk).toHaveLength(3);
    // Walk should be oriented end-to-start: first piece starts at free endpoint, last ends at free endpoint.
    // First piece: should start at p0 (free endpoint of segA) and go toward p1.
    expect(walk[0].start).toBe(p0);
    expect(walk[0].end).toBe(p1);
    expect(walk[0].seg).toBe(segA);
    // Second piece: segB was backward (p2→p1), walk should flip to p1→p2.
    expect(walk[1].start).toBe(p1);
    expect(walk[1].end).toBe(p2);
    expect(walk[1].seg).toBe(segB);
    // Third piece: segC oriented forward p2→p3.
    expect(walk[2].start).toBe(p2);
    expect(walk[2].end).toBe(p3);
    expect(walk[2].seg).toBe(segC);
  });

  it('handles a chain of 3 forward segments', () => {
    const p1 = new Point(0, 0);
    const p2 = new Point(10, 0);
    const p3 = new Point(20, 0);
    const p4 = new Point(30, 0);
    const segs = [
      new Segment(p1, p2),
      new Segment(p2, p3),
      new Segment(p3, p4),
    ];
    const walk = orderSegmentWalk(segs);
    expect(walk).toHaveLength(3);
    expect(walk[0].start).toBe(p1);
    expect(walk[0].end).toBe(p2);
    expect(walk[1].start).toBe(p2);
    expect(walk[1].end).toBe(p3);
    expect(walk[2].start).toBe(p3);
    expect(walk[2].end).toBe(p4);
  });
});
