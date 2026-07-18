import { describe, it, expect } from 'vitest';
import { Point } from '../../../../ts/math/primitives/point.js';
import { Segment } from '../../../../ts/math/primitives/segment.js';

describe('Segment', () => {
  const p1 = new Point(0, 0);
  const p2 = new Point(10, 0);

  it('creates a segment with default flags', () => {
    const seg = new Segment(p1, p2);
    expect(seg.p1).toBe(p1);
    expect(seg.p2).toBe(p2);
    expect(seg.oneWay).toBe(false);
    expect(seg.separated).toBe(false);
  });

  it('creates a segment with oneWay flag', () => {
    const seg = new Segment(p1, p2, true);
    expect(seg.oneWay).toBe(true);
  });

  it('creates a segment with separated flag', () => {
    const seg = new Segment(p1, p2, false, true);
    expect(seg.separated).toBe(true);
  });

  describe('length', () => {
    it('returns distance between endpoints', () => {
      const seg = new Segment(new Point(0, 0), new Point(3, 4));
      expect(seg.length()).toBe(5);
    });

    it('returns 0 for a zero-length segment', () => {
      const seg = new Segment(new Point(5, 5), new Point(5, 5));
      expect(seg.length()).toBe(0);
    });
  });

  describe('directionVector', () => {
    it('returns normalized direction from p1 to p2', () => {
      const seg = new Segment(new Point(0, 0), new Point(3, 4));
      const dir = seg.directionVector();
      expect(dir.x).toBeCloseTo(0.6);
      expect(dir.y).toBeCloseTo(0.8);
    });
  });

  describe('equals', () => {
    it('returns true when segments share endpoints', () => {
      const a = new Segment(new Point(0, 0), new Point(10, 10));
      const b = new Segment(new Point(10, 10), new Point(0, 0));
      expect(a.equals(b)).toBe(true);
    });

    it('returns false for different segments', () => {
      const a = new Segment(new Point(0, 0), new Point(10, 10));
      const b = new Segment(new Point(0, 0), new Point(20, 20));
      expect(a.equals(b)).toBe(false);
    });
  });

  describe('includes', () => {
    it('returns true if point is p1', () => {
      const seg = new Segment(new Point(0, 0), new Point(10, 10));
      expect(seg.includes(new Point(0, 0))).toBe(true);
    });

    it('returns true if point is p2', () => {
      const seg = new Segment(new Point(0, 0), new Point(10, 10));
      expect(seg.includes(new Point(10, 10))).toBe(true);
    });

    it('returns false for non-endpoint point', () => {
      const seg = new Segment(new Point(0, 0), new Point(10, 10));
      expect(seg.includes(new Point(5, 5))).toBe(false);
    });
  });

  describe('distanceToPoint', () => {
    it('returns 0 for point on the segment', () => {
      const seg = new Segment(new Point(0, 0), new Point(10, 0));
      expect(seg.distanceToPoint(new Point(5, 0))).toBeCloseTo(0);
    });

    it('returns perpendicular distance for point near the segment', () => {
      const seg = new Segment(new Point(0, 0), new Point(10, 0));
      expect(seg.distanceToPoint(new Point(5, 3))).toBeCloseTo(3);
    });

    it('returns distance to nearest endpoint for point beyond endpoints', () => {
      const seg = new Segment(new Point(0, 0), new Point(10, 0));
      expect(seg.distanceToPoint(new Point(15, 0))).toBeCloseTo(5);
    });

    it('handles point off the start of the segment', () => {
      const seg = new Segment(new Point(0, 0), new Point(10, 0));
      expect(seg.distanceToPoint(new Point(-5, 0))).toBeCloseTo(5);
    });
  });

  describe('projectPoint', () => {
    it('returns the point itself when point is on the segment line', () => {
      const seg = new Segment(new Point(0, 0), new Point(10, 0));
      const proj = seg.projectPoint(new Point(5, 0));
      expect(proj.point.x).toBeCloseTo(5);
      expect(proj.point.y).toBeCloseTo(0);
      expect(proj.offset).toBeCloseTo(0.5);
    });

    it('returns projection and offset for nearby point', () => {
      const seg = new Segment(new Point(0, 0), new Point(10, 0));
      const proj = seg.projectPoint(new Point(5, 3));
      expect(proj.point.x).toBeCloseTo(5);
      expect(proj.point.y).toBeCloseTo(0);
      expect(proj.offset).toBeCloseTo(0.5);
    });

    it('offset is 0 for projection at p1', () => {
      const seg = new Segment(new Point(0, 0), new Point(10, 0));
      const proj = seg.projectPoint(new Point(0, 0));
      expect(proj.offset).toBeCloseTo(0);
    });

    it('offset is 1 for projection at p2', () => {
      const seg = new Segment(new Point(0, 0), new Point(10, 0));
      const proj = seg.projectPoint(new Point(10, 0));
      expect(proj.offset).toBeCloseTo(1);
    });
  });
});
