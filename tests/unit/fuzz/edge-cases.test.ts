import { describe, it, expect } from 'vitest';
import { setupImageMock } from '../../helpers/setupImageMock.js';
setupImageMock();

import { Car } from '../../../ts/car/car.js';
import { CarPhysics } from '../../../ts/car/physics/carPhysics.js';
import type { CarState, ControlsState } from '../../../ts/car/carState.js';
import { Sensor } from '../../../ts/car/sensors/sensor.js';
import { SensorRaycaster } from '../../../ts/car/physics/sensorRaycaster.js';
import { Graph } from '../../../ts/math/graph/graph.js';
import { Point } from '../../../ts/math/primitives/point.js';
import { Segment } from '../../../ts/math/primitives/segment.js';
import { Polygon } from '../../../ts/math/primitives/polygon.js';
import { NeuralNetwork } from '../../../ts/neural-network/network.js';
import {
  polysIntersect,
  nearestEdgeOffset,
} from '../../../ts/math/collision.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
    polygon: [
      { x: -12.5, y: -31.5 } as Point,
      { x: 12.5, y: -31.5 } as Point,
      { x: 12.5, y: 31.5 } as Point,
      { x: -12.5, y: 31.5 } as Point,
    ],
    ...overrides,
  };
}

const defaultControls: ControlsState = { forward: true, reverse: false };

// ---------------------------------------------------------------------------
// Physics fuzz tests
// ---------------------------------------------------------------------------

