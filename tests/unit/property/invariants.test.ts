import { describe, it, expect } from 'vitest';
import { setupImageMock } from '../../helpers/setupImageMock.js';
setupImageMock();

import { Car } from '../../../ts/car/car.js';
import { Sensor } from '../../../ts/car/sensors/sensor.js';
import { Graph } from '../../../ts/math/graph/graph.js';
import { Point } from '../../../ts/math/primitives/point.js';
import { Segment } from '../../../ts/math/primitives/segment.js';
import { NeuralNetwork } from '../../../ts/neural-network/network.js';
import { Polygon } from '../../../ts/math/primitives/polygon.js';
import { CarBrainAdapter } from '../../../ts/car/brain/carBrainAdapter.js';
import { mulberry32, getIntersectionOffset } from '../../../ts/math/utils.js';
import { REVERSE_SPEED_RATIO } from '../../../ts/car/config.js';
import { polysIntersect } from '../../../ts/math/collision.js';

// ---------------------------------------------------------------------------
// Car invariants
// ---------------------------------------------------------------------------

describe('Car invariants (property-based)', () => {
  it('speed never exceeds maxSpeed', () => {
    const rand = mulberry32(42);
    for (let trial = 0; trial < 50; trial++) {
      const car = new Car({ x: 0, y: 0, controlType: 'DUMMY' });
      for (let i = 0; i < 100; i++) {
        car.controls.forward = rand() > 0.3;
        car.controls.reverse = rand() > 0.7;
        car.update([], [], []);
        expect(car.speed).toBeLessThanOrEqual(car.maxSpeed);
      }
    }
  });

  it('speed never goes below -maxSpeed/2 (reverse limit)', () => {
    const rand = mulberry32(7);
    for (let trial = 0; trial < 50; trial++) {
      const car = new Car({ x: 0, y: 0, controlType: 'DUMMY' });
      for (let i = 0; i < 100; i++) {
        car.controls.forward = rand() > 0.7;
        car.controls.reverse = rand() > 0.3;
        car.update([], [], []);
        expect(car.speed).toBeGreaterThanOrEqual(
          -car.maxSpeed * REVERSE_SPEED_RATIO,
        );
      }
    }
  });

  it('fitness is monotonic (never decreases)', () => {
    for (let trial = 0; trial < 50; trial++) {
      const car = new Car({ x: 0, y: 0, controlType: 'DUMMY' });
      let prevFitness = car.fitness;
      for (let i = 0; i < 100; i++) {
        car.update([], [], []);
        expect(car.fitness).toBeGreaterThanOrEqual(prevFitness);
        prevFitness = car.fitness;
      }
    }
  });

  it('polygon always contains car center point', () => {
    const rand = mulberry32(99);
    for (let trial = 0; trial < 50; trial++) {
      const car = new Car({
        x: rand() * 200 - 100,
        y: rand() * 200 - 100,
        angle: rand() * Math.PI * 2,
        controlType: 'DUMMY',
      });
      for (let i = 0; i < 20; i++) {
        car.controls.forward = rand() > 0.3;
        car.controls.left = rand() > 0.6;
        car.controls.right = rand() > 0.6;
        car.update([], [], []);
        const poly = new Polygon(car.polygon);
        expect(poly.containsPoint(new Point(car.x, car.y))).toBe(true);
      }
    }
  });

  it('damaged car speed is always 0', () => {
    const rand = mulberry32(13);
    for (let trial = 0; trial < 50; trial++) {
      const car = new Car({ x: 0, y: 0, controlType: 'DUMMY' });
      car.damaged = true;
      car.speed = 0;
      for (let i = 0; i < 20; i++) {
        car.controls.forward = rand() > 0.3;
        car.controls.reverse = rand() > 0.7;
        car.update([], [], []);
        expect(car.speed).toBe(0);
        expect(car.damaged).toBe(true);
      }
    }
  });

  it('after respawn, car is not damaged and has 0 speed', () => {
    for (let trial = 0; trial < 50; trial++) {
      const car = new Car({ x: 0, y: 0, controlType: 'DUMMY' });
      car.update([], [], []);
      car.respawn({ x: 10, y: 20, angle: 0.5 });
      expect(car.damaged).toBe(false);
      expect(car.speed).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Sensor invariants
// ---------------------------------------------------------------------------

describe('Sensor invariants (property-based)', () => {
  it('readings.length equals rayCount after update', () => {
    const rand = mulberry32(101);
    for (let trial = 0; trial < 50; trial++) {
      const rayCount = Math.max(1, Math.floor(rand() * 12));
      const sensor = new Sensor({
        rayCount,
        rayLength: 50 + rand() * 200,
      });
      const borders: Point[][] = [];
      const x = rand() * 200 - 100;
      const y = rand() * 200 - 100;
      const angle = rand() * Math.PI * 2;
      sensor.update(x, y, angle, borders);
      expect(sensor.readings.length).toBe(rayCount);
    }
  });

  it('each reading offset is in [0, 1]', () => {
    const sensor = new Sensor({ rayCount: 7, rayLength: 100 });
    const border = [
      { x: -20, y: 50 } as Point,
      { x: 20, y: 50 } as Point,
      { x: 20, y: 55 } as Point,
      { x: -20, y: 55 } as Point,
    ];
    sensor.update(0, 0, 0, [border]);
    for (const r of sensor.readings) {
      if (r !== null) {
        expect(r.offset).toBeGreaterThanOrEqual(0);
        expect(r.offset).toBeLessThanOrEqual(1);
      }
    }
  });

  it('stateAware brain input has 2x+1 entries vs legacy rayCount+1', () => {
    const rand = mulberry32(202);
    for (let trial = 0; trial < 30; trial++) {
      const rayCount = Math.max(1, Math.floor(rand() * 10));

      const legacySensor = new Sensor({
        rayCount,
        rayLength: 100,
        stateAware: false,
      });
      legacySensor.update(0, 0, 0, []);
      const legacyInput = CarBrainAdapter.buildInput(
        legacySensor.readings,
        1,
        3,
        legacySensor.sensorReadings,
        false,
      );

      const saSensor = new Sensor({
        rayCount,
        rayLength: 100,
        stateAware: true,
      });
      saSensor.update(0, 0, 0, []);
      const saInput = CarBrainAdapter.buildInput(
        saSensor.readings,
        1,
        3,
        saSensor.sensorReadings,
        true,
      );

      expect(legacyInput.length).toBe(rayCount + 1);
      expect(saInput.length).toBe(rayCount * 2 + 1);
    }
  });

  it('sensor with no borders returns all null readings', () => {
    const sensor = new Sensor({ rayCount: 5, rayLength: 100 });
    sensor.update(0, 0, 0, []);
    expect(sensor.readings.length).toBe(5);
    for (const r of sensor.readings) {
      expect(r).toBeNull();
    }
  });
});

// ---------------------------------------------------------------------------
// Graph invariants
// ---------------------------------------------------------------------------

describe('Graph invariants (property-based)', () => {
  it('graph hash changes when graph is modified', () => {
    const g = new Graph();
    const hash1 = g.hash();
    g.addPoint(new Point(1, 2));
    const hash2 = g.hash();
    expect(hash2).not.toBe(hash1);
  });

  it('graph hash is deterministic for same graph', () => {
    const g1 = new Graph();
    g1.addPoint(new Point(3, 4));
    g1.addSegment(new Segment(new Point(3, 4), new Point(5, 6)));
    const hash1 = g1.hash();

    const g2 = new Graph();
    g2.addPoint(new Point(3, 4));
    g2.addSegment(new Segment(new Point(3, 4), new Point(5, 6)));
    const hash2 = g2.hash();
    expect(hash2).toBe(hash1);
  });

  it('after removing a point, no segment references it', () => {
    const rand = mulberry32(303);
    for (let trial = 0; trial < 30; trial++) {
      const g = new Graph();
      const points: Point[] = [];
      for (let i = 0; i < 10; i++) {
        const p = new Point(rand() * 100, rand() * 100);
        points.push(p);
        g.tryAddPoint(p);
      }
      for (let i = 0; i < 15; i++) {
        const a = points[Math.floor(rand() * points.length)];
        const b = points[Math.floor(rand() * points.length)];
        if (!a.equals(b)) {
          g.tryAddSegment(new Segment(a, b));
        }
      }
      const toRemove = points[Math.floor(rand() * points.length)];
      g.removePoint(toRemove);
      for (const seg of g.segments) {
        expect(seg.includes(toRemove)).toBe(false);
      }
    }
  });

  it('tryAddPoint does not add duplicate points', () => {
    const g = new Graph();
    expect(g.tryAddPoint(new Point(10, 20))).toBe(true);
    expect(g.points.length).toBe(1);
    expect(g.tryAddPoint(new Point(10, 20))).toBe(false);
    expect(g.points.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// NeuralNetwork invariants
// ---------------------------------------------------------------------------

describe('NeuralNetwork invariants (property-based)', () => {
  it('feedForward output length equals output layer size', () => {
    const rand = mulberry32(404);
    for (let trial = 0; trial < 30; trial++) {
      const inputSize = Math.max(1, Math.floor(rand() * 8));
      const hiddenSize = Math.max(1, Math.floor(rand() * 8));
      const outputSize = Math.max(1, Math.floor(rand() * 6));
      const net = new NeuralNetwork([inputSize, hiddenSize, outputSize]);
      const inputs = Array.from({ length: inputSize }, () => rand() * 2 - 1);
      const outputs = NeuralNetwork.feedForward(inputs, net);
      expect(outputs.length).toBe(outputSize);
    }
  });

  it('all output values are 0 or 1 (binary step activation)', () => {
    const rand = mulberry32(505);
    const net = new NeuralNetwork([6, 6, 4]);
    for (let trial = 0; trial < 30; trial++) {
      const inputs = Array.from({ length: 6 }, () => rand() * 4 - 2);
      const outputs = NeuralNetwork.feedForward(inputs, net);
      for (const o of outputs) {
        expect(o === 0 || o === 1).toBe(true);
      }
    }
  });

  it('trainStep preserves weights in [-1, 1]', () => {
    const net = new NeuralNetwork([8, 6, 4]);
    const inputs = Array.from({ length: 8 }, () => Math.random() * 2 - 1);
    const targets = [1, 0, 1, 0];
    for (let i = 0; i < 20; i++) {
      NeuralNetwork.trainStep(net, inputs, targets, 0.1);
    }
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

  it('NaN inputs do not crash feedForward', () => {
    const net = new NeuralNetwork([4, 4, 2]);
    const nanInputs = [NaN, NaN, NaN, NaN];
    expect(() => {
      const out = NeuralNetwork.feedForward(nanInputs, net);
      expect(out.length).toBe(2);
    }).not.toThrow();
  });

  it('NaN inputs do not crash trainStep', () => {
    const net = new NeuralNetwork([4, 4, 2]);
    const nanInputs = [NaN, NaN, NaN, NaN];
    expect(() => {
      NeuralNetwork.trainStep(net, nanInputs, [1, 0], 0.1);
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Collision invariants (property-based)
// ---------------------------------------------------------------------------

describe('Collision invariants (property-based)', () => {
  it('polysIntersect is symmetric', () => {
    const rand = mulberry32(606);
    for (let trial = 0; trial < 50; trial++) {
      const makePoly = (): Point[] => [
        { x: rand() * 100, y: rand() * 100 } as Point,
        { x: rand() * 100, y: rand() * 100 } as Point,
        { x: rand() * 100, y: rand() * 100 } as Point,
        { x: rand() * 100, y: rand() * 100 } as Point,
      ];
      const a = makePoly();
      const b = makePoly();
      expect(polysIntersect(a, b)).toBe(polysIntersect(b, a));
    }
  });

  it('intersecting segment offset is always in [0, 1]', () => {
    const rand = mulberry32(707);
    for (let trial = 0; trial < 100; trial++) {
      const a = { x: rand() * 100, y: rand() * 100 } as Point;
      const b = { x: rand() * 100, y: rand() * 100 } as Point;
      const c = { x: rand() * 100, y: rand() * 100 } as Point;
      const d = { x: rand() * 100, y: rand() * 100 } as Point;
      const offset = getIntersectionOffset(a, b, c, d);
      if (offset >= 0) {
        expect(offset).toBeGreaterThanOrEqual(0);
        expect(offset).toBeLessThanOrEqual(1);
      }
    }
  });
});
