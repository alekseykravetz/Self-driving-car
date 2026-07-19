import { describe, it, expect } from 'vitest';
import { Point } from '../../../ts/math/primitives/point.js';
import { Polygon } from '../../../ts/math/primitives/polygon.js';
import {
  extrudePolygons,
  extrudeTreeShapes,
  extrudeCarShape,
  movePointsInward,
  getCentroid,
} from '../../../ts/camera/extrusion.js';

function makeQuad(x: number, y: number, w: number, h: number): Polygon {
  return new Polygon([
    new Point(x, y),
    new Point(x + w, y),
    new Point(x + w, y + h),
    new Point(x, y + h),
  ]);
}

describe('extrudePolygons', () => {
  it('extrudes a quad into 5 polygons (4 sides + ceiling)', () => {
    const base = makeQuad(0, 0, 10, 10);
    const result = extrudePolygons([base], 20);
    expect(result).toHaveLength(5);
    const ceiling = result[4];
    expect(ceiling.points[0].z).toBe(-20);
    expect(ceiling.points).toHaveLength(4);
  });

  it('extrudes multiple polygons', () => {
    const a = makeQuad(0, 0, 5, 5);
    const b = makeQuad(10, 10, 5, 5);
    const result = extrudePolygons([a, b], 10);
    expect(result).toHaveLength(10);
  });

  it('returns empty array for empty input', () => {
    expect(extrudePolygons([])).toEqual([]);
  });

  it('uses default height of 10', () => {
    const base = makeQuad(0, 0, 5, 5);
    const result = extrudePolygons([base]);
    const ceiling = result[result.length - 1];
    expect(ceiling.points[0].z).toBe(-10);
  });

  it('creates side polygons connecting base to ceiling', () => {
    const base = makeQuad(0, 0, 10, 10);
    const result = extrudePolygons([base], 30);
    for (let i = 0; i < 4; i++) {
      const side = result[i];
      expect(side.points).toHaveLength(4);
      const zValues = side.points.map((p) => p.z);
      expect(zValues).toContain(0);
      expect(zValues).toContain(-30);
    }
  });
});

describe('extrudeTreeShapes', () => {
  it('extrudes a single tree into 9 polygons (4 trunk sides + 4 canopy sides + 1 canopy bottom)', () => {
    const base = makeQuad(0, 0, 10, 10);
    const result = extrudeTreeShapes([base], 200);
    expect(result).toHaveLength(9);
  });

  it('extrudes multiple trees', () => {
    const a = makeQuad(0, 0, 5, 5);
    const b = makeQuad(20, 20, 5, 5);
    const result = extrudeTreeShapes([a, b]);
    expect(result).toHaveLength(18);
  });

  it('returns empty array for empty input', () => {
    expect(extrudeTreeShapes([])).toEqual([]);
  });

  it('applies brown styling to trunk polygons', () => {
    const base = makeQuad(0, 0, 5, 5);
    const result = extrudeTreeShapes([base], 200);
    for (let i = 0; i < 4; i++) {
      expect((result[i] as unknown as { fill: string }).fill).toContain(
        'rgba(100, 60, 20',
      );
    }
  });

  it('applies green styling to canopy polygons', () => {
    const base = makeQuad(0, 0, 5, 5);
    const result = extrudeTreeShapes([base], 200);
    for (let i = 4; i < 9; i++) {
      expect((result[i] as unknown as { fill: string }).fill).toContain(
        'rgba(34, 196, 74',
      );
    }
  });

  it('trunk height scales with total height', () => {
    const base = makeQuad(0, 0, 5, 5);
    const result = extrudeTreeShapes([base], 400);
    const trunkTop = result[0];
    const zValues = trunkTop.points.map((p) => p.z);
    const minZ = Math.min(...zValues);
    const trunkRatio = 0.3;
    const expectedTrunkHeight = 400 * trunkRatio;
    expect(minZ).toBeCloseTo(-expectedTrunkHeight);
  });
});

