import { describe, it, expect } from 'vitest';
import { setupImageMock } from '../../helpers/setupImageMock.js';

setupImageMock();

import { Car } from '../../../ts/car/car.js';
import { CarBrainAdapter } from '../../../ts/car/brain/carBrainAdapter.js';
import { NeuralNetwork } from '../../../ts/neural-network/network.js';
import type { Point } from '../../../ts/math/primitives/point.js';

describe('Car.update() integration', () => {
  describe('DUMMY car stays in place', () => {
    it('stays in place when controls.forward is set to false', () => {
      const car = new Car({ x: 100, y: 200, controlType: 'DUMMY' });
      car.controls.forward = false;
      car.update([], []);
      expect(car.x).toBe(100);
      expect(car.y).toBe(200);
      expect(car.speed).toBe(0);
      expect(car.damaged).toBe(false);
    });
  });

  describe('DUMMY car moves forward', () => {
    it('moves forward when controls.forward is true', () => {
      const car = new Car({
        x: 100,
        y: 200,
        angle: 0, // 0 = facing up (decreasing y)
        controlType: 'DUMMY',
      });
      car.controls.forward = true;
      car.update([], []);
      expect(car.speed).toBeGreaterThan(0);
      expect(car.y).toBeLessThan(200);
    });
  });

  describe('AI car sensor integration', () => {
    it('sensor readings produce non-zero brain inputs near obstacles', () => {
      const car = new Car({ x: 500, y: 500, angle: 0, controlType: 'AI' });
      car.setCallbacks({ onDamaged: () => {}, onEngineUpdate: () => {} });

      const wall: Point[] = [
        { x: 520, y: 480 } as Point,
        { x: 530, y: 480 } as Point,
        { x: 530, y: 520 } as Point,
        { x: 520, y: 520 } as Point,
      ];

      car.update([wall], []);

      const inputs = CarBrainAdapter.buildInput(
        car.sensor!.readings,
        car.speed,
        car.maxSpeed,
        car.sensor!.stateAware ? car.sensor!.sensorReadings : undefined,
        car.sensor!.stateAware,
      );

      // Some reading offsets should be < 1 (indicating detection)
      const hasDetections = inputs.slice(0, -1).some((r: number) => r < 1);
      expect(hasDetections).toBe(true);
      expect(inputs.length).toBe(6); // 5 ray readings + 1 speed
    });
  });

  describe('state-aware sensor', () => {
    it('state-aware AI car update does not crash', () => {
      const brain = new NeuralNetwork([11, 6, 4]);
      brain.levels[brain.levels.length - 1].biases[0] = -1;

      const car = new Car({
        x: 100,
        y: 200,
        angle: 0,
        controlType: 'AI',
        sensor: { stateAware: true },
      });
      car.brain = brain;
      car.setCallbacks({ onDamaged: () => {}, onEngineUpdate: () => {} });

      expect(() => car.update([], [])).not.toThrow();
      expect(car.sensor!.stateAware).toBe(true);
      expect(car.sensor!.sensorReadings.length).toBe(5);
    });

    it('state-aware car with traffic controls does not crash', () => {
      const brain = new NeuralNetwork([11, 6, 4]);
      brain.levels[brain.levels.length - 1].biases[0] = -1;

      const car = new Car({
        x: 100,
        y: 200,
        angle: 0,
        controlType: 'AI',
        sensor: { stateAware: true },
      });
      car.brain = brain;
      car.setCallbacks({ onDamaged: () => {}, onEngineUpdate: () => {} });

      const trafficControls = [
        {
          polygon: [
            { x: 120, y: 180 } as Point,
            { x: 130, y: 180 } as Point,
            { x: 130, y: 200 } as Point,
            { x: 120, y: 200 } as Point,
          ],
          state: 'red' as const,
        },
      ];

      expect(() => car.update([], trafficControls)).not.toThrow();
    });
  });
});
