import { describe, it, expect } from 'vitest';
import { CarBrainAdapter } from '../../../ts/car/brain/carBrainAdapter.js';
import { NeuralNetwork } from '../../../ts/neural-network/network.js';

describe('CarBrainAdapter', () => {
  describe('inputLayerSize', () => {
    it('legacy: rayCount + 1', () => {
      expect(CarBrainAdapter.inputLayerSize(5, false)).toBe(6);
      expect(CarBrainAdapter.inputLayerSize(10, false)).toBe(11);
    });

    it('stateAware: rayCount * 2 + 1', () => {
      expect(CarBrainAdapter.inputLayerSize(5, true)).toBe(11);
      expect(CarBrainAdapter.inputLayerSize(10, true)).toBe(21);
    });
  });

  describe('buildInput', () => {
    it('legacy mode: readings map to 1-offset', () => {
      const readings = [
        { offset: 0.2, x: 0, y: 0 },
        null,
        { offset: 0.8, x: 0, y: 0 },
      ];
      const result = CarBrainAdapter.buildInput(readings, 1, 3.24);
      expect(result[0]).toBeCloseTo(0.8, 5);
      expect(result[1]).toBe(0);
      expect(result[2]).toBeCloseTo(0.2, 5);
      expect(result[3]).toBeCloseTo(1 / 3.24, 5);
    });

    it('stateAware mode: interleaves state', () => {
      const readings = [{ offset: 0.2, x: 0, y: 0 }, null];
      const sensorReadings = [
        { distance: 0.2, state: 0.5, type: 'car', x: 0, y: 0 },
        { distance: 0.8, state: 1, type: 'border', x: 0, y: 0 },
      ];
      const result = CarBrainAdapter.buildInput(
        readings,
        1,
        3.24,
        sensorReadings,
        true,
      );
      expect(result[0]).toBeCloseTo(0.8, 5);
      expect(result[1]).toBe(0.5);
      expect(result[2]).toBeCloseTo(0.2, 5);
      expect(result[3]).toBe(1);
      expect(result[4]).toBeCloseTo(1 / 3.24, 5);
    });

    it('null sensorReadings in stateAware -> state=0', () => {
      const readings = [null];
      const sensorReadings = [null];
      const result = CarBrainAdapter.buildInput(
        readings,
        0,
        3.24,
        sensorReadings,
        true,
      );
      expect(result[0]).toBe(0);
      expect(result[1]).toBe(0);
      expect(result[2]).toBe(0);
    });
  });

  describe('brainsCompatible', () => {
    it('matching architecture returns true', () => {
      const brain = new NeuralNetwork([6, 6, 4]);
      expect(CarBrainAdapter.brainsCompatible(brain, 5, false)).toBe(true);
    });

    it('different input dims returns false', () => {
      const brain = new NeuralNetwork([11, 6, 4]);
      expect(CarBrainAdapter.brainsCompatible(brain, 5, false)).toBe(false);
    });

    it('null brain returns false', () => {
      expect(CarBrainAdapter.brainsCompatible(null, 5, false)).toBe(false);
    });
  });

  describe('computeControls', () => {
    it('maps network outputs to boolean controls', () => {
      const brain = new NeuralNetwork([6, 6, 4]);
      const readings = [null, null, null, null, null];
      const controls = CarBrainAdapter.computeControls(
        readings,
        1,
        3.24,
        brain,
      );
      expect(typeof controls.forward).toBe('boolean');
      expect(typeof controls.left).toBe('boolean');
      expect(typeof controls.right).toBe('boolean');
      expect(typeof controls.reverse).toBe('boolean');
    });
  });

  describe('createBrain / serialize / deserialize round-trip', () => {
    it('createBrain returns a NeuralNetwork with correct arch', () => {
      const brain = CarBrainAdapter.createBrain([6, 6, 4]) as NeuralNetwork;
      expect(brain.levels.length).toBe(2);
      expect(brain.levels[0].inputs.length).toBe(6);
      expect(brain.levels[0].outputs.length).toBe(6);
    });

    it('serialize/deserialize round-trip preserves behavior', () => {
      const brain = CarBrainAdapter.createBrain([6, 6, 4]);
      const data = CarBrainAdapter.serialize(brain);
      const restored = CarBrainAdapter.deserialize(data);
      expect(restored).toBeDefined();
    });

    it('deserialize returns undefined for null', () => {
      expect(CarBrainAdapter.deserialize(null)).toBeUndefined();
    });
  });
});