describe('extrudeCarShape', () => {
  function makeCarBase(): Polygon {
    return new Polygon([
      new Point(30, -60),
      new Point(-30, -60),
      new Point(-30, 60),
      new Point(30, 60),
    ]);
  }

  it('extrudes car into 24 polygons (20 sides + 4 ceiling parts)', () => {
    const result = extrudeCarShape(makeCarBase());
    expect(result).toHaveLength(24);
  });

  it('returns empty array for polygon with fewer than 4 points', () => {
    const base = new Polygon([
      new Point(0, 0),
      new Point(10, 0),
      new Point(5, 10),
    ]);
    expect(extrudeCarShape(base)).toEqual([]);
  });

  it('accepts custom height and wheel radius', () => {
    const result = extrudeCarShape(makeCarBase(), 20, 8);
    expect(result).toHaveLength(24);
  });

  it('lower side polygons include base z level', () => {
    const result = extrudeCarShape(makeCarBase());
    const lowerSides = result.slice(0, 10);
    for (const side of lowerSides) {
      const zValues = side.points.map((p) => p.z);
      expect(zValues.some((z) => z === -5)).toBe(true);
    }
  });

  it('upper side polygons connect to ceiling heights', () => {
    const result = extrudeCarShape(makeCarBase());
    const upperSides = result.slice(10, 20);
    for (const side of upperSides) {
      const zValues = side.points.map((p) => p.z);
      const hasAboveGround = zValues.some((z) => z < -7);
      expect(hasAboveGround).toBe(true);
    }
  });
});

describe('movePointsInward', () => {
  it('moves two points towards each other by the given percent', () => {
    const p1 = new Point(0, 0);
    const p2 = new Point(10, 0);
    movePointsInward(p1, p2, 0.3);
    expect(p1.x).toBeCloseTo(3);
    expect(p2.x).toBeCloseTo(7);
  });

  it('moves points along both axes', () => {
    const p1 = new Point(0, 0);
    const p2 = new Point(10, 20);
    movePointsInward(p1, p2, 0.4);
    expect(p1.x).toBeCloseTo(4);
    expect(p1.y).toBeCloseTo(8);
    expect(p2.x).toBeCloseTo(6);
    expect(p2.y).toBeCloseTo(12);
  });

  it('uses default percent of 0.3', () => {
    const p1 = new Point(0, 0);
    const p2 = new Point(10, 0);
    movePointsInward(p1, p2);
    expect(p1.x).toBeCloseTo(3);
    expect(p2.x).toBeCloseTo(7);
  });

  it('with percent=0 points stay in place', () => {
    const p1 = new Point(0, 0);
    const p2 = new Point(10, 0);
    movePointsInward(p1, p2, 0);
    expect(p1.x).toBeCloseTo(0);
    expect(p2.x).toBeCloseTo(10);
  });

  it('with percent=1 points swap positions', () => {
    const p1 = new Point(0, 0);
    const p2 = new Point(10, 0);
    movePointsInward(p1, p2, 1);
    expect(p1.x).toBeCloseTo(10);
    expect(p2.x).toBeCloseTo(0);
  });
});

describe('getCentroid', () => {
  it('computes centroid of rectangle vertices', () => {
    const points = [
      new Point(0, 0),
      new Point(10, 0),
      new Point(10, 10),
      new Point(0, 10),
    ];
    const c = getCentroid(points);
    expect(c.x).toBeCloseTo(5);
    expect(c.y).toBeCloseTo(5);
  });

  it('computes centroid of triangle', () => {
    const points = [new Point(0, 0), new Point(6, 0), new Point(3, 9)];
    const c = getCentroid(points);
    expect(c.x).toBeCloseTo(3);
    expect(c.y).toBeCloseTo(3);
  });

  it('computes centroid of single point (degenerate)', () => {
    const points = [new Point(7, 13)];
    const c = getCentroid(points);
    expect(c.x).toBeCloseTo(7);
    expect(c.y).toBeCloseTo(13);
  });
});
