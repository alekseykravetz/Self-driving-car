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
