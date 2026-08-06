import { describe, it, expect } from 'vitest';
import { Point } from '../../../ts/math/primitives/point.js';
import { Segment } from '../../../ts/math/primitives/segment.js';
import {
  pointInView,
  segmentInView,
  polygonInView,
  WORLD_CULL_MARGIN_PX,
} from '../../../ts/world/worldViewCulling.js';
import type { VisibleWorldRect } from '../../../ts/viewport/viewport.js';

const bounds: VisibleWorldRect = { minX: 0, minY: 0, maxX: 100, maxY: 100 };

describe('pointInView', () => {
  it('returns true for a point inside the bounds', () => {
    expect(pointInView(new Point(50, 50), bounds)).toBe(true);
  });

  it('returns true for a point just outside the bounds but within the default margin', () => {
    expect(pointInView(new Point(-200, 50), bounds)).toBe(true);
    expect(pointInView(new Point(50, 100 + WORLD_CULL_MARGIN_PX), bounds)).toBe(
      true,
    );
  });

  it('returns false for a point beyond the default margin', () => {
    expect(pointInView(new Point(-301, 50), bounds)).toBe(false);
  });

  it('honors a custom margin', () => {
    expect(pointInView(new Point(110, 50), bounds, 5)).toBe(false);
    expect(pointInView(new Point(105, 50), bounds, 5)).toBe(true);
  });
});

describe('segmentInView', () => {
  it('returns true when the segment AABB overlaps the bounds', () => {
    const seg = new Segment(new Point(-50, 50), new Point(50, 50));
    expect(segmentInView(seg, bounds)).toBe(true);
  });

  it('returns true when the segment is fully outside but within the margin', () => {
    const seg = new Segment(new Point(-290, 50), new Point(-260, 50));
    expect(segmentInView(seg, bounds)).toBe(true);
  });

  it('returns false when the segment AABB is beyond the margin on every side', () => {
    const seg = new Segment(new Point(-500, 50), new Point(-450, 50));
    expect(segmentInView(seg, bounds)).toBe(false);
  });

  it('honors a custom margin', () => {
    const seg = new Segment(new Point(-10, 50), new Point(-8, 50));
    expect(segmentInView(seg, bounds, 5)).toBe(false);
    expect(segmentInView(seg, bounds, 10)).toBe(true);
  });
});

describe('polygonInView', () => {
  it('returns true when the polygon AABB overlaps the bounds', () => {
    const poly = { points: [new Point(90, 90), new Point(110, 110)] };
    expect(polygonInView(poly, bounds)).toBe(true);
  });

  it('returns false when the polygon AABB is entirely outside the bounds', () => {
    const poly = { points: [new Point(200, 200), new Point(250, 250)] };
    expect(polygonInView(poly, bounds)).toBe(false);
  });

  it('applies no extra margin (touches exactly at the boundary)', () => {
    const poly = { points: [new Point(100, 50), new Point(150, 50)] };
    expect(polygonInView(poly, bounds)).toBe(true);
  });

  it('returns false for an empty points array', () => {
    expect(polygonInView({ points: [] }, bounds)).toBe(false);
  });
});
