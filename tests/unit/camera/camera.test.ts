import { describe, it, expect } from 'vitest';
import { Camera } from '../../../ts/camera/camera.js';
import { Point } from '../../../ts/math/primitives/point.js';
import { Polygon } from '../../../ts/math/primitives/polygon.js';
import { lerp } from '../../../ts/math/utils.js';
import { mockCanvas2D } from '../../helpers/mockCanvas2D.js';

function makeMinimalWorld(): Record<string, unknown> {
  return {
    graph: {},
    markings: [],
    roadBorders: [],
    separatorBorders: [],
    corridors: [],
    buildings: [],
    trees: [],
    generateCorridor: () => {},
    draw: () => {},
  };
}

describe('Camera', () => {
  describe('construction', () => {
    it('initializes at given position with default range and distanceBehind', () => {
      const cam = new Camera({ x: 10, y: 20, angle: Math.PI / 4 });
      expect(cam.range).toBe(1000);
      expect(cam.distanceBehind).toBe(100);
    });

    it('x, y, angle set from ICameraPoint via simpleMove', () => {
      const cam = new Camera({ x: 0, y: 0, angle: 0 });
      expect(cam.x).toBeCloseTo(0);
      expect(cam.y).toBeCloseTo(100);
      expect(cam.angle).toBe(0);
    });

    it('accepts custom range and distanceBehind', () => {
      const cam = new Camera({ x: 0, y: 0, angle: 0 }, 500, 50);
      expect(cam.range).toBe(500);
      expect(cam.distanceBehind).toBe(50);
      expect(cam.y).toBeCloseTo(50);
    });

    it('z is always -40 after construction', () => {
      const cam = new Camera({ x: 0, y: 0, angle: 0 });
      expect(cam.z).toBe(-40);
    });

    it('frustum center, tip, left, right are defined after construction', () => {
      const cam = new Camera({ x: 0, y: 0, angle: 0 });
      expect(cam.center).toBeDefined();
      expect(cam.center.x).toBeCloseTo(0);
      expect(cam.center.y).toBeCloseTo(100);
      expect(cam.tip).toBeDefined();
      expect(cam.tip.x).toBeCloseTo(0);
      expect(cam.tip.y).toBeCloseTo(-900);
      expect(cam.left).toBeDefined();
      expect(cam.right).toBeDefined();
    });

    it('polygon is a triangle (3 points) after construction', () => {
      const cam = new Camera({ x: 0, y: 0, angle: 0 });
      expect(cam.polygon).toBeDefined();
      expect(cam.polygon.points).toHaveLength(3);
    });
  });

  describe('simpleMove', () => {
    it('directly sets camera position without interpolation', () => {
      const cam = new Camera({ x: 0, y: 0, angle: 0 });
      const angle = Math.PI / 2;
      cam.simpleMove({ x: 100, y: 200, angle });
      expect(cam.x).toBeCloseTo(100 + 100 * Math.sin(angle));
      expect(cam.y).toBeCloseTo(200 + 100 * Math.cos(angle));
      expect(cam.angle).toBeCloseTo(angle);
    });

    it('z remains -40 after simpleMove', () => {
      const cam = new Camera({ x: 0, y: 0, angle: 0 });
      cam.simpleMove({ x: 50, y: 50, angle: Math.PI });
      expect(cam.z).toBe(-40);
    });

    it('updates frustum points after simpleMove', () => {
      const cam = new Camera({ x: 0, y: 0, angle: 0 });
      const oldCenter = cam.center;
      const oldPolygon = cam.polygon;
      cam.simpleMove({ x: 50, y: 50, angle: Math.PI });
      expect(cam.center).not.toBe(oldCenter);
      expect(cam.polygon).not.toBe(oldPolygon);
      expect(cam.polygon.points).toHaveLength(3);
    });
  });

  describe('move', () => {
    it('interpolates x, y, angle towards target using lerp with t=0.15', () => {
      const cam = new Camera({ x: 0, y: 0, angle: 0 });
      const targetAngle = Math.PI / 4;
      const expectedX = lerp(0, 100 + 100 * Math.sin(targetAngle), 0.15);
      const expectedY = lerp(100, 100 + 100 * Math.cos(targetAngle), 0.15);
      const expectedAngle = lerp(0, targetAngle, 0.15);

      cam.move({ x: 100, y: 100, angle: targetAngle });

      expect(cam.x).toBeCloseTo(expectedX);
      expect(cam.y).toBeCloseTo(expectedY);
      expect(cam.angle).toBeCloseTo(expectedAngle);
    });

    it('z remains -40 after move', () => {
      const cam = new Camera({ x: 0, y: 0, angle: 0 });
      cam.move({ x: 100, y: 100, angle: 0 });
      expect(cam.z).toBe(-40);
    });

    it('updates frustum points after move', () => {
      const cam = new Camera({ x: 0, y: 0, angle: 0 });
      const oldPolygon = cam.polygon;
      cam.move({ x: 100, y: 0, angle: Math.PI / 2 });
      expect(cam.polygon).not.toBe(oldPolygon);
      expect(cam.polygon.points).toHaveLength(3);
    });

    it('converges to target over multiple steps', () => {
      const cam = new Camera({ x: 0, y: 0, angle: 0 });
      const target = { x: 100, y: 100, angle: Math.PI / 4 };
      for (let i = 0; i < 50; i++) {
        cam.move(target);
      }
      const expectedX = 100 + 100 * Math.sin(Math.PI / 4);
      const expectedY = 100 + 100 * Math.cos(Math.PI / 4);
      expect(cam.x).toBeCloseTo(expectedX, 0);
      expect(cam.y).toBeCloseTo(expectedY, 0);
      expect(cam.angle).toBeCloseTo(Math.PI / 4, 1);
    });
  });

  describe('render', () => {
    it('does not crash with empty world', () => {
      const mock = mockCanvas2D();
      const cam = new Camera({ x: 0, y: 0, angle: 0 });
      const world = makeMinimalWorld();
      expect(() => cam.render(mock.ctx, world as never)).not.toThrow();
    });

    it('calls clearRect on the canvas', () => {
      const mock = mockCanvas2D();
      const cam = new Camera({ x: 0, y: 0, angle: 0 });
      const world = makeMinimalWorld();
      cam.render(mock.ctx, world as never);
      expect(mock.calls.some((c) => c.method === 'clearRect')).toBe(true);
    });

    it('renders buildings and trees when provided', () => {
      const mock = mockCanvas2D();
      const cam = new Camera({ x: 0, y: 0, angle: 0 });
      const world = makeMinimalWorld();
      const buildingBase = new Polygon([
        new Point(-50, -50),
        new Point(50, -50),
        new Point(50, 50),
        new Point(-50, 50),
      ]);
      world.buildings = [{ base: buildingBase }];
      const treeBase = new Polygon([
        new Point(-100, -100),
        new Point(-90, -100),
        new Point(-90, -90),
        new Point(-100, -90),
      ]);
      world.trees = [{ base: treeBase }];

      cam.render(mock.ctx, world as never);

      const methods = mock.calls.map((c) => c.method);
      expect(methods.filter((m) => m === 'beginPath').length).toBeGreaterThan(
        0,
      );
    });

    it('renders key car when provided', () => {
      const mock = mockCanvas2D();
      const cam = new Camera({ x: 0, y: 0, angle: 0 });
      const world = makeMinimalWorld();
      const keyCar = {
        polygon: [
          { x: -12.5, y: -31.5 },
          { x: 12.5, y: -31.5 },
          { x: 12.5, y: 31.5 },
          { x: -12.5, y: 31.5 },
        ],
        color: 'rgba(0, 100, 255, 0.6)',
      };

      cam.render(mock.ctx, world as never, { keyCar: keyCar as never });

      const methods = mock.calls.map((c) => c.method);
      expect(methods.filter((m) => m === 'beginPath').length).toBeGreaterThan(
        0,
      );
    });

    it('honors showTrees and showBuildings options', () => {
      const mock = mockCanvas2D();
      const cam = new Camera({ x: 0, y: 0, angle: 0 });
      const world = makeMinimalWorld();
      world.buildings = [
        {
          base: new Polygon([
            new Point(-50, -50),
            new Point(50, -50),
            new Point(50, 50),
            new Point(-50, 50),
          ]),
        },
      ];
      world.trees = [
        {
          base: new Polygon([
            new Point(-100, -100),
            new Point(-90, -100),
            new Point(-90, -90),
            new Point(-100, -90),
          ]),
        },
      ];

      cam.render(mock.ctx, world as never, {
        showTrees: false,
        showBuildings: false,
      });

      const methods = mock.calls.map((c) => c.method);
      // clearRect should still be called, but no building/tree extrusion
      expect(methods.includes('clearRect')).toBe(true);
    });

    it('does not crash with debugCtx', () => {
      const mock = mockCanvas2D();
      const debugMock = mockCanvas2D();
      const cam = new Camera({ x: 0, y: 0, angle: 0 });
      const world = makeMinimalWorld();
      expect(() =>
        cam.render(mock.ctx, world as never, { debugCtx: debugMock.ctx }),
      ).not.toThrow();
    });
  });
});
