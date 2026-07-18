import { describe, it, expect } from 'vitest';
import { SensorRaycaster } from '../../../../ts/car/physics/sensorRaycaster.js';
import type { Point } from '../../../../ts/math/primitives/point.js';

function makeSquare(cx: number, cy: number, size: number = 20): Point[] {
  return [
    { x: cx - size / 2, y: cy - size / 2 } as Point,
    { x: cx + size / 2, y: cy - size / 2 } as Point,
    { x: cx + size / 2, y: cy + size / 2 } as Point,
    { x: cx - size / 2, y: cy + size / 2 } as Point,
  ];
}

const straightRay: Point[] = [
  { x: 0, y: 0 } as Point,
  { x: 0, y: -100 } as Point,
];

describe('SensorRaycaster', () => {
  describe('castRays', () => {
    it('produces correct ray count', () => {
      const rays = SensorRaycaster.castRays(0, 0, 0, 5, 200, Math.PI / 2, 0);
      expect(rays.length).toBe(5);
    });

    it('each ray has start and end points', () => {
      const rays = SensorRaycaster.castRays(0, 0, 0, 3, 200, Math.PI / 2, 0);
      for (const ray of rays) {
        expect(ray.length).toBe(2);
        expect(ray[0]).toHaveProperty('x');
        expect(ray[0]).toHaveProperty('y');
        expect(ray[1]).toHaveProperty('x');
        expect(ray[1]).toHaveProperty('y');
      }
    });

    it('start points are at car position', () => {
      const rays = SensorRaycaster.castRays(50, 100, 0, 3, 200, Math.PI / 2, 0);
      for (const ray of rays) {
        expect(ray[0].x).toBe(50);
        expect(ray[0].y).toBe(100);
      }
    });

    it('end points are rayLength away at correct angles', () => {
      const rayLength = 200;
      const carX = 0;
      const carY = 0;
      const carAngle = 0;
      const raySpread = Math.PI / 2;
      const rayCount = 5;
      const rays = SensorRaycaster.castRays(
        carX,
        carY,
        carAngle,
        rayCount,
        rayLength,
        raySpread,
        0,
      );
      const expectedAngles = [
        Math.PI / 4,
        Math.PI / 8,
        0,
        -Math.PI / 8,
        -Math.PI / 4,
      ];
      for (let i = 0; i < rayCount; i++) {
        const expectedX = carX - Math.sin(expectedAngles[i]) * rayLength;
        const expectedY = carY - Math.cos(expectedAngles[i]) * rayLength;
        expect(rays[i][1].x).toBeCloseTo(expectedX);
        expect(rays[i][1].y).toBeCloseTo(expectedY);
      }
    });

    it('rayCount=1 produces center angle', () => {
      const rays = SensorRaycaster.castRays(0, 0, 0, 1, 200, Math.PI, 0);
      expect(rays.length).toBe(1);
      expect(rays[0][1].x).toBeCloseTo(0);
      expect(rays[0][1].y).toBeCloseTo(-200);
    });

    it('rayOffset shifts all rays', () => {
      const raysNoOffset = SensorRaycaster.castRays(
        0,
        0,
        0,
        3,
        200,
        Math.PI / 2,
        0,
      );
      const raysWithOffset = SensorRaycaster.castRays(
        0,
        0,
        0,
        3,
        200,
        Math.PI / 2,
        Math.PI / 4,
      );
      expect(raysNoOffset.length).toBe(3);
      expect(raysWithOffset.length).toBe(3);
      for (let i = 0; i < 3; i++) {
        expect(raysWithOffset[i][1].x).not.toBeCloseTo(raysNoOffset[i][1].x);
      }
    });

    it('carAngle rotates rays', () => {
      const rays0 = SensorRaycaster.castRays(0, 0, 0, 3, 200, Math.PI / 2, 0);
      const rays90 = SensorRaycaster.castRays(
        0,
        0,
        Math.PI / 2,
        3,
        200,
        Math.PI / 2,
        0,
      );
      expect(rays90[1][1].x).toBeCloseTo(-200);
      expect(rays0[1][1].x).toBeCloseTo(0);
    });
  });

  describe('getReading', () => {
    it('ray hits polygon returns IntersectionPoint with offset', () => {
      const poly = makeSquare(0, -50, 40);
      const result = SensorRaycaster.getReading(straightRay, [poly]);
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('offset');
      expect(typeof result!.offset).toBe('number');
      expect(result!.offset).toBeGreaterThan(0);
    });

    it('ray misses all polygons returns null', () => {
      const poly = makeSquare(500, 500, 20);
      const result = SensorRaycaster.getReading(straightRay, [poly]);
      expect(result).toBeNull();
    });

    it('multiple polygons: closest one wins', () => {
      const nearPoly = makeSquare(0, -30, 10);
      const farPoly = makeSquare(0, -80, 10);
      const result = SensorRaycaster.getReading(straightRay, [
        farPoly,
        nearPoly,
      ]);
      expect(result).not.toBeNull();
      expect(result!.offset).toBeLessThan(0.35);
    });

    it('empty polygons array returns null', () => {
      const result = SensorRaycaster.getReading(straightRay, []);
      expect(result).toBeNull();
    });

    it('returns correct intersection coordinates', () => {
      const poly = makeSquare(0, -40, 20);
      const result = SensorRaycaster.getReading(straightRay, [poly]);
      expect(result).not.toBeNull();
      expect(result!.x).toBeCloseTo(0, 0);
      expect(result!.y).toBeLessThan(0);
    });
  });

  describe('getReadings', () => {
    it('returns array with one entry per ray', () => {
      const rays = SensorRaycaster.castRays(0, 0, 0, 5, 200, Math.PI / 2, 0);
      const poly = makeSquare(100, 100, 20);
      const readings = SensorRaycaster.getReadings(rays, [poly]);
      expect(readings.length).toBe(5);
    });

    it('no hits returns all nulls', () => {
      const rays = SensorRaycaster.castRays(0, 0, 0, 3, 200, Math.PI / 2, 0);
      const readings = SensorRaycaster.getReadings(rays, []);
      expect(readings.length).toBe(3);
      expect(readings.every((r) => r === null)).toBe(true);
    });
  });

  describe('getTaggedReadings', () => {
    it('border hit returns type=border', () => {
      const rays = SensorRaycaster.castRays(0, 0, 0, 1, 200, Math.PI, 0);
      const border = makeSquare(0, -40, 10);
      const result = SensorRaycaster.getTaggedReadings(rays, [border], [], []);
      expect(result.length).toBe(1);
      expect(result[0]).not.toBeNull();
      expect(result[0]!.type).toBe('border');
    });

    it('car hit returns type=car', () => {
      const rays = SensorRaycaster.castRays(0, 0, 0, 1, 200, Math.PI, 0);
      const carPoly = makeSquare(0, -40, 10);
      const result = SensorRaycaster.getTaggedReadings(rays, [], [carPoly], []);
      expect(result.length).toBe(1);
      expect(result[0]).not.toBeNull();
      expect(result[0]!.type).toBe('car');
    });

    it('traffic control hit returns type=trafficControl with state', () => {
      const rays = SensorRaycaster.castRays(0, 0, 0, 1, 200, Math.PI, 0);
      const tcPoly = makeSquare(0, -40, 10);
      const result = SensorRaycaster.getTaggedReadings(
        rays,
        [],
        [],
        [{ polygon: tcPoly, state: 'red' }],
      );
      expect(result.length).toBe(1);
      expect(result[0]).not.toBeNull();
      expect(result[0]!.type).toBe('trafficControl');
      expect(result[0]!.controlState).toBe('red');
    });

    it('no hits returns all null', () => {
      const rays = SensorRaycaster.castRays(0, 0, 0, 3, 200, Math.PI, 0);
      const result = SensorRaycaster.getTaggedReadings(rays, [], [], []);
      expect(result.length).toBe(3);
      expect(result.every((r) => r === null)).toBe(true);
    });

    it('closest among categories wins', () => {
      const rays = SensorRaycaster.castRays(0, 0, 0, 1, 200, Math.PI, 0);
      const nearCar = makeSquare(0, -30, 10);
      const farBorder = makeSquare(0, -80, 10);
      const result = SensorRaycaster.getTaggedReadings(
        rays,
        [farBorder],
        [nearCar],
        [],
      );
      expect(result[0]).not.toBeNull();
      expect(result[0]!.type).toBe('car');
    });
  });
});
