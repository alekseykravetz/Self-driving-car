import { describe, it, expect } from 'vitest';
import { Point } from '../../../../ts/math/primitives/point.js';
import { Polygon } from '../../../../ts/math/primitives/polygon.js';
import { Building } from '../../../../ts/world/items/building.js';
import type { BuildingFootprint } from '../../../../ts/world/types.js';

function makeBuilding(): Building {
  const points = [
    new Point(0, 0),
    new Point(100, 0),
    new Point(100, 100),
    new Point(0, 100),
  ];
  return new Building(new Polygon(points), 200);
}

describe('Building', () => {
  it('constructor stores base and height', () => {
    const b = makeBuilding();
    expect(b.base).toBeDefined();
    expect(b.base.points.length).toBeGreaterThanOrEqual(3);
    expect(b.height).toBe(200);
  });

  it('load() round-trips polygon and height', () => {
    const original = makeBuilding();
    const loaded = Building.load(original as unknown as Building);
    expect(loaded.base.points).toHaveLength(original.base.points.length);
    expect(loaded.base.points[0].x).toBe(original.base.points[0].x);
    expect(loaded.height).toBe(original.height);
  });

  it('toFootprint() produces compact form', () => {
    const b = makeBuilding();
    const fp = b.toFootprint();
    expect(fp.poly).toHaveLength(4);
    expect(fp.poly[0]).toHaveLength(2);
    expect(typeof fp.h).toBe('number');
    expect(fp.h).toBe(200);
  });

  it('toFootprint() coordinates are rounded', () => {
    const points = [
      new Point(10.1234, 20.5678),
      new Point(110.1234, 20.5678),
      new Point(110.1234, 120.5678),
      new Point(10.1234, 120.5678),
    ];
    const b = new Building(new Polygon(points), 200);
    const fp = b.toFootprint();
    expect(fp.poly[0][0]).toBe(10.1);
    expect(fp.poly[0][1]).toBe(20.6);
  });

  it('loadFootprint() reconstructs from compact form', () => {
    const info = {
      poly: [
        [0, 0],
        [100, 0],
        [100, 100],
        [0, 100],
      ],
      h: 300,
    };
    const b = Building.loadFootprint(info);
    expect(b.base.points).toHaveLength(4);
    expect(b.base.points[0].x).toBe(0);
    expect(b.base.points[1].x).toBe(100);
    expect(b.height).toBe(300);
  });

  it('loadFootprint() with missing height defaults to 200', () => {
    const info = {
      poly: [
        [0, 0],
        [100, 0],
        [100, 100],
        [0, 100],
      ],
    };
    const b = Building.loadFootprint(info as unknown as BuildingFootprint);
    expect(b.height).toBe(200);
  });
});
