import { describe, it, expect } from 'vitest';
import {
  getSortedAICars,
  getTopAICars,
  applyPoolToCars,
} from '../../../ts/simulator/training/genetics/poolManager.js';
import { NeuralNetwork } from '../../../ts/neural-network/network.js';

interface MockCar {
  brain?: unknown;
  type: string;
  name?: string;
}

function makeMockCar(
  overrides: Partial<MockCar> & { brain?: unknown; type?: string },
): MockCar {
  const brain =
    'brain' in overrides ? overrides.brain : new NeuralNetwork([6, 6, 4]);
  return {
    brain,
    type: overrides.type ?? 'AI',
    name: overrides.name ?? 'test',
  };
}

function makePoolEntry(brain: NeuralNetwork) {
  return {
    brain,
    maxSpeed: 3,
    acceleration: 0.01,
    friction: 0.002,
    width: 25,
    height: 63,
    sensor: {
      rayCount: 5,
      raySpread: 1.57,
      rayLength: 200,
      rayOffset: 0,
      stateAware: false,
    },
  };
}

describe('poolManager (edge coverage)', () => {
  describe('getSortedAICars', () => {
    it('filters out KEYS cars', () => {
      const cars = [makeMockCar({ type: 'KEYS' }), makeMockCar({})];
      const sorted = getSortedAICars(cars, () => 1);
      expect(sorted.length).toBe(1);
      expect(sorted[0].type).toBe('AI');
    });

    it('sorts by fitness descending', () => {
      const cars = [
        makeMockCar({ name: 'low' }),
        makeMockCar({ name: 'high' }),
      ];
      const sorted = getSortedAICars(cars, (c: unknown) =>
        (c as MockCar).name === 'high' ? 10 : 1,
      );
      expect(sorted.length).toBe(2);
      expect(sorted[0].name).toBe('high');
      expect(sorted[1].name).toBe('low');
    });

    it('empty array returns empty', () => {
      const sorted = getSortedAICars([], () => 1);
      expect(sorted).toEqual([]);
    });

    it('all KEYS returns empty', () => {
      const cars = [
        makeMockCar({ type: 'KEYS' }),
        makeMockCar({ type: 'KEYS' }),
      ];
      const sorted = getSortedAICars(cars, () => 1);
      expect(sorted).toEqual([]);
    });

    it('equal fitness keeps all entries', () => {
      const cars = [makeMockCar({}), makeMockCar({})];
      const sorted = getSortedAICars(cars, () => 5);
      expect(sorted.length).toBe(2);
    });
  });

  describe('getTopAICars', () => {
    it('fitness ties keep all entries', () => {
      const cars = [makeMockCar({}), makeMockCar({})];
      const top = getTopAICars(cars, () => 5, 5);
      expect(top.length).toBe(2);
    });

    it('more AI cars than k returns top k', () => {
      const cars = [
        makeMockCar({ name: 'a' }),
        makeMockCar({ name: 'b' }),
        makeMockCar({ name: 'c' }),
        makeMockCar({ name: 'd' }),
        makeMockCar({ name: 'e' }),
      ];
      const top = getTopAICars(
        cars,
        (c: unknown) =>
          (c as MockCar).name === 'a'
            ? 10
            : (c as MockCar).name === 'b'
              ? 8
              : (c as MockCar).name === 'c'
                ? 6
                : (c as MockCar).name === 'd'
                  ? 4
                  : 2,
        3,
      );
      expect(top.length).toBe(3);
      expect(top[0].name).toBe('a');
      expect(top[1].name).toBe('b');
      expect(top[2].name).toBe('c');
    });
  });

  describe('applyPoolToCars', () => {
    it('empty pool does nothing', () => {
      const brain = new NeuralNetwork([6, 6, 4]);
      const car = makeMockCar({ brain });
      applyPoolToCars([car], [], 0.1);
      expect(car.brain).toBe(brain);
    });

    it('pool with compatible brains copies to AI cars', () => {
      const sourceBrain = new NeuralNetwork([6, 6, 4]);
      const targetBrain = new NeuralNetwork([6, 6, 4]);
      const car = makeMockCar({ brain: targetBrain });
      applyPoolToCars([car], [makePoolEntry(sourceBrain)], 0.1);
      expect(car.brain).not.toBe(sourceBrain);
      expect(car.brain).not.toBe(targetBrain);
    });

    it('KEYS cars are skipped', () => {
      const sourceBrain = new NeuralNetwork([6, 6, 4]);
      const targetBrain = new NeuralNetwork([6, 6, 4]);
      const keysCar = makeMockCar({ type: 'KEYS', brain: targetBrain });
      applyPoolToCars([keysCar], [makePoolEntry(sourceBrain)], 0.1);
      expect(keysCar.brain).toBe(targetBrain);
    });

    it('more AI cars than brains uses mutateFromPool', () => {
      const sourceBrain = new NeuralNetwork([6, 6, 4]);
      const targetBrain1 = new NeuralNetwork([6, 6, 4]);
      const targetBrain2 = new NeuralNetwork([6, 6, 4]);
      const cars = [
        makeMockCar({ brain: targetBrain1 }),
        makeMockCar({ brain: targetBrain2 }),
      ];
      applyPoolToCars(cars, [makePoolEntry(sourceBrain)], 0.1);
      expect(cars[0].brain).not.toBe(targetBrain1);
      expect(cars[1].brain).not.toBe(targetBrain2);
    });

    it('incompatible brain in pool skipped for direct copy', () => {
      const sourceBrain = new NeuralNetwork([10, 6, 4]);
      const targetBrain = new NeuralNetwork([6, 6, 4]);
      const car = makeMockCar({ brain: targetBrain });
      applyPoolToCars([car], [makePoolEntry(sourceBrain)], 0.1);
      expect(car.brain).toBe(targetBrain);
    });
  });
});
