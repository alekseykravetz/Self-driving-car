import { describe, it, expect } from 'vitest';
import { Point } from '../../../ts/math/primitives/point.js';
import { Segment } from '../../../ts/math/primitives/segment.js';
import { Graph } from '../../../ts/math/graph/graph.js';
import { computeOneWayArrowPlacements } from '../../../ts/world/oneWayArrows.js';

describe('computeOneWayArrowPlacements', () => {
  it('places 5 arrows along a 1000px one-way segment', () => {
    const p1 = new Point(0, 0);
    const p2 = new Point(1000, 0);
    const seg = new Segment(p1, p2, true);
    const graph = new Graph([p1, p2], [seg]);

    const arrows = computeOneWayArrowPlacements(graph);

    expect(arrows).toHaveLength(5);
    const expectedPositions = [100, 300, 500, 700, 900];
    for (let i = 0; i < 5; i++) {
      expect(arrows[i].x).toBeCloseTo(expectedPositions[i], 5);
      expect(arrows[i].y).toBeCloseTo(0, 5);
    }
    // Direction: p1→p2 = eastward (angle 0)
    expect(arrows[0].angle).toBeCloseTo(0, 9);
  });

  it('places 3 arrows across a 2-segment chain (300px each), one at the junction', () => {
    const p1 = new Point(0, 0);
    const p2 = new Point(300, 0);
    const p3 = new Point(600, 0);
    const segs = [new Segment(p1, p2, true), new Segment(p2, p3, true)];
    const graph = new Graph([p1, p2, p3], segs);

    const arrows = computeOneWayArrowPlacements(graph);

    // chain: 600px, round(600/200) = 3 arrows at 100/300/500
    expect(arrows).toHaveLength(3);
    const xs = arrows.map((a) => a.x).sort((a, b) => a - b);
    expect(xs[0]).toBeCloseTo(100, 5);
    expect(xs[1]).toBeCloseTo(300, 5); // lands at the junction
    expect(xs[2]).toBeCloseTo(500, 5);
  });

  it('returns 0 arrows for a chain shorter than 80px', () => {
    const p1 = new Point(0, 0);
    const p2 = new Point(50, 0);
    const seg = new Segment(p1, p2, true);
    const graph = new Graph([p1, p2], [seg]);

    const arrows = computeOneWayArrowPlacements(graph);
    expect(arrows).toHaveLength(0);
  });

  it('places 2 arrows per component in two disconnected 400px one-way components', () => {
    const a1 = new Point(0, 0);
    const a2 = new Point(400, 0);
    const b1 = new Point(0, 500);
    const b2 = new Point(400, 500);
    const segs = [new Segment(a1, a2, true), new Segment(b1, b2, true)];
    const graph = new Graph([a1, a2, b1, b2], segs);

    const arrows = computeOneWayArrowPlacements(graph);

    // Each 400px chain: round(400/200) = 2 arrows → 4 total
    expect(arrows).toHaveLength(4);
    // Two components each produce arrows at x=100 and x=300.
    // Sort groups all 100s then all 300s.
    const xs = arrows.map((a) => a.x).sort((a, b) => a - b);
    expect(xs[0]).toBeCloseTo(100, 5);
    expect(xs[1]).toBeCloseTo(100, 5);
    expect(xs[2]).toBeCloseTo(300, 5);
    expect(xs[3]).toBeCloseTo(300, 5);
  });

  it('returns 0 arrows for two-way segments', () => {
    const p1 = new Point(0, 0);
    const p2 = new Point(1000, 0);
    const seg = new Segment(p1, p2, false);
    const graph = new Graph([p1, p2], [seg]);

    const arrows = computeOneWayArrowPlacements(graph);
    expect(arrows).toHaveLength(0);
  });

  it('arrows on reversed-connectivity segment point along its own p1→p2 direction', () => {
    // A goes east: (0,0)→(400,0). B is connected backward: B's p2 touches A's p2.
    // B.p1=(400, -400), B.p2=(400, 0) — B goes south→north (p1→p2 = upward).
    const a1 = new Point(0, 0);
    const a2 = new Point(400, 0);
    const b1 = new Point(400, -400);
    const b2 = new Point(400, 0);
    const segA = new Segment(a1, a2, true);
    const segB = new Segment(b1, b2, true);
    const graph = new Graph([a1, a2, b1, b2], [segA, segB]);

    const arrows = computeOneWayArrowPlacements(graph);

    // Total chain: 800px → round(800/200) = 4 arrows
    expect(arrows).toHaveLength(4);
    // Arrows on B should point upward (angle -π/2, since p1→p2 goes south→north)
    const bArrows = arrows.filter((a) => a.x === 400);
    expect(bArrows.length).toBeGreaterThan(0);
    for (const ba of bArrows) {
      // angle = atan2(segB.p2.y - segB.p1.y, segB.p2.x - segB.p1.x)
      // = atan2(0 - (-400), 400 - 400) = atan2(400, 0) ≈ π/2
      expect(ba.angle).toBeCloseTo(Math.PI / 2, 9);
    }
  });

  it('places arrows on a closed-loop triangle of one-way segments', () => {
    const p1 = new Point(0, 0);
    const p2 = new Point(300, 0);
    const p3 = new Point(150, 260);
    const segs = [
      new Segment(p1, p2, true),
      new Segment(p2, p3, true),
      new Segment(p3, p1, true),
    ];
    const graph = new Graph([p1, p2, p3], segs);

    const arrows = computeOneWayArrowPlacements(graph);

    // Total chain ~ 300 + 260 + 260 = ~900px, round(900/200) = 5
    expect(arrows).toHaveLength(5);
    for (const arrow of arrows) {
      expect(typeof arrow.x).toBe('number');
      expect(typeof arrow.y).toBe('number');
      expect(typeof arrow.angle).toBe('number');
    }
  });

  it('vertical segment has angle π/2', () => {
    const p1 = new Point(0, 0);
    const p2 = new Point(0, 500);
    const seg = new Segment(p1, p2, true);
    const graph = new Graph([p1, p2], [seg]);

    const arrows = computeOneWayArrowPlacements(graph);

    expect(arrows.length).toBeGreaterThan(0);
    // atan2(500 - 0, 0 - 0) = atan2(500, 0) ≈ π/2
    expect(arrows[0].angle).toBeCloseTo(Math.PI / 2, 9);
  });
});
