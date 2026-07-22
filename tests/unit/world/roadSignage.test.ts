import { describe, it, expect } from 'vitest';
import { Point } from '../../../ts/math/primitives/point.js';
import { Segment } from '../../../ts/math/primitives/segment.js';
import { Graph } from '../../../ts/math/graph/graph.js';
import {
  computeSpeedSignPlacements,
  computeStreetLabelPlacements,
  LABEL_SIGN_AVOID_RADIUS_PX,
  SPEED_SIGN_NODE_OFFSET_PX,
} from '../../../ts/world/roadSignage.js';

/** Builds a segment with OSM metadata between two shared points. */
function namedSeg(
  p1: Point,
  p2: Point,
  metadata?: { name?: string; maxSpeed?: number },
): Segment {
  return new Segment(p1, p2, false, false, metadata);
}

describe('computeStreetLabelPlacements', () => {
  it('distributes 2 labels evenly along a 2400px 3-segment street', () => {
    const p1 = new Point(0, 0);
    const p2 = new Point(800, 0);
    const p3 = new Point(1600, 0);
    const p4 = new Point(2400, 0);
    const segments = [
      namedSeg(p1, p2, { name: 'Main St' }),
      namedSeg(p2, p3, { name: 'Main St' }),
      namedSeg(p3, p4, { name: 'Main St' }),
    ];

    const labels = computeStreetLabelPlacements(segments, { spacing: 1000 });

    expect(labels).toHaveLength(2);
    const xs = labels.map((l) => l.x).sort((a, b) => a - b);
    expect(xs[0]).toBeCloseTo(600, 5);
    expect(xs[1]).toBeCloseTo(1800, 5);
    for (const label of labels) {
      expect(label.name).toBe('Main St');
      expect(label.y).toBeCloseTo(0, 5);
    }
  });

  it('places exactly 1 label at the midpoint of a 400px street', () => {
    const p1 = new Point(0, 0);
    const p2 = new Point(400, 0);
    const segments = [namedSeg(p1, p2, { name: 'Short Ave' })];

    const labels = computeStreetLabelPlacements(segments, { spacing: 1000 });

    expect(labels).toHaveLength(1);
    expect(labels[0].x).toBeCloseTo(200, 5);
    expect(labels[0].y).toBeCloseTo(0, 5);
    expect(labels[0].name).toBe('Short Ave');
  });

  it('returns zero labels for unnamed segments', () => {
    const p1 = new Point(0, 0);
    const p2 = new Point(1000, 0);
    const segments = [namedSeg(p1, p2)];

    expect(computeStreetLabelPlacements(segments)).toHaveLength(0);
  });

  it('labels each disconnected same-name component separately', () => {
    const a1 = new Point(0, 0);
    const a2 = new Point(400, 0);
    const b1 = new Point(0, 500);
    const b2 = new Point(400, 500);
    const segments = [
      namedSeg(a1, a2, { name: 'Main St' }),
      namedSeg(b1, b2, { name: 'Main St' }),
    ];

    const labels = computeStreetLabelPlacements(segments, { spacing: 1000 });

    expect(labels).toHaveLength(2);
    const byY = [...labels].sort((a, b) => a.y - b.y);
    expect(byY[0].x).toBeCloseTo(200, 5);
    expect(byY[0].y).toBeCloseTo(0, 5);
    expect(byY[1].x).toBeCloseTo(200, 5);
    expect(byY[1].y).toBeCloseTo(500, 5);
  });

  it('normalizes the angle of a right-to-left street so text stays upright', () => {
    const p1 = new Point(400, 0);
    const p2 = new Point(0, 0);
    const segments = [namedSeg(p1, p2, { name: 'Reverse Rd' })];

    const labels = computeStreetLabelPlacements(segments, { spacing: 1000 });

    expect(labels).toHaveLength(1);
    expect(labels[0].angle).toBeGreaterThanOrEqual(-Math.PI / 2);
    expect(labels[0].angle).toBeLessThanOrEqual(Math.PI / 2);
    expect(labels[0].angle).toBeCloseTo(0, 5);
  });

  it('shifts a label that lands on a speed sign out of its radius', () => {
    const p1 = new Point(0, 0);
    const p2 = new Point(2000, 0);
    const segments = [namedSeg(p1, p2, { name: 'Main St' })];
    // 2000px street → 2 labels at arc positions 500 and 1500.
    const sign = { x: 500, y: 0 };

    const labels = computeStreetLabelPlacements(segments, { avoid: [sign] });

    expect(labels).toHaveLength(2);
    for (const label of labels) {
      const dist = Math.hypot(label.x - sign.x, label.y - sign.y);
      expect(dist).toBeGreaterThanOrEqual(LABEL_SIGN_AVOID_RADIUS_PX);
    }
    // The first label was nudged along the street, away from the sign.
    const xs = labels.map((l) => l.x).sort((a, b) => a - b);
    expect(xs[0]).toBeGreaterThan(sign.x);
  });

  it('skips a label when both shifted positions still collide with signs', () => {
    const p1 = new Point(0, 0);
    const p2 = new Point(200, 0);
    const segments = [namedSeg(p1, p2, { name: 'Tight Rd' })];
    // 200px street → 1 label at arc position 100; both ±150px retries
    // (clamped to 200 and 0) stay within the avoid radius of these signs.
    const avoid = [
      { x: 150, y: 0 },
      { x: 50, y: 0 },
    ];

    const labels = computeStreetLabelPlacements(segments, { avoid });

    expect(labels).toHaveLength(0);
  });
});