describe('Physics fuzz tests', () => {
  it('NaN acceleration does not crash CarPhysics.update', () => {
    const physics = new CarPhysics();
    const state = makeState({ acceleration: NaN });
    expect(() => physics.update(state, defaultControls)).not.toThrow();
  });

  it('Infinity acceleration is clamped', () => {
    const physics = new CarPhysics();
    const state = makeState({ acceleration: Infinity });
    physics.update(state, defaultControls);
    expect(state.speed).toBeLessThanOrEqual(state.maxSpeed);
  });

  it('extremely large initial speed is clamped', () => {
    const physics = new CarPhysics();
    const state = makeState({ speed: 1e10 });
    physics.update(state, defaultControls);
    expect(state.speed).toBeLessThanOrEqual(state.maxSpeed);
  });

  it('zero-width car does not crash physics', () => {
    const physics = new CarPhysics();
    const state = makeState({ width: 0 });
    expect(() => physics.update(state, defaultControls)).not.toThrow();
  });

  it('negative friction does not crash physics', () => {
    const physics = new CarPhysics();
    const state = makeState({ friction: -0.002 });
    expect(() => physics.update(state, defaultControls)).not.toThrow();
  });

  it('Infinity friction does not crash physics', () => {
    const physics = new CarPhysics();
    const state = makeState({ friction: Infinity });
    expect(() => physics.update(state, defaultControls)).not.toThrow();
  });

  it('NaN speed does not crash physics', () => {
    const physics = new CarPhysics();
    const state = makeState({ speed: NaN });
    expect(() => physics.update(state, defaultControls)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Collision fuzz tests
// ---------------------------------------------------------------------------

describe('Collision fuzz tests', () => {
  it('empty polygon array does not crash polysIntersect', () => {
    const poly = [
      { x: 0, y: 0 } as Point,
      { x: 10, y: 0 } as Point,
      { x: 10, y: 10 } as Point,
      { x: 0, y: 10 } as Point,
    ];
    expect(() => polysIntersect(poly, [])).not.toThrow();
    expect(polysIntersect(poly, [])).toBe(false);
  });

  it('single-point polygon does not crash containsPoint', () => {
    const singlePoint = [{ x: 5, y: 5 } as Point];
    const poly = new Polygon(singlePoint);
    expect(() => poly.containsPoint(new Point(5, 5))).not.toThrow();
  });

  it('degenerate segment (zero length) does not crash nearestEdgeOffset', () => {
    const ray: Point[] = [{ x: 0, y: 0 } as Point, { x: 100, y: 0 } as Point];
    const degenerate: Point[] = [
      { x: 50, y: 0 } as Point,
      { x: 50, y: 0 } as Point,
    ];
    expect(() => nearestEdgeOffset(ray, degenerate)).not.toThrow();
    expect(nearestEdgeOffset(ray, degenerate)).toBeNull();
  });

  it('polygon with collinear points does not crash polysIntersect', () => {
    const collinear: Point[] = [
      { x: 0, y: 0 } as Point,
      { x: 10, y: 0 } as Point,
      { x: 20, y: 0 } as Point,
      { x: 30, y: 0 } as Point,
    ];
    const box: Point[] = [
      { x: 15, y: -5 } as Point,
      { x: 25, y: -5 } as Point,
      { x: 25, y: 5 } as Point,
      { x: 15, y: 5 } as Point,
    ];
    expect(() => polysIntersect(collinear, box)).not.toThrow();
  });

  it('very large coordinate values do not crash polysIntersect', () => {
    const big: Point[] = [
      { x: 1e200, y: 1e200 } as Point,
      { x: 1e200 + 100, y: 1e200 } as Point,
      { x: 1e200 + 100, y: 1e200 + 100 } as Point,
      { x: 1e200, y: 1e200 + 100 } as Point,
    ];
    const other: Point[] = [
      { x: 1e200 - 50, y: 1e200 - 50 } as Point,
      { x: 1e200 + 50, y: 1e200 - 50 } as Point,
      { x: 1e200 + 50, y: 1e200 + 50 } as Point,
      { x: 1e200 - 50, y: 1e200 + 50 } as Point,
    ];
    expect(() => polysIntersect(big, other)).not.toThrow();
  });

  it('NaN coordinates do not crash polysIntersect', () => {
    const nanPoly: Point[] = [
      { x: NaN, y: NaN } as Point,
      { x: NaN, y: NaN } as Point,
    ];
    const normal: Point[] = [{ x: 0, y: 0 } as Point, { x: 10, y: 0 } as Point];
    expect(() => polysIntersect(nanPoly, normal)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Sensor fuzz tests
// ---------------------------------------------------------------------------

describe('Sensor fuzz tests', () => {
  it('negative rayCount produces no rays', () => {
    const sensor = new Sensor({ rayCount: -1, rayLength: 100 });
    sensor.update(0, 0, 0, []);
    expect(sensor.rays.length).toBe(0);
    expect(sensor.readings.length).toBe(0);
  });

  it('rayLength = 0 returns all null readings', () => {
    const sensor = new Sensor({ rayCount: 3, rayLength: 0 });
    sensor.update(0, 0, 0, []);
    expect(sensor.readings.length).toBe(3);
    for (const r of sensor.readings) {
      expect(r).toBeNull();
    }
  });

  it('empty borders array does not crash update()', () => {
    const sensor = new Sensor({ rayCount: 5, rayLength: 100 });
    expect(() => sensor.update(0, 0, 0, [])).not.toThrow();
  });

  it('overlapping polygons do not crash raycasting', () => {
    const a: Point[] = [
      { x: -10, y: 0 } as Point,
      { x: 10, y: 0 } as Point,
      { x: 10, y: 20 } as Point,
      { x: -10, y: 20 } as Point,
    ];
    const b: Point[] = [
      { x: -10, y: 10 } as Point,
      { x: 10, y: 10 } as Point,
      { x: 10, y: 30 } as Point,
      { x: -10, y: 30 } as Point,
    ];
    const rays = SensorRaycaster.castRays(0, 0, 0, 5, 100, Math.PI / 2, 0);
    expect(() => SensorRaycaster.getReadings(rays, [a, b])).not.toThrow();
  });

  it('Sensor constructor tolerates missing config', () => {
    expect(() => new Sensor()).not.toThrow();
    expect(() => new Sensor({})).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Graph fuzz tests
// ---------------------------------------------------------------------------

describe('Graph fuzz tests', () => {
  it('adding then removing same point is idempotent', () => {
    const g = new Graph();
    const p = new Point(42, 99);
    g.addPoint(p);
    expect(g.points.length).toBe(1);
    g.removePoint(p);
    expect(g.points.length).toBe(0);
  });

  it('removing non-existent point does not throw', () => {
    const g = new Graph();
    const p = new Point(1, 2);
    g.addPoint(p);
    const nonexistent = new Point(999, 999);
    expect(() => g.removePoint(nonexistent)).not.toThrow();
  });

  it('graph with duplicate segments does not crash', () => {
    const g = new Graph();
    const a = new Point(0, 0);
    const b = new Point(10, 0);
    g.addPoint(a);
    g.addPoint(b);
    const seg = new Segment(a, b);
    g.tryAddSegment(seg);
    const added = g.tryAddSegment(seg);
    expect(added).toBe(false);
  });

  it('loading empty graph data does not crash', () => {
    expect(() => Graph.load({ points: [], segments: [] })).not.toThrow();
  });

  it('graph with self-loop segment (p1 == p2) is rejected by tryAddSegment', () => {
    const g = new Graph();
    const p = new Point(5, 5);
    g.addPoint(p);
    const loop = new Segment(p, p);
    expect(g.tryAddSegment(loop)).toBe(false);
  });

  it('dispose clears graph without throwing', () => {
    const g = new Graph();
    g.addPoint(new Point(1, 2));
    g.addPoint(new Point(3, 4));
    expect(() => g.dispose()).not.toThrow();
    expect(g.points.length).toBe(0);
    expect(g.segments.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// NeuralNetwork fuzz tests
// ---------------------------------------------------------------------------

describe('NeuralNetwork fuzz tests', () => {
  it('empty network (no levels) feedForward crashes as expected (needs ≥1 level)', () => {
    const net = new NeuralNetwork([]);
    expect(() => NeuralNetwork.feedForward([1, 2], net)).toThrow();
  });

  it('trainStep on zero-level network does not crash', () => {
    const net = new NeuralNetwork([]);
    expect(() => NeuralNetwork.trainStep(net, [1], [0], 0.1)).not.toThrow();
  });

  it('mutation with amount 0 keeps network valid', () => {
    const net = new NeuralNetwork([4, 4, 2]);
    NeuralNetwork.mutate(net, 0);
    for (const level of net.levels) {
      for (const b of level.biases) {
        expect(b).toBeGreaterThanOrEqual(-1);
        expect(b).toBeLessThanOrEqual(1);
      }
      for (const row of level.weights) {
        for (const w of row) {
          expect(w).toBeGreaterThanOrEqual(-1);
          expect(w).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('per-output LR array out of range is handled without NaN', () => {
    const net = new NeuralNetwork([4, 4, 2]);
    const inputs = [0.5, -0.3, 0.1, 0.7];
    // Shorter LR array than output count — should use lr[0] for hidden, lr[i] for output
    // When lr[2] is undefined, ?? coerces to lr[0]
    const lr = [0.1, 0.2] as unknown as number[];
    expect(() =>
      NeuralNetwork.trainStep(net, inputs, [1, 0], lr),
    ).not.toThrow();
  });

  it('feedForward handles zero-weight network', () => {
    const net = new NeuralNetwork([3, 3, 2]);
    // Zero out all weights and biases
    for (const level of net.levels) {
      level.biases.fill(0);
      for (const row of level.weights) {
        row.fill(0);
      }
    }
    const outputs = NeuralNetwork.feedForward([0.5, -0.3, 0.1], net);
    // With all zero weights and zero biases, sum = 0, which is not > 0, so all outputs 0
    expect(outputs.every((o) => o === 0)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Car fuzz tests
// ---------------------------------------------------------------------------

describe('Car fuzz tests', () => {
  it('car with NaN position does not crash update', () => {
    const car = new Car({ x: NaN, y: NaN, controlType: 'DUMMY' });
    expect(() => car.update([], [], [])).not.toThrow();
  });

  it('car with zero dimensions does not crash', () => {
    const car = new Car({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      controlType: 'DUMMY',
    });
    expect(() => car.update([], [], [])).not.toThrow();
  });

  it('AI car with empty brain cast to undefined does not crash', () => {
    const car = new Car({ x: 0, y: 0, controlType: 'AI' });
    car.brain = undefined;
    expect(() => car.update([], [], [])).not.toThrow();
  });
});
