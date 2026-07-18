import { describe, it, expect } from 'vitest';
import { Point } from '../../../ts/math/primitives/point.js';
import {
  nearestEdgeOffset,
  polysIntersect,
} from '../../../ts/math/collision.js';

describe('nearestEdgeOffset', () => {
  const square = [
    new Point(0, 0),
    new Point(10, 0),
    new Point(10, 10),
    new Point(0, 10),
  ];

  it('returns offset for ray intersecting a polygon edge', () => {
    const ray = [new Point(-5, 5), new Point(15, 5)];
    const offset = nearestEdgeOffset(ray, square);
    expect(offset).not.toBeNull();
    expect(offset).toBeGreaterThanOrEqual(0);
    expect(offset).toBeLessThanOrEqual(1);
  });

  it('returns null for ray that misses the polygon', () => {
    const ray = [new Point(-5, -5), new Point(15, -5)];
    const offset = nearestEdgeOffset(ray, square);
    expect(offset).toBeNull();
  });

  it('returns the nearest intersection offset', () => {
    const ray = [new Point(-5, 5), new Point(15, 5)];
    const offset = nearestEdgeOffset(ray, square);
    expect(offset).toBeCloseTo(0.25);
  });

  it('handles degenerate polygon with 1 point', () => {
    const ray = [new Point(0, 0), new Point(10, 0)];
    const result = nearestEdgeOffset(ray, [new Point(5, 5)]);
    expect(result).toBeNull();
  });

  it('handles two-point degenerate polygon', () => {
    const line = [new Point(0, 0), new Point(10, 0)];
    const ray = [new Point(-5, 5), new Point(15, 5)];
    const offset = nearestEdgeOffset(ray, line);
    expect(offset).toBeNull();
  });
});

describe('polysIntersect', () => {
  it('returns true for overlapping polygons', () => {
    const poly1 = [
      new Point(0, 0),
      new Point(10, 0),
      new Point(10, 10),
      new Point(0, 10),
    ];
    const poly2 = [
      new Point(5, 5),
      new Point(15, 5),
      new Point(15, 15),
      new Point(5, 15),
    ];
    expect(polysIntersect(poly1, poly2)).toBe(true);
  });

  it('returns false for non-overlapping polygons', () => {
    const poly1 = [
      new Point(0, 0),
      new Point(10, 0),
      new Point(10, 10),
      new Point(0, 10),
    ];
    const poly2 = [
      new Point(20, 20),
      new Point(30, 20),
      new Point(30, 30),
      new Point(20, 30),
    ];
    expect(polysIntersect(poly1, poly2)).toBe(false);
  });

  it('returns true for touching polygons (shared edges count as intersecting)', () => {
    const poly1 = [
      new Point(0, 0),
      new Point(10, 0),
      new Point(10, 10),
      new Point(0, 10),
    ];
    const poly2 = [
      new Point(10, 0),
      new Point(20, 0),
      new Point(20, 10),
      new Point(10, 10),
    ];
    expect(polysIntersect(poly1, poly2)).toBe(true);
  });

  it('returns false when one polygon fully contains another (no edge intersections)', () => {
    const outer = [
      new Point(0, 0),
      new Point(10, 0),
      new Point(10, 10),
      new Point(0, 10),
    ];
    const inner = [
      new Point(4, 4),
      new Point(6, 4),
      new Point(6, 6),
      new Point(4, 6),
    ];
    expect(polysIntersect(outer, inner)).toBe(false);
  });

  it('handles two-point line segments', () => {
    const line1 = [new Point(0, 0), new Point(10, 0)];
    const line2 = [new Point(5, -5), new Point(5, 5)];
    expect(polysIntersect(line1, line2)).toBe(true);
  });

  it('returns false for two parallel lines', () => {
    const line1 = [new Point(0, 0), new Point(10, 0)];
    const line2 = [new Point(0, 5), new Point(10, 5)];
    expect(polysIntersect(line1, line2)).toBe(false);
  });
});
