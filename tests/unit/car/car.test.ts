import { describe, it, expect, vi } from 'vitest';
import { setupImageMock } from '../../helpers/setupImageMock.js';

setupImageMock();

import { Car } from '../../../ts/car/car.js';
import type { CarInfo } from '../../../ts/car/car.js';
import type { CarOptions } from '../../../ts/car/car.js';
import { CarBrainAdapter } from '../../../ts/car/brain/carBrainAdapter.js';
import { NeuralNetwork } from '../../../ts/neural-network/network.js';
import { makeKnownNetwork } from '../../helpers/makeKnownNetwork.js';
import { DEFAULT_CAR_CONFIG } from '../../../ts/car/config.js';
import type { Point } from '../../../ts/math/primitives/point.js';

function makeCarInfo(overrides: Partial<CarInfo> = {}): CarInfo {
  return {
    maxSpeed: 3.24,
    friction: 0.002,
    acceleration: 0.01,
    width: 25,
    height: 63,
    hiddenLayers: [6],
    sensor: {
      rayCount: 5,
      raySpread: Math.PI / 2,
      rayLength: 150,
      rayOffset: 0,
      stateAware: false,
    },
    ...overrides,
  };
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

function makeWallY(yStart: number, yEnd: number, xSpan: number = 15): Point[] {
  return [
    { x: -xSpan, y: yStart } as Point,
    { x: xSpan, y: yStart } as Point,
    { x: xSpan, y: yEnd } as Point,
    { x: -xSpan, y: yEnd } as Point,
  ];
}

const defaultOpts: CarOptions = { x: 0, y: 0, controlType: 'DUMMY' };

describe('Car construction', () => {
  it('DUMMY type creates car with default properties', () => {
    const car = new Car(defaultOpts);
    expect(car.x).toBe(0);
    expect(car.y).toBe(0);
    expect(car.width).toBe(DEFAULT_CAR_CONFIG.width);
    expect(car.height).toBe(DEFAULT_CAR_CONFIG.height);
    expect(car.speed).toBe(0);
    expect(car.damaged).toBe(false);
    expect(car.fitness).toBe(0);
    expect(car.angle).toBe(0);
    expect(car.type).toBe('DUMMY');
  });

  it('DUMMY type has no sensor or brain', () => {
    const car = new Car(defaultOpts);
    expect(car.sensor).toBeUndefined();
    expect(car.brain).toBeUndefined();
  });

  it('AI type creates car with sensor and brain', () => {
    const car = new Car({ x: 0, y: 0, controlType: 'AI' });
    expect(car.sensor).toBeDefined();
    expect(car.brain).toBeDefined();
  });

  it('AI type uses correct layer sizes', () => {
    const car = new Car({ x: 0, y: 0, controlType: 'AI' });
    const nn = car.brain as NeuralNetwork;
    expect(nn.levels[0].inputs.length).toBe(6);
    expect(nn.levels[0].outputs.length).toBe(6);
    expect(nn.levels[1].inputs.length).toBe(6);
    expect(nn.levels[1].outputs.length).toBe(4);
  });

  it('custom options override defaults', () => {
    const car = new Car({
      x: 10,
      y: 20,
      controlType: 'DUMMY',
      width: 50,
      height: 100,
      maxSpeed: 10,
      acceleration: 0.5,
      friction: 0.1,
      angle: Math.PI / 4,
      color: 'red',
    });
    expect(car.x).toBe(10);
    expect(car.y).toBe(20);
    expect(car.width).toBe(50);
    expect(car.height).toBe(100);
    expect(car.maxSpeed).toBe(10);
    expect(car.acceleration).toBe(0.5);
    expect(car.friction).toBe(0.1);
    expect(car.angle).toBe(Math.PI / 4);
    expect(car.color).toBe('red');
  });

  it('AI car type is AI', () => {
    const car = new Car({ x: 0, y: 0, controlType: 'AI' });
    expect(car.type).toBe('AI');
  });

  it('KEYS type throws in Node (document-dependent)', () => {
    expect(() => new Car({ x: 0, y: 0, controlType: 'KEYS' })).toThrow();
  });
});

describe('toInfo / toDrawData', () => {
  it('DUMMY car toInfo returns all fields with brain undefined', () => {
    const car = new Car(defaultOpts);
    const info = car.toInfo();
    expect(info.brain).toBeUndefined();
    expect(info.maxSpeed).toBe(3.24);
    expect(info.friction).toBe(0.002);
    expect(info.acceleration).toBe(0.01);
    expect(info.width).toBe(25);
    expect(info.height).toBe(63);
    expect(info.hiddenLayers).toEqual([6]);
    expect(info.sensor.rayCount).toBe(5);
    expect(info.sensor.raySpread).toBe(Math.PI / 2);
    expect(info.sensor.rayLength).toBe(150);
    expect(info.sensor.rayOffset).toBe(0);
    expect(info.sensor.stateAware).toBe(false);
  });

  it('AI car toInfo includes serialized brain', () => {
    const car = new Car({ x: 0, y: 0, controlType: 'AI' });
    const info = car.toInfo();
    expect(info.brain).toBeDefined();
  });

  it('toDrawData returns polygon, color, damaged, position, size', () => {
    const car = new Car(defaultOpts);
    const data = car.toDrawData();
    expect(data.polygon.length).toBe(4);
    expect(data.color).toBe('blue');
    expect(data.damaged).toBe(false);
    expect(data.x).toBe(0);
    expect(data.y).toBe(0);
    expect(data.angle).toBe(0);
    expect(data.width).toBe(25);
    expect(data.height).toBe(63);
  });

  it('toDrawData sensor matches car.sensor', () => {
    const car = new Car({ x: 0, y: 0, controlType: 'AI' });
    const data = car.toDrawData();
    expect(data.sensor).toBe(car.sensor);
  });
});

describe('load(info)', () => {
  it('load brain updates car brain', () => {
    const car = new Car({ x: 0, y: 0, controlType: 'AI' });
    const originalBrain = car.brain;
    const newBrain = CarBrainAdapter.createBrain([6, 6, 4]);
    const info = makeCarInfo({ brain: CarBrainAdapter.serialize(newBrain) });
    car.load(info);
    expect(car.brain).not.toBe(originalBrain);
  });

  it('load changes dimensions and polygon recalculated', () => {
    const car = new Car(defaultOpts);
    const oldPoly = [...car.polygon];
    const info = makeCarInfo({ width: 50, height: 100 });
    car.load(info);
    expect(car.width).toBe(50);
    expect(car.height).toBe(100);
    expect(car.polygon).not.toEqual(oldPoly);
  });

  it('load changes sensor config', () => {
    const car = new Car({ x: 0, y: 0, controlType: 'AI' });
    const info = makeCarInfo({
      sensor: {
        rayCount: 10,
        raySpread: Math.PI,
        rayLength: 200,
        rayOffset: 0.5,
        stateAware: true,
      },
    });
    car.load(info);
    expect(car.sensor!.rayCount).toBe(10);
    expect(car.sensor!.raySpread).toBe(Math.PI);
    expect(car.sensor!.rayLength).toBe(200);
    expect(car.sensor!.rayOffset).toBe(0.5);
    expect(car.sensor!.stateAware).toBe(true);
  });

  it('load with changed sensor no brain creates new brain', () => {
    const car = new Car({ x: 0, y: 0, controlType: 'AI' });
    const before = car.brain;
    const info = makeCarInfo({
      sensor: {
        rayCount: 7,
        raySpread: Math.PI / 2,
        rayLength: 150,
        rayOffset: 0,
        stateAware: false,
      },
    });
    car.load(info);
    expect(car.brain).toBeDefined();
    expect(car.brain).not.toBe(before);
  });

  it('brain desync guard clears incompatible brain', () => {
    const car = new Car({ x: 0, y: 0, controlType: 'AI' });
    const smallBrain = makeKnownNetwork(
      [6, 6, 4],
      [
        Array.from({ length: 6 }, () => Array(6).fill(0)),
        Array.from({ length: 6 }, () => Array(4).fill(0)),
      ],
      [Array(6).fill(0.1), Array(4).fill(0.1)],
    );
    const info = makeCarInfo({
      sensor: {
        rayCount: 10,
        raySpread: Math.PI / 2,
        rayLength: 150,
        rayOffset: 0,
        stateAware: false,
      },
      brain: CarBrainAdapter.serialize(smallBrain),
    });
    car.load(info);
    expect(car.brain).toBeUndefined();
  });

  it('brain desync guard keeps compatible brain', () => {
    const car = new Car({ x: 0, y: 0, controlType: 'AI' });
    const compatBrain = makeKnownNetwork(
      [6, 6, 4],
      [
        Array.from({ length: 6 }, () => Array(6).fill(0)),
        Array.from({ length: 6 }, () => Array(4).fill(0)),
      ],
      [Array(6).fill(0.1), Array(4).fill(0.1)],
    );
    const info = makeCarInfo({
      sensor: {
        rayCount: 5,
        raySpread: Math.PI / 2,
        rayLength: 150,
        rayOffset: 0,
        stateAware: false,
      },
      brain: CarBrainAdapter.serialize(compatBrain),
    });
    car.load(info);
    expect(car.brain).toBeDefined();
  });

  it('load applies hiddenLayers', () => {
    const car = new Car({ x: 0, y: 0, controlType: 'AI' });
    expect(car.hiddenLayers).toEqual([6]);
    const info = makeCarInfo({ hiddenLayers: [8, 4] });
    car.load(info);
    expect(car.hiddenLayers).toEqual([8, 4]);
  });

  it('DUMMY car load without brain keeps brain undefined', () => {
    const car = new Car({ x: 0, y: 0, controlType: 'DUMMY' });
    const info = makeCarInfo({});
    delete (info as { brain?: unknown }).brain;
    car.load(info);
    expect(car.brain).toBeUndefined();
  });
});

describe('setAutopilot / learningFromHuman', () => {
  it('setAutopilot(true) freezes controls on AI car', () => {
    const car = new Car({ x: 0, y: 0, controlType: 'AI' });
    car.setAutopilot(true);
    expect(car.controls.frozen).toBe(true);
  });

  it('setAutopilot(true) works on DUMMY (Controls instance)', () => {
    const car = new Car(defaultOpts);
    car.setAutopilot(true);
    expect(car.controls.frozen).toBe(true);
  });

  it('setAutopilot(false) clears controls', () => {
    const car = new Car({ x: 0, y: 0, controlType: 'AI' });
    car.controls.forward = true;
    car.controls.left = true;
    car.setAutopilot(false);
    expect(car.controls.forward).toBe(false);
    expect(car.controls.left).toBe(false);
    expect(car.controls.right).toBe(false);
    expect(car.controls.reverse).toBe(false);
    expect(car.controls.frozen).toBe(false);
  });

  it('autopilot getter returns correct value', () => {
    const car = new Car({ x: 0, y: 0, controlType: 'AI' });
    expect(car.autopilot).toBe(false);
    car.setAutopilot(true);
    expect(car.autopilot).toBe(true);
    car.setAutopilot(false);
    expect(car.autopilot).toBe(false);
  });

  it('setLearningFromHuman get/set', () => {
    const car = new Car(defaultOpts);
    expect(car.learningFromHuman).toBe(false);
    car.setLearningFromHuman(true);
    expect(car.learningFromHuman).toBe(true);
    car.setLearningFromHuman(false);
    expect(car.learningFromHuman).toBe(false);
  });
});

describe('setCallbacks', () => {
  it('setting callbacks does not throw', () => {
    const car = new Car(defaultOpts);
    expect(() =>
      car.setCallbacks({
        onDamaged: () => {},
        onEngineUpdate: () => {},
      }),
    ).not.toThrow();
  });

  it('onDamaged fires on collision', () => {
    const car = new Car(defaultOpts);
    const onDamaged = vi.fn();
    car.setCallbacks({ onDamaged });
    const wall = makeWallY(-5, 5);
    car.update([wall]);
    expect(onDamaged).toHaveBeenCalled();
  });

  it('onEngineUpdate fires during update', () => {
    const car = new Car(defaultOpts);
    const onEngineUpdate = vi.fn();
    car.setCallbacks({ onEngineUpdate });
    car.update([], [], []);
    expect(onEngineUpdate).toHaveBeenCalledTimes(1);
    expect(onEngineUpdate).toHaveBeenCalledWith(
      expect.any(Number),
      car.maxSpeed,
    );
  });

  it('onEngineUpdate not called when no callback registered', () => {
    const car = new Car(defaultOpts);
    expect(() => car.update([], [], [])).not.toThrow();
  });
});

describe('respawn', () => {
  it('respawn resets position', () => {
    const car = new Car(defaultOpts);
    car.respawn({ x: 100, y: 200, angle: 0.5 });
    expect(car.x).toBe(100);
    expect(car.y).toBe(200);
    expect(car.angle).toBe(0.5);
  });

  it('respawn resets speed to 0', () => {
    const car = new Car(defaultOpts);
    car.update([], [], []);
    expect(car.speed).toBeGreaterThan(0);
    car.respawn({ x: 0, y: 0, angle: 0 });
    expect(car.speed).toBe(0);
  });

  it('respawn clears damage', () => {
    const car = new Car(defaultOpts);
    car.damaged = true;
    car.respawn({ x: 0, y: 0, angle: 0 });
    expect(car.damaged).toBe(false);
  });

  it('respawn recalculates polygon', () => {
    const car = new Car(defaultOpts);
    const oldPoly = [...car.polygon];
    car.respawn({ x: 50, y: 50, angle: Math.PI / 4 });
    expect(car.polygon).not.toEqual(oldPoly);
    expect(car.polygon.length).toBe(4);
  });

  it('respawn resets fitness to 0', () => {
    const car = new Car(defaultOpts);
    car.fitness = 100;
    car.respawn({ x: 0, y: 0, angle: 0 });
    expect(car.fitness).toBe(0);
  });
});

describe('DUMMY update (physics only)', () => {
  it('DUMMY update moves forward', () => {
    const car = new Car(defaultOpts);
    expect(car.speed).toBe(0);
    car.update([], [], []);
    expect(car.speed).toBeGreaterThan(0);
    expect(car.damaged).toBe(false);
  });

  it('DUMMY update with collision sets damaged', () => {
    const car = new Car(defaultOpts);
    const wall = makeWallY(-5, 5);
    car.update([wall]);
    expect(car.damaged).toBe(true);
    expect(car.speed).toBe(0);
  });
});

describe('AI update (full pipeline)', () => {
  it('AI update with known brain drives forward', () => {
    const car = new Car({ x: 0, y: 0, controlType: 'AI' });
    car.brain = makeKnownForwardBrain();
    car.update([], [], []);
    expect(car.speed).toBeGreaterThan(0);
    expect(car.controls.forward).toBe(true);
  });

  it('AI car sensor updates each frame', () => {
    const car = new Car({ x: 0, y: 0, controlType: 'AI' });
    car.update([], [], []);
    expect(car.sensor!.readings.length).toBe(5);
    expect(car.sensor!.rays.length).toBe(5);
  });

  it('AI car polygon recalculated after update', () => {
    const car = new Car({ x: 0, y: 0, controlType: 'AI' });
    car.brain = makeKnownForwardBrain();
    const before = [...car.polygon];
    car.update([], [], []);
    expect(car.polygon).not.toEqual(before);
  });

  it('AI car with collision wall becomes damaged', () => {
    const car = new Car({ x: 0, y: 0, controlType: 'AI' });
    car.brain = makeKnownForwardBrain();
    const wall = makeWallY(-5, 5);
    car.update([wall]);
    expect(car.damaged).toBe(true);
  });
});

describe('Steering', () => {
  it('Zero speed does not change angle', () => {
    const car = new Car(defaultOpts);
    car.controls.forward = false;
    car.controls.left = true;
    car.update([], [], []);
    expect(car.angle).toBe(0);
  });

  it('Forward + left increases angle', () => {
    const car = new Car(defaultOpts);
    car.controls.left = true;
    car.update([], [], []);
    const angleBefore = car.angle;
    car.update([], [], []);
    expect(car.angle).toBeGreaterThan(angleBefore);
  });

  it('Forward + right decreases angle', () => {
    const car = new Car(defaultOpts);
    car.controls.right = true;
    car.update([], [], []);
    const angleBefore = car.angle;
    car.update([], [], []);
    expect(car.angle).toBeLessThan(angleBefore);
  });
});

describe('learningRate', () => {
  it('default learning rate is 0.1', () => {
    const car = new Car(defaultOpts);
    expect(car.learningRate).toBe(0.1);
  });

  it('set learning rate via property setter', () => {
    const car = new Car(defaultOpts);
    car.learningRate = 0.5;
    expect(car.learningRate).toBe(0.5);
  });

  it('setLearningRate method works', () => {
    const car = new Car(defaultOpts);
    car.setLearningRate(0.75);
    expect(car.learningRate).toBe(0.75);
  });
});

describe('lastBrainOutput / brainChangedThisFrame', () => {
  it('DUMMY car has default lastBrainOutput', () => {
    const car = new Car(defaultOpts);
    expect(car.lastBrainOutput).toEqual({
      forward: false,
      left: false,
      right: false,
      reverse: false,
    });
  });

  it('brainChangedThisFrame defaults to false', () => {
    const car = new Car(defaultOpts);
    expect(car.brainChangedThisFrame).toBe(false);
  });
});

describe('fromInfo', () => {
  it('fromInfo creates car and loads info', () => {
    const car = Car.fromInfo(defaultOpts);
    expect(car.x).toBe(0);
    expect(car.y).toBe(0);
    expect(car.speed).toBe(0);
  });

  it('fromInfo with null info creates car without load', () => {
    const car = Car.fromInfo(defaultOpts, null);
    expect(car.x).toBe(0);
  });
});

describe('Edge cases', () => {
  it('Update with empty polygons — no crash', () => {
    const car = new Car(defaultOpts);
    expect(() => car.update([])).not.toThrow();
  });

  it('Update with traffic controls parameter — no crash', () => {
    const car = new Car(defaultOpts);
    expect(() => car.update([], [])).not.toThrow();
  });

  it('Update with other cars parameter — no crash', () => {
    const car = new Car(defaultOpts);
    expect(() => car.update([], [], [])).not.toThrow();
  });

  it('Update with all three extra params — no crash', () => {
    const car = new Car({ x: 0, y: 0, controlType: 'AI' });
    const wall = makeWallY(-5, 5);
    const otherCar = makeWallY(-100, -80);
    expect(() => car.update([wall], [], [otherCar])).not.toThrow();
  });

  it('AI car with brain set to undefined hits sensor-only path — no crash', () => {
    const car = new Car({ x: 0, y: 0, controlType: 'AI' });
    car.brain = undefined;
    expect(() => car.update([], [], [])).not.toThrow();
  });

  it('AI car with sensor but no brain still updates sensor readings', () => {
    const car = new Car({ x: 0, y: 0, controlType: 'AI' });
    car.brain = undefined;
    car.update([], [], []);
    expect(car.sensor!.readings.length).toBe(5);
  });

  it('learningFromHuman with known brain does not crash', () => {
    const car = new Car({ x: 0, y: 0, controlType: 'AI' });
    car.brain = makeKnownForwardBrain();
    car.setLearningFromHuman(true);
    for (let i = 0; i < 5; i++) {
      expect(() => car.update([], [], [])).not.toThrow();
    }
  });

  it('learningFromHuman with many frames exercises batch path', () => {
    const car = new Car({ x: 0, y: 0, controlType: 'AI' });
    car.brain = makeKnownForwardBrain();
    car.setLearningFromHuman(true);
    for (let i = 0; i < 30; i++) {
      expect(() => car.update([], [], [])).not.toThrow();
    }
  });
});

describe('Car edge cases', () => {
  it('update with null brain does not crash AI car', () => {
    const car = new Car({ x: 0, y: 0, controlType: 'AI' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (car as any).brain = null;
    expect(() => car.update([], [], [])).not.toThrow();
  });

  it('load with malformed CarInfo recovers gracefully', () => {
    const car = new Car(defaultOpts);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const badInfo: any = {
      maxSpeed: 5,
      friction: 0.01,
      acceleration: 0.05,
    };
    expect(() => car.load(badInfo)).not.toThrow();
    expect(car.maxSpeed).toBe(5);
  });

  it('respawn after collision resets speed and damage', () => {
    const car = new Car(defaultOpts);
    const wall = makeWallY(-5, 5);
    car.update([wall]);
    expect(car.damaged).toBe(true);
    expect(car.speed).toBe(0);
    car.respawn({ x: 0, y: 0, angle: 0 });
    expect(car.damaged).toBe(false);
    expect(car.speed).toBe(0);
  });

  it('setAutopilot on then off clears controls and unfreezes', () => {
    const car = new Car({ x: 0, y: 0, controlType: 'AI' });
    car.setAutopilot(true);
    expect(car.controls.frozen).toBe(true);
    car.setAutopilot(false);
    expect(car.controls.forward).toBe(false);
    expect(car.controls.left).toBe(false);
    expect(car.controls.right).toBe(false);
    expect(car.controls.reverse).toBe(false);
    expect(car.controls.frozen).toBe(false);
  });

  it('multiple setCallbacks calls only fire latest', () => {
    const car = new Car(defaultOpts);
    const first = vi.fn();
    const second = vi.fn();
    car.setCallbacks({ onDamaged: first });
    car.setCallbacks({ onDamaged: second });
    const wall = makeWallY(-5, 5);
    car.update([wall]);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalled();
  });

  it('car with zero width/height does not crash update', () => {
    const car = new Car({
      x: 0,
      y: 0,
      controlType: 'DUMMY',
      width: 0,
      height: 0,
    });
    expect(() => car.update([], [], [])).not.toThrow();
  });
});
