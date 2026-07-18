import { describe, it, expect } from 'vitest';
import {
  brainsCompatible,
  inferHiddenLayers,
  getTopAICars,
  getTopCarInfoPool,
} from '../../../ts/simulator/training/genetics/poolManager.js';
import { NeuralNetwork } from '../../../ts/neural-network/network.js';

interface MockCar {
  brain?: unknown;
  type: string;
  toInfo: () => unknown;
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
    name: 'test',
    toInfo: () => ({ brain }),
  };
}

describe('poolManager', () => {
  describe('brainsCompatible', () => {
    it('same architecture -> true', () => {
      const a = new NeuralNetwork([6, 6, 4]);
      const b = new NeuralNetwork([6, 6, 4]);
      expect(brainsCompatible(a, b)).toBe(true);
    });

    it('different architecture -> false', () => {
      const a = new NeuralNetwork([6, 6, 4]);
      const b = new NeuralNetwork([6, 5, 4]);
      expect(brainsCompatible(a, b)).toBe(false);
    });

    it('null -> false', () => {
      const a = new NeuralNetwork([6, 6, 4]);
      expect(brainsCompatible(null, a)).toBe(false);
      expect(brainsCompatible(a, null)).toBe(false);
    });
  });

  describe('inferHiddenLayers', () => {
    it('extracts correct layer sizes', () => {
      const brain = new NeuralNetwork([6, 6, 4]);
      expect(inferHiddenLayers(brain)).toEqual([6]);
    });

    it('returns null for empty brain', () => {
      expect(inferHiddenLayers(null)).toBeNull();
    });

    it('returns null for insufficient levels', () => {
      const brain = new NeuralNetwork([6, 4]);
      expect(inferHiddenLayers(brain)).toBeNull();
    });
  });

  describe('getTopAICars', () => {
    it('filters out KEYS cars', () => {
      const cars = [makeMockCar({ type: 'KEYS' }), makeMockCar({})];
      const top = getTopAICars(cars, () => 1, 5);
      expect(top.length).toBe(1);
    });

    it('sorts by fitness descending', () => {
      const cars = [makeMockCar({}), makeMockCar({})];
      const top = getTopAICars(
        cars,
        (c: unknown) => ((c as MockCar).name === 'test' ? 2 : 1),
        5,
      );
      expect(top.length).toBe(2);
    });

    it('empty cars array -> empty result', () => {
      const top = getTopAICars([], () => 1, 5);
      expect(top).toEqual([]);
    });

    it('all KEYS cars -> empty result', () => {
      const cars = [
        makeMockCar({ type: 'KEYS' }),
        makeMockCar({ type: 'KEYS' }),
      ];
      const top = getTopAICars(cars, () => 1, 5);
      expect(top).toEqual([]);
    });

    it('cars without brain -> filtered out', () => {
      const cars = [makeMockCar({ brain: undefined })];
      const top = getTopAICars(cars, () => 1, 5);
      expect(top).toEqual([]);
    });

    it('k <= 0 returns empty', () => {
      const cars = [makeMockCar({})];
      expect(getTopAICars(cars, () => 1, 0)).toEqual([]);
      expect(getTopAICars(cars, () => 1, -1)).toEqual([]);
    });
  });

  describe('getTopCarInfoPool', () => {
    it('returns correct number of entries with toInfo shape', () => {
      const cars = [makeMockCar({}), makeMockCar({})];
      const pool = getTopCarInfoPool(cars, () => 1, 2);
      expect(pool.length).toBe(2);
      expect(pool[0].brain).toBeDefined();
    });

    it('empty cars -> empty pool', () => {
      expect(getTopCarInfoPool([], () => 1, 5)).toEqual([]);
    });
  });
});