describe('computeSpeedSignPlacements', () => {
  it('places 2 signs 60px into each segment at a limit-change node', () => {
    const p1 = new Point(0, 0);
    const p2 = new Point(300, 0);
    const p3 = new Point(600, 0);
    const graph = new Graph(
      [p1, p2, p3],
      [namedSeg(p1, p2, { maxSpeed: 50 }), namedSeg(p2, p3, { maxSpeed: 30 })],
    );

    const signs = computeSpeedSignPlacements(graph);

    expect(signs).toHaveLength(2);
    const sign50 = signs.find((s) => s.maxSpeed === 50)!;
    const sign30 = signs.find((s) => s.maxSpeed === 30)!;
    expect(sign50.x).toBeCloseTo(300 - SPEED_SIGN_NODE_OFFSET_PX, 5);
    expect(sign50.y).toBeCloseTo(0, 5);
    expect(sign30.x).toBeCloseTo(300 + SPEED_SIGN_NODE_OFFSET_PX, 5);
    expect(sign30.y).toBeCloseTo(0, 5);
  });

  it('places 1 fallback sign on a uniform-limit two-segment road', () => {
    const p1 = new Point(0, 0);
    const p2 = new Point(400, 0);
    const p3 = new Point(600, 0);
    const graph = new Graph(
      [p1, p2, p3],
      [namedSeg(p1, p2, { maxSpeed: 50 }), namedSeg(p2, p3, { maxSpeed: 50 })],
    );

    const signs = computeSpeedSignPlacements(graph);

    // No limit change at p2; the 50-zone never transitions, so exactly one
    // fallback sign at the midpoint of the longest segment (p1–p2, 400px).
    expect(signs).toHaveLength(1);
    expect(signs[0].maxSpeed).toBe(50);
    expect(signs[0].x).toBeCloseTo(200, 5);
    expect(signs[0].y).toBeCloseTo(0, 5);
  });

  it('places 1 fallback sign at the midpoint of an isolated segment', () => {
    const p1 = new Point(0, 0);
    const p2 = new Point(500, 0);
    const graph = new Graph([p1, p2], [namedSeg(p1, p2, { maxSpeed: 50 })]);

    const signs = computeSpeedSignPlacements(graph);

    expect(signs).toHaveLength(1);
    expect(signs[0].maxSpeed).toBe(50);
    expect(signs[0].x).toBeCloseTo(250, 5);
    expect(signs[0].y).toBeCloseTo(0, 5);
  });

  it('places 1 sign where a limited road meets an unlimited one, no fallback', () => {
    const p1 = new Point(0, 0);
    const p2 = new Point(300, 0);
    const p3 = new Point(600, 0);
    const graph = new Graph(
      [p1, p2, p3],
      [namedSeg(p1, p2, { maxSpeed: 50 }), namedSeg(p2, p3)],
    );

    const signs = computeSpeedSignPlacements(graph);

    // The 50-segment touches a different (undefined) limit at p2, so it gets
    // a change-node sign and the zone needs no fallback sign.
    expect(signs).toHaveLength(1);
    expect(signs[0].maxSpeed).toBe(50);
    expect(signs[0].x).toBeCloseTo(300 - SPEED_SIGN_NODE_OFFSET_PX, 5);
    expect(signs[0].y).toBeCloseTo(0, 5);
  });
});
