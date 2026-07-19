import { describe, it, expect } from 'vitest';
import { Point } from '../../../../ts/math/primitives/point.js';
import { Segment } from '../../../../ts/math/primitives/segment.js';
import { Polygon } from '../../../../ts/math/primitives/polygon.js';

function makeSquare(x: number, y: number, size: number): Polygon {
  return new Polygon([
    new Point(x, y),
    new Point(x + size, y),
    new Point(x + size, y + size),
    new Point(x, y + size),
  ]);
}

describe('Polygon', () => {
  it('creates a polygon from points', () => {
    const poly = makeSquare(0, 0, 10);
    expect(poly.points).toHaveLength(4);
    expect(poly.segments).toHaveLength(4);
  });

  it('creates a triangle polygon', () => {
    const poly = new Polygon([
      new Point(0, 0),
      new Point(10, 0),
      new Point(5, 10),
    ]);
    expect(poly.points).toHaveLength(3);
    expect(poly.segments).toHaveLength(3);
  });

  describe('static load', () => {
    it('reconstructs a polygon from plain data', () => {
      const info = new Polygon([
        new Point(1, 2),
        new Point(3, 4),
        new Point(5, 6),
      ]);
      const loaded = Polygon.load(info);
      expect(loaded.points).toHaveLength(3);
      expect(loaded.points[0].x).toBe(1);
      expect(loaded.points[1].y).toBe(4);
      expect(loaded.segments).toHaveLength(3);
    });
  });

  describe('distanceToPoint', () => {
    const poly = makeSquare(0, 0, 10);

    it('returns distance to nearest edge for point inside', () => {
      const d = poly.distanceToPoint(new Point(5, 5));
      expect(d).toBeGreaterThan(0);
      expect(d).toBeCloseTo(5);
    });

    it('returns positive distance for a point outside', () => {
      const dist = poly.distanceToPoint(new Point(20, 5));
      expect(dist).toBeGreaterThan(0);
    });
  });

  describe('distanceToPolygon', () => {
    it('returns edge-to-edge distance for overlapping polygons', () => {
      const a = makeSquare(0, 0, 10);
      const b = makeSquare(5, 5, 10);
      expect(a.distanceToPolygon(b)).toBeCloseTo(5);
    });

    it('returns positive distance for separated polygons', () => {
      const a = makeSquare(0, 0, 10);
      const b = makeSquare(20, 20, 10);
      expect(a.distanceToPolygon(b)).toBeGreaterThan(0);
    });
  });

  describe('intersectsPolygon', () => {
    it('returns true for overlapping polygons', () => {
      const a = makeSquare(0, 0, 10);
      const b = makeSquare(5, 5, 10);
      expect(a.intersectsPolygon(b)).toBe(true);
    });

    it('returns false for separated polygons', () => {
      const a = makeSquare(0, 0, 10);
      const b = makeSquare(20, 20, 10);
      expect(a.intersectsPolygon(b)).toBe(false);
    });
  });

  describe('containsPoint', () => {
    const poly = makeSquare(0, 0, 10);

    it('returns false for a point clearly outside', () => {
      expect(poly.containsPoint(new Point(15, 5))).toBe(false);
    });

    it('returns false for a point below and left of origin', () => {
      expect(poly.containsPoint(new Point(-5, -5))).toBe(false);
    });
  });

  describe('containsPolygon', () => {
    const outer = makeSquare(0, 0, 20);

    it('returns false when other polygon is outside', () => {
      const other = makeSquare(25, 25, 10);
      expect(outer.containsPolygon(other)).toBe(false);
    });
  });

  describe('containsSegment', () => {
    const poly = makeSquare(0, 0, 10);

    it('returns false when segment is entirely outside', () => {
      const seg = new Segment(new Point(12, 12), new Point(18, 18));
      expect(poly.containsSegment(seg)).toBe(false);
    });
  });

  describe('static break', () => {
    it('splits segments at intersection points', () => {
      const a = new Polygon([
        new Point(0, 0),
        new Point(10, 0),
        new Point(10, 10),
        new Point(0, 10),
      ]);
      const b = new Polygon([new Point(5, -5), new Point(5, 15)]);
      Polygon.break(a, b);
      expect(a.segments.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('static multiBreak', () => {
    it('breaks all polygon pairs', () => {
      const a = makeSquare(0, 0, 10);
      const b = makeSquare(5, 5, 10);
      Polygon.multiBreak([a, b]);
      expect(a.segments.length).toBeGreaterThan(4);
    });
  });

  describe('static union', () => {
    it('returns segments on the outer boundary', () => {
      const a = makeSquare(0, 0, 10);
      const b = makeSquare(10, 0, 10);
      const segments = Polygon.union([a, b]);
      expect(segments.length).toBeGreaterThan(0);
    });

    it('union of disjoint polygons returns boundary segments', () => {
      const a = makeSquare(0, 0, 10);
      const b = makeSquare(100, 100, 10);
      const segments = Polygon.union([a, b]);
      expect(segments.length).toBeGreaterThan(0);
    });
  });
});

describe('Polygon edge cases', () => {
  it('containsPoint on polygon vertex', () => {
    const poly = makeSquare(0, 0, 10);
    const vertex = new Point(0, 0);
    // Ray-casting through a vertex may count 2 intersections (even → false)
    expect(poly.containsPoint(vertex)).toBe(false);
  });

  it('containsPoint on polygon edge', () => {
    const poly = makeSquare(0, 0, 10);
    const edgeMid = new Point(5, 0);
    expect(poly.containsPoint(edgeMid)).toBe(true);
  });

  it('degenerate triangle (collinear points) does not crash', () => {
    const poly = new Polygon([
      new Point(0, 0),
      new Point(5, 0),
      new Point(10, 0),
    ]);
    expect(poly.points.length).toBe(3);
    expect(poly.segments.length).toBe(3);
    expect(() => poly.containsPoint(new Point(3, 1))).not.toThrow();
  });
});
