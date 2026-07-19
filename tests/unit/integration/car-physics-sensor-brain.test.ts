import { describe, it, expect } from 'vitest';
import { setupImageMock } from '../../helpers/setupImageMock.js';

setupImageMock();

import { Car } from '../../../ts/car/car.js';
import { NeuralNetwork } from '../../../ts/neural-network/network.js';
import { makeKnownNetwork } from '../../helpers/makeKnownNetwork.js';
import { encodeTrafficState } from '../../../ts/car/sensors/sensor.js';
import type { Point } from '../../../ts/math/primitives/point.js';
import type { SensorTrafficControl } from '../../../ts/car/sensors/sensor.js';

function makeWallY(yStart: number, yEnd: number, xSpan = 15): Point[] {
  return [
    { x: -xSpan, y: yStart } as Point,
    { x: xSpan, y: yStart } as Point,
    { x: xSpan, y: yEnd } as Point,
    { x: -xSpan, y: yEnd } as Point,
  ];
}

function makeKnownForwardBrain(): unknown {
  return makeKnownNetwork(
    [6, 6, 4],
    [
      Array.from({ length: 6 }, () => Array(6).fill(0)),
      Array.from({ length: 6 }, () => Array(4).fill(0)),
    ],
    [Array(6).fill(0.1), [-0.1, 0.1, 0.1, 0.1]],
  );
}

function makeKnownReverseBrain(): unknown {
  return makeKnownNetwork(
    [6, 6, 4],
    [
      Array.from({ length: 6 }, () => Array(6).fill(0)),
      Array.from({ length: 6 }, () => Array(4).fill(0)),
    ],
    [Array(6).fill(0.1), [0.1, 0.1, 0.1, -0.1]],
  );
}

function makeAllZeroBrain(): unknown {
  return makeKnownNetwork(
    [6, 6, 4],
    [
      Array.from({ length: 6 }, () => Array(6).fill(0)),
      Array.from({ length: 6 }, () => Array(4).fill(0)),
    ],
    [Array(6).fill(0.1), [0.1, 0.1, 0.1, 0.1]],
  );
}

describe('AI car pipeline integration', () => {
  it('AI car construction creates sensor and brain', () => {
    const car = new Car({ x: 0, y: 0, controlType: 'AI' });
    expect(car.sensor).toBeDefined();
    expect(car.brain).toBeDefined();
    expect(car.sensor!.rayCount).toBe(5);
    const nn = car.brain as NeuralNetwork;
    expect(nn.levels.length).toBe(2);
    expect(nn.levels[0].inputs.length).toBe(6);
    expect(nn.levels[1].outputs.length).toBe(4);
  });

  it('car.update() processes brain, physics, sensor each frame', () => {
    const car = new Car({ x: 0, y: 0, controlType: 'AI' });
    car.brain = makeKnownForwardBrain();
    expect(car.sensor!.readings.length).toBe(0);
    expect(car.sensor!.rays.length).toBe(0);
    expect(car.speed).toBe(0);

    car.update([], [], []);

    expect(car.sensor!.readings.length).toBe(5);
    expect(car.sensor!.rays.length).toBe(5);
    expect(car.speed).toBeGreaterThan(0);
    expect(car.damaged).toBe(false);
  });

  it('car drives forward without crashing for 100 frames', () => {
    const car = new Car({ x: 0, y: 0, controlType: 'AI' });
    car.brain = makeKnownForwardBrain();
    for (let i = 0; i < 100; i++) {
      car.update([], [], []);
      expect(car.damaged).toBe(false);
    }
    expect(car.speed).toBeGreaterThan(0);
    expect(car.y).not.toBe(0);
  });

  it('car fitness increases over time', () => {
    const car = new Car({ x: 0, y: 0, controlType: 'AI' });
    car.brain = makeKnownForwardBrain();
    expect(car.fitness).toBe(0);
    for (let i = 0; i < 50; i++) {
      car.update([], [], []);
    }
    expect(car.fitness).toBeGreaterThan(0);
  });

  it('car stops when hitting a border (becomes damaged)', () => {
    const car = new Car({ x: 0, y: 0, controlType: 'AI' });
    car.brain = makeKnownForwardBrain();
    const wall = makeWallY(-5, 5);
    car.update([wall], [], []);
    expect(car.damaged).toBe(true);
    expect(car.speed).toBe(0);
  });

  it('stateAware sensor reads traffic control state', () => {
    const car = new Car({
      x: 200,
      y: 200,
      controlType: 'AI',
      sensor: { stateAware: true, rayCount: 3 },
    });
    car.brain = makeAllZeroBrain();

    const tcPolygon: Point[] = [
      { x: 195, y: 150 } as Point,
      { x: 205, y: 150 } as Point,
      { x: 205, y: 100 } as Point,
      { x: 195, y: 100 } as Point,
    ];
    const trafficControls: SensorTrafficControl[] = [
      { polygon: tcPolygon, state: 'red' },
    ];

    car.update([], trafficControls, []);

    const trafficReading = car.sensor!.sensorReadings.find(
      (r) => r !== null && r.type === 'trafficControl',
    );
    expect(trafficReading).toBeDefined();
    expect(trafficReading!.state).toBe(encodeTrafficState('red'));
  });
});

describe('Car with known brain', () => {
  it('Known forward brain makes car go forward', () => {
    const car = new Car({ x: 0, y: 0, controlType: 'AI' });
    car.brain = makeKnownForwardBrain();
    car.update([], [], []);
    expect(car.controls.forward).toBe(true);
    expect(car.speed).toBeGreaterThan(0);
  });

  it('Known reverse brain makes car reverse', () => {
    const car = new Car({ x: 0, y: 0, controlType: 'AI' });
    car.brain = makeKnownReverseBrain();
    car.update([], [], []);
    expect(car.controls.reverse).toBe(true);
    expect(car.speed).toBeLessThan(0);
  });

  it('Brain with all-zero outputs keeps car stationary', () => {
    const car = new Car({ x: 0, y: 0, controlType: 'AI' });
    car.brain = makeAllZeroBrain();
    car.update([], [], []);
    expect(car.controls.forward).toBe(false);
    expect(car.controls.reverse).toBe(false);
    expect(car.speed).toBe(0);
  });
});

describe('Multiple cars simulation', () => {
  it('Multiple AI cars can be updated independently', () => {
    const car1 = new Car({ x: 0, y: 0, controlType: 'AI' });
    car1.brain = makeKnownForwardBrain();
    const car2 = new Car({ x: 100, y: 0, controlType: 'AI' });
    car2.brain = makeKnownForwardBrain();

    for (let i = 0; i < 10; i++) {
      car1.update([], [], []);
      car2.update([], [], []);
    }

    expect(car1.speed).toBeGreaterThan(0);
    expect(car2.speed).toBeGreaterThan(0);
    expect(car1.x).not.toBe(car2.x);
  });

  it('Each car has its own brain and sensor state', () => {
    const car1 = new Car({ x: 0, y: 0, controlType: 'AI' });
    car1.brain = makeKnownForwardBrain();
    const car2 = new Car({ x: 0, y: 100, controlType: 'AI' });
    car2.brain = makeAllZeroBrain();

    expect(car1.brain).not.toBe(car2.brain);
    expect(car1.sensor).not.toBe(car2.sensor);

    car1.update([], [], []);
    car2.update([], [], []);

    expect(car1.speed).toBeGreaterThan(0);
    expect(car2.speed).toBe(0);
  });
});
