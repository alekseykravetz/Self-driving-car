import { describe, it, expect } from 'vitest';
import { CarPhysics } from '../../../ts/car/physics/carPhysics.js';
import type { CarState, ControlsState } from '../../../ts/car/carState.js';
import type { Point } from '../../../ts/math/primitives/point.js';

function makeState(overrides: Partial<CarState> = {}): CarState {
  return {
    x: 0,
    y: 0,
    angle: 0,
    speed: 0,
    acceleration: 0.01,
    maxSpeed: 3.24,
    friction: 0.002,
    width: 25,
    height: 63,
    damaged: false,
    fitness: 0,
    polygon: [],
    ...overrides,
  };
}

const noControls: ControlsState = { forward: false, reverse: false };

describe('CarPhysics', () => {
  describe('createPolygon', () => {
    it('returns exactly 4 points', () => {
      const physics = new CarPhysics();
      const state = makeState({ x: 100, y: 200, angle: 0 });
      const poly = physics.createPolygon(state);
      expect(poly.length).toBe(4);
    });

    it('points have x and y', () => {
      const physics = new CarPhysics();
      const state = makeState({ x: 100, y: 200 });
      const poly = physics.createPolygon(state);
      for (const p of poly) {
        expect(typeof p.x).toBe('number');
        expect(typeof p.y).toBe('number');
      }
    });
  });

  describe('update', () => {
    it('forward control increases speed', () => {
      const physics = new CarPhysics();
      const state = makeState();
      physics.update(state, { forward: true, reverse: false });
      expect(state.speed).toBeGreaterThan(0);
    });

    it('no control - friction slows but not below 0', () => {
      const physics = new CarPhysics();
      const state = makeState({ speed: 1 });
      physics.update(state, noControls, []);
      expect(state.speed).toBeLessThan(1);
      expect(state.speed).toBeGreaterThanOrEqual(0);
    });

    it('damaged car does not move', () => {
      const physics = new CarPhysics();
      const state = makeState({ damaged: true, speed: 1 });
      const result = physics.update(state, { forward: true, reverse: false });
      expect(result).toBe(false);
      expect(state.speed).toBe(1);
    });

    it('reverse control produces negative speed capped by REVERSE_SPEED_RATIO', () => {
      const physics = new CarPhysics();
      const state = makeState();
      physics.update(state, { forward: false, reverse: true });
      expect(state.speed).toBeLessThan(0);
      expect(state.speed).toBeGreaterThanOrEqual(-3.24 * 0.5);
    });

    it('collision with polygon -> damaged, speed=0, returns true', () => {
      const physics = new CarPhysics();
      const state = makeState({ x: 0, y: 0, speed: 0 });
      const wall: Point[] = [
        { x: -5, y: -5 } as Point,
        { x: 5, y: -5 } as Point,
        { x: 5, y: 40 } as Point,
        { x: -5, y: 40 } as Point,
      ];
      const result = physics.update(state, { forward: true, reverse: false }, [
        wall,
      ]);
      expect(result).toBe(true);
      expect(state.damaged).toBe(true);
      expect(state.speed).toBe(0);
    });

    it('no collision -> returns false, speed unchanged', () => {
      const physics = new CarPhysics();
      const state = makeState({ x: 1000, y: 1000, speed: 0 });
      const wall: Point[] = [
        { x: 0, y: 0 } as Point,
        { x: 10, y: 0 } as Point,
        { x: 10, y: 10 } as Point,
        { x: 0, y: 10 } as Point,
      ];
      const result = physics.update(state, noControls, [wall]);
      expect(result).toBe(false);
    });
  });

  describe('assessDamage', () => {
    it('AABB fast-reject: far polygon returns false', () => {
      const physics = new CarPhysics();
      const state = makeState({ x: 0, y: 0 });
      const carPoly = physics.createPolygon(state);
      const farPoly: Point[] = [
        { x: 9999, y: 9999 } as Point,
        { x: 10000, y: 9999 } as Point,
        { x: 10000, y: 10000 } as Point,
        { x: 9999, y: 10000 } as Point,
      ];
      expect(physics.assessDamage(carPoly, [farPoly])).toBe(false);
    });

    it('intersecting polygon returns true', () => {
      const physics = new CarPhysics();
      const state = makeState({ x: 0, y: 0 });
      const carPoly = physics.createPolygon(state);
      expect(physics.assessDamage(carPoly, [carPoly])).toBe(true);
    });

    it('empty polygons array returns false', () => {
      const physics = new CarPhysics();
      const state = makeState({ x: 0, y: 0 });
      const carPoly = physics.createPolygon(state);
      expect(physics.assessDamage(carPoly, [])).toBe(false);
    });
  });
});
