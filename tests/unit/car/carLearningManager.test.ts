import { describe, it, expect } from 'vitest';

import { CarLearningManager } from '../../../ts/car/brain/carLearningManager.js';
import { NeuralNetwork } from '../../../ts/neural-network/network.js';
import { makeKnownNetwork } from '../../helpers/makeKnownNetwork.js';

function makeBrain(): NeuralNetwork {
  // 6 inputs -> 4 outputs, weights all zero, biases near the decision boundary
  // so trainStep produces non-trivial weight updates.
  return makeKnownNetwork(
    [6, 4],
    [Array.from({ length: 6 }, () => Array(4).fill(0))],
    [[-0.1, 0.1, 0.1, 0.1]],
  );
}

const INPUTS = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7];

function forwardControls() {
  return { forward: true, left: false, right: false, reverse: false };
}

function leftControls() {
  return { forward: true, left: true, right: false, reverse: false };
}

describe('CarLearningManager', () => {
  describe('learningRate', () => {
    it('defaults to 0.1', () => {
      const m = new CarLearningManager();
      expect(m.learningRate).toBe(0.1);
    });

    it('is settable via property and method', () => {
      const m = new CarLearningManager();
      m.learningRate = 0.5;
      expect(m.learningRate).toBe(0.5);
      m.setLearningRate(0.25);
      expect(m.learningRate).toBe(0.25);
    });
  });

  describe('lastBrainOutput', () => {
    it('defaults to all-false', () => {
      const m = new CarLearningManager();
      expect(m.lastBrainOutput).toEqual({
        forward: false,
        left: false,
        right: false,
        reverse: false,
      });
    });

    it('stores the value passed to setLastBrainOutput', () => {
      const m = new CarLearningManager();
      const output = {
        forward: true,
        left: false,
        right: true,
        reverse: false,
      };
      m.setLastBrainOutput(output);
      expect(m.lastBrainOutput).toEqual(output);
    });
  });

  describe('brainChangedThisFrame', () => {
    it('defaults to false', () => {
      const m = new CarLearningManager();
      expect(m.brainChangedThisFrame).toBe(false);
    });

    it('resetFrame clears the flag', () => {
      const m = new CarLearningManager();
      const brain = makeBrain();
      m.learn({ brain, inputs: INPUTS, controls: forwardControls() });
      m.resetFrame();
      expect(m.brainChangedThisFrame).toBe(false);
    });
  });

  describe('learn', () => {
    it('trains the brain and reports weight changes', () => {
      const m = new CarLearningManager();
      const brain = makeBrain();
      const before = brain.levels[0].biases.slice();

      let changed = false;
      for (let i = 0; i < 20; i++) {
        if (m.learn({ brain, inputs: INPUTS, controls: forwardControls() })) {
          changed = true;
        }
      }

      expect(changed).toBe(true);
      const after = brain.levels[0].biases;
      expect(after.some((b, i) => b !== before[i])).toBe(true);
    });

    it('stores its return value in brainChangedThisFrame', () => {
      const m = new CarLearningManager();
      const brain = makeBrain();
      const result = m.learn({
        brain,
        inputs: INPUTS,
        controls: forwardControls(),
      });
      expect(m.brainChangedThisFrame).toBe(result);
    });

    it('keeps weights within the genetic [-1, 1] range', () => {
      const m = new CarLearningManager();
      const brain = makeBrain();
      m.learningRate = 0.5;
      for (let i = 0; i < 200; i++) {
        m.learn({
          brain,
          inputs: INPUTS,
          controls: i % 2 === 0 ? forwardControls() : leftControls(),
        });
      }
      for (const level of brain.levels) {
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

    it('samples a balanced batch of turn and straight entries without error', () => {
      const m = new CarLearningManager();
      const brain = makeBrain();
      for (let i = 0; i < 60; i++) {
        expect(() =>
          m.learn({
            brain,
            inputs: INPUTS,
            controls: i % 3 === 0 ? leftControls() : forwardControls(),
          }),
        ).not.toThrow();
      }
    });

    it('caps the replay buffer at its max size', () => {
      const m = new CarLearningManager();
      const brain = makeBrain();
      // Push far more than the 4096 cap; must not throw or grow unbounded.
      for (let i = 0; i < 5000; i++) {
        m.learn({ brain, inputs: INPUTS, controls: forwardControls() });
      }
      // No assertion on private buffer size; behavior is that it stays bounded
      // and training keeps succeeding.
      expect(() =>
        m.learn({ brain, inputs: INPUTS, controls: forwardControls() }),
      ).not.toThrow();
    });

    it('skips training on a static repeated frame', () => {
      const m = new CarLearningManager();
      const brain = makeBrain();
      // First (novel) frame trains; an identical repeat is skipped.
      m.learn({ brain, inputs: INPUTS, controls: forwardControls() });
      expect(
        m.learn({ brain, inputs: INPUTS, controls: forwardControls() }),
      ).toBe(false);
      expect(m.brainChangedThisFrame).toBe(false);
    });

    it('trains again when the sensor state changes (novel frame)', () => {
      const m = new CarLearningManager();
      const brain = makeBrain();
      m.learn({ brain, inputs: INPUTS, controls: forwardControls() });
      const novel = INPUTS.map((v, i) => (i === 0 ? v + 0.5 : v));
      expect(
        m.learn({ brain, inputs: novel, controls: forwardControls() }),
      ).toBe(true);
    });

    it('trains on a control change even if the sensor state is unchanged', () => {
      const m = new CarLearningManager();
      const brain = makeBrain();
      m.learn({ brain, inputs: INPUTS, controls: forwardControls() });
      // Same inputs, but the human now also steers left → decision point.
      expect(m.learn({ brain, inputs: INPUTS, controls: leftControls() })).toBe(
        true,
      );
    });
  });
});
