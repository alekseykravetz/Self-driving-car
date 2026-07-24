import { describe, it, expect } from 'vitest';
import {
  buildRoadBorders,
  queryBordersNearCar,
  pointToSegmentDistanceSq,
} from '../../../ts/simulator/spatialGridUtils.js';
import { SpatialHashGrid } from '../../../ts/math/spatialGrid.js';
import { Point } from '../../../ts/math/primitives/point.js';
import { Segment } from '../../../ts/math/primitives/segment.js';
import type { Car } from '../../../ts/car/car.js';
import type { IWorld } from '../../../ts/world/types.js';
import type { Corridor } from '../../../ts/world/corridor.js';

function makeMockWorld(
  overrides?: Partial<{
    roadBorders: Segment[];
    separatorBorders: Segment[];
    corridors: { borders: Segment[] }[];
  }>,
): IWorld {
  return {
    roadBorders: overrides?.roadBorders ?? [],
    separatorBorders: overrides?.separatorBorders ?? [],
    corridors: (overrides?.corridors ?? []) as Corridor[],
  } as IWorld;
}

function makeMockCar(
  overrides?: Partial<{
    x: number;
    y: number;
    width: number;
    height: number;
    sensor: { rayLength: number } | null;
  }>,
): Car {
  return {
    x: overrides?.x ?? 0,
    y: overrides?.y ?? 0,
    width: overrides?.width ?? 25,
    height: overrides?.height ?? 63,
    sensor: overrides?.sensor ?? { rayLength: 200 },
  } as Car;
}

describe('buildRoadBorders', () => {
  it('empty world returns empty array', () => {
    const world = makeMockWorld();
    expect(buildRoadBorders(world)).toEqual([]);
  });

  it('includes roadBorders', () => {
    const seg = new Segment(new Point(0, 0), new Point(10, 0));
    const world = makeMockWorld({ roadBorders: [seg] });
    const result = buildRoadBorders(world);
    expect(result.length).toBe(1);
    expect(result[0][0].x).toBe(0);
    expect(result[0][0].y).toBe(0);
    expect(result[0][1].x).toBe(10);
    expect(result[0][1].y).toBe(0);
  });

  it('includes roadBorders and separatorBorders', () => {
    const seg1 = new Segment(new Point(0, 0), new Point(10, 0));
    const seg2 = new Segment(new Point(0, 10), new Point(10, 10));
    const world = makeMockWorld({
      roadBorders: [seg1],
      separatorBorders: [seg2],
    });
    const result = buildRoadBorders(world);
    expect(result.length).toBe(2);
  });

  it('includes borders from corridors', () => {
    const seg1 = new Segment(new Point(0, 0), new Point(10, 0));
    const seg2 = new Segment(new Point(0, 10), new Point(10, 10));
    const world = makeMockWorld({
      corridors: [{ borders: [seg1, seg2] }],
    });
    const result = buildRoadBorders(world);
    expect(result.length).toBe(2);
  });

  it('includes all three sources when present', () => {
    const s1 = new Segment(new Point(0, 0), new Point(1, 0));
    const s2 = new Segment(new Point(0, 1), new Point(1, 1));
    const s3 = new Segment(new Point(0, 2), new Point(1, 2));
    const world = makeMockWorld({
      roadBorders: [s1],
      separatorBorders: [s2],
      corridors: [{ borders: [s3] }],
    });
    const result = buildRoadBorders(world);
    expect(result.length).toBe(3);
  });
});

describe('pointToSegmentDistanceSq', () => {
  it('point on segment returns 0', () => {
    const d = pointToSegmentDistanceSq(5, 0, 0, 0, 10, 0);
    expect(d).toBe(0);
  });

  it('point off end returns squared distance', () => {
    const d = pointToSegmentDistanceSq(15, 0, 0, 0, 10, 0);
    expect(d).toBe(25); // 5^2
  });

  it('point perpendicular to segment midpoint returns known distance', () => {
    const d = pointToSegmentDistanceSq(5, 3, 0, 0, 10, 0);
    expect(d).toBe(9); // 3^2
  });

  it('zero-length segment returns distance to endpoint', () => {
    const d = pointToSegmentDistanceSq(5, 0, 3, 3, 3, 3);
    expect(d).toBe(13); // (5-3)^2 + (0-3)^2 = 4 + 9 = 13
  });
});

describe('queryBordersNearCar', () => {
  it('car near border returns matching borders', () => {
    const grid = new SpatialHashGrid(150);
    const seg = new Segment(new Point(0, 0), new Point(10, 0));
    grid.build([[seg.p1, seg.p2]]);
    const car = makeMockCar({ x: 5, y: 5, sensor: { rayLength: 200 } });
    const result = queryBordersNearCar(grid, car);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0][0].x).toBe(0);
    expect(result[0][1].x).toBe(10);
  });

  it('car far from border returns empty array', () => {
    const grid = new SpatialHashGrid(150);
    const seg = new Segment(new Point(10000, 10000), new Point(11000, 10000));
    grid.build([[seg.p1, seg.p2]]);
    const car = makeMockCar({ x: 0, y: 0, sensor: { rayLength: 200 } });
    const result = queryBordersNearCar(grid, car);
    expect(result).toEqual([]);
  });

  it('car without sensor uses fallback MIN_RANGE', () => {
    const grid = new SpatialHashGrid(150);
    const seg = new Segment(new Point(50, 50), new Point(60, 50));
    grid.build([[seg.p1, seg.p2]]);
    const car = makeMockCar({ x: 55, y: 55, sensor: null });
    const result = queryBordersNearCar(grid, car);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it('filters borders within broad-phase but outside narrow-phase radius', () => {
    const grid = new SpatialHashGrid(500);
    const seg = new Segment(new Point(0, 0), new Point(10, 0));
    grid.build([[seg.p1, seg.p2]]);
    const car = makeMockCar({ x: 5, y: 200, sensor: { rayLength: 1 } });
    const result = queryBordersNearCar(grid, car);
    expect(result).toEqual([]);
  });

  it('returns only borders that pass narrow-phase distance filter', () => {
    const grid = new SpatialHashGrid(500);
    const close = new Segment(new Point(0, 0), new Point(10, 0));
    const far = new Segment(new Point(1000, 1000), new Point(1100, 1000));
    grid.build([
      [close.p1, close.p2],
      [far.p1, far.p2],
    ]);
    const car = makeMockCar({ x: 5, y: 5, sensor: { rayLength: 200 } });
    const result = queryBordersNearCar(grid, car);
    expect(result.length).toBe(1);
    expect(result[0][0].x).toBe(0);
  });

  it('handles car with zero width and height', () => {
    const grid = new SpatialHashGrid(150);
    const seg = new Segment(new Point(0, 0), new Point(10, 0));
    grid.build([[seg.p1, seg.p2]]);
    const car = makeMockCar({
      x: 5,
      y: 5,
      width: 0,
      height: 0,
      sensor: { rayLength: 200 },
    });
    const result = queryBordersNearCar(grid, car);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});
