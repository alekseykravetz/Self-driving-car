import { describe, it, expect } from 'vitest';
import { NeuralNetwork, Level } from '../../../ts/neural-network/network.js';
import { makeKnownNetwork } from '../../helpers/makeKnownNetwork.js';

describe('NeuralNetwork', () => {
  describe('constructor', () => {
    it('creates correct level structure for [2,3,1]', () => {
      const nn = new NeuralNetwork([2, 3, 1]);
      expect(nn.levels.length).toBe(2);
      expect(nn.levels[0].inputs.length).toBe(2);
      expect(nn.levels[0].outputs.length).toBe(3);
      expect(nn.levels[1].inputs.length).toBe(3);
      expect(nn.levels[1].outputs.length).toBe(1);
    });

    it('creates architecture with single layer [2,1]', () => {
      const nn = new NeuralNetwork([2, 1]);
      expect(nn.levels.length).toBe(1);
      expect(nn.levels[0].inputs.length).toBe(2);
      expect(nn.levels[0].outputs.length).toBe(1);
    });
  });

  describe('feedForward', () => {
    it('produces binary output with known weights', () => {
      const nn = makeKnownNetwork(
        [2, 3, 1],
        [
          [
            [1, 0.5, -1],
            [-0.5, 1, 0.5],
          ],
          [[0.8], [-0.3], [0.1]],
        ],
        [[0.2, -0.1, 0.5], [0.0]],
      );
      const result = NeuralNetwork.feedForward([1, 0], nn);
      expect(result.length).toBe(1);
      expect(result[0]).toBe(1);
    });

    it('returns 0 when bias exceeds weighted sum', () => {
      const nn = makeKnownNetwork([2, 1], [[[0.5], [0.5]]], [[2.0]]);
      const result = NeuralNetwork.feedForward([1, 1], nn);
      expect(result[0]).toBe(0);
    });

    it('returns 1 when weighted sum exceeds bias', () => {
      const nn = makeKnownNetwork([2, 1], [[[2], [2]]], [[0.5]]);
      const result = NeuralNetwork.feedForward([1, 1], nn);
      expect(result[0]).toBe(1);
    });
  });

  describe('mutate', () => {
    it('changes weights when amount > 0', () => {
      const nn = makeKnownNetwork(
        [2, 2],
        [
          [
            [0.5, -0.3],
            [0.1, 0.7],
          ],
        ],
        [[0.2, -0.1]],
      );
      const origWeights = nn.levels[0].weights.map((w) => [...w]);
      NeuralNetwork.mutate(nn, 0.5);
      let changed = false;
      for (let i = 0; i < origWeights.length; i++) {
        for (let j = 0; j < origWeights[i].length; j++) {
          if (origWeights[i][j] !== nn.levels[0].weights[i][j]) changed = true;
        }
      }
      expect(changed).toBe(true);
    });

    it('does not change weights with amount=0', () => {
      const nn = makeKnownNetwork(
        [2, 2],
        [
          [
            [0.5, -0.3],
            [0.1, 0.7],
          ],
        ],
        [[0.2, -0.1]],
      );
      const origWeights = nn.levels[0].weights.map((w) => [...w]);
      const origBiases = [...nn.levels[0].biases];
      NeuralNetwork.mutate(nn, 0);
      expect(nn.levels[0].weights).toEqual(origWeights);
      expect(nn.levels[0].biases).toEqual(origBiases);
    });

    it('does not change network architecture', () => {
      const nn = makeKnownNetwork(
        [2, 3, 1],
        [
          [
            [1, 0.5, -1],
            [-0.5, 1, 0.5],
          ],
          [[0.8], [-0.3], [0.1]],
        ],
        [[0.2, -0.1, 0.5], [0.0]],
      );
      NeuralNetwork.mutate(nn, 1);
      expect(nn.levels.length).toBe(2);
      expect(nn.levels[0].inputs.length).toBe(2);
      expect(nn.levels[0].outputs.length).toBe(3);
      expect(nn.levels[1].inputs.length).toBe(3);
      expect(nn.levels[1].outputs.length).toBe(1);
    });
  });

  describe('crossover', () => {
    it('child has same architecture as parents', () => {
      const nn1 = makeKnownNetwork(
        [2, 3, 1],
        [
          [
            [1, 0.5, -1],
            [-0.5, 1, 0.5],
          ],
          [[0.8], [-0.3], [0.1]],
        ],
        [[0.2, -0.1, 0.5], [0.0]],
      );
      const nn2 = makeKnownNetwork(
        [2, 3, 1],
        [
          [
            [-1, -0.5, 1],
            [0.5, -1, -0.5],
          ],
          [[-0.8], [0.3], [-0.1]],
        ],
        [[-0.2, 0.1, -0.5], [0.1]],
      );
      const child = NeuralNetwork.crossover(nn1, nn2);
      expect(child.levels.length).toBe(2);
      expect(child.levels[0].inputs.length).toBe(2);
      expect(child.levels[0].outputs.length).toBe(3);
      expect(child.levels[1].inputs.length).toBe(3);
      expect(child.levels[1].outputs.length).toBe(1);
    });

    it('child weights come from parents (either parent)', () => {
      const nn1 = makeKnownNetwork([2, 1], [[[0.5], [0.5]]], [[0.2]]);
      const nn2 = makeKnownNetwork([2, 1], [[[-0.5], [-0.5]]], [[-0.2]]);
      const child = NeuralNetwork.crossover(nn1, nn2);
      const w = child.levels[0].weights;
      const v = w[0][0];
      expect(v === 0.5 || v === -0.5).toBe(true);
    });
  });

  describe('clone', () => {
    it('creates deep copy', () => {
      const nn = makeKnownNetwork([2, 1], [[[0.5], [0.5]]], [[0.2]]);
      const cloned = NeuralNetwork.clone(nn);
      cloned.levels[0].weights[0][0] = 999;
      expect(nn.levels[0].weights[0][0]).toBe(0.5);
    });

    it('clone has same feedforward behavior', () => {
      const nn = makeKnownNetwork([2, 1], [[[0.5], [0.5]]], [[0.2]]);
      const cloned = NeuralNetwork.clone(nn);
      const r1 = NeuralNetwork.feedForward([1, 0], nn);
      const r2 = NeuralNetwork.feedForward([1, 0], cloned);
      expect(r2).toEqual(r1);
    });
  });

  describe('deserialize', () => {
    it('round-trips serialize -> deserialize -> same feedforward', () => {
      const nn = makeKnownNetwork([2, 1], [[[0.5], [0.5]]], [[0.2]]);
      const result1 = NeuralNetwork.feedForward([1, 0], nn);
      const data = {
        levels: nn.levels.map((l) => ({
          inputs: [...l.inputs],
          outputs: [...l.outputs],
          biases: [...l.biases],
          weights: l.weights.map((w) => [...w]),
        })),
      };
      const restored = NeuralNetwork.deserialize(data);
      const result2 = NeuralNetwork.feedForward([1, 0], restored);
      expect(result2).toEqual(result1);
    });

    it('throws on invalid data (null)', () => {
      expect(() => NeuralNetwork.deserialize(null)).toThrow();
    });

    it('throws on invalid data (non-object)', () => {
      expect(() => NeuralNetwork.deserialize('bad')).toThrow();
    });

    it('throws when levels is not an array', () => {
      expect(() => NeuralNetwork.deserialize({ levels: 'bad' })).toThrow();
    });
  });

  describe('mutateFromPool', () => {
    it('child arch matches parents', () => {
      const nn1 = makeKnownNetwork(
        [2, 3, 1],
        [
          [
            [1, 0.5, -1],
            [-0.5, 1, 0.5],
          ],
          [[0.8], [-0.3], [0.1]],
        ],
        [[0.2, -0.1, 0.5], [0.0]],
      );
      const nn2 = makeKnownNetwork(
        [2, 3, 1],
        [
          [
            [-1, -0.5, 1],
            [0.5, -1, -0.5],
          ],
          [[-0.8], [0.3], [-0.1]],
        ],
        [[-0.2, 0.1, -0.5], [0.1]],
      );
      const child = NeuralNetwork.mutateFromPool([nn1, nn2], 0.1);
      expect(child.levels.length).toBe(2);
    });

    it('original pool entries not mutated', () => {
      const nn1 = makeKnownNetwork([2, 1], [[[0.5], [0.5]]], [[0.2]]);
      const orig = nn1.levels[0].weights[0][0];
      NeuralNetwork.mutateFromPool([nn1, nn1], 0.5);
      expect(nn1.levels[0].weights[0][0]).toBe(orig);
    });
  });

  describe('trainStep', () => {
    it('returns true when weights change', () => {
      const nn = makeKnownNetwork([2, 1], [[[0.1], [0.1]]], [[0.0]]);
      const changed = NeuralNetwork.trainStep(nn, [1, 0], [1], 0.5);
      expect(changed).toBe(true);
    });

    it('with 0 LR, weights unchanged -> returns false', () => {
      const nn = makeKnownNetwork([2, 1], [[[0.1], [0.1]]], [[0.0]]);
      const origW = nn.levels[0].weights.map((w) => [...w]);
      const changed = NeuralNetwork.trainStep(nn, [1, 0], [1], 0);
      expect(changed).toBe(false);
      expect(nn.levels[0].weights).toEqual(origW);
    });

    it('gradient direction: target=1, output=0 -> bias decreases', () => {
      const nn = makeKnownNetwork([2, 1], [[[-1], [-1]]], [[0.5]]);
      const origBias = nn.levels[0].biases[0];
      NeuralNetwork.trainStep(nn, [1, 1], [1], 0.5);
      expect(nn.levels[0].biases[0]).toBeLessThan(origBias);
    });

    it('per-output LR array works', () => {
      const nn = makeKnownNetwork(
        [2, 2],
        [
          [
            [0.1, 0.1],
            [0.1, 0.1],
          ],
        ],
        [[0.0, 0.0]],
      );
      const changed = NeuralNetwork.trainStep(nn, [1, 0], [1, 0], [0.5, 0.0]);
      expect(changed).toBe(true);
    });

    it('handles 3-layer network trainStep', () => {
      const nn = makeKnownNetwork(
        [2, 3, 1],
        [
          [
            [0.1, 0.2, 0.3],
            [0.4, 0.5, 0.6],
          ],
          [[0.7], [-0.8], [0.9]],
        ],
        [[0.1, 0.2, 0.3], [0.0]],
      );
      const changed = NeuralNetwork.trainStep(nn, [1, 0], [1], 0.3);
      expect(changed).toBe(true);
    });

    it('returns false for empty network', () => {
      const nn = new NeuralNetwork([]);
      const changed = NeuralNetwork.trainStep(nn, [1], [1], 0.1);
      expect(changed).toBe(false);
    });
  });

  describe('Level.feedForward', () => {
    it('sum > bias -> output=1', () => {
      const level = new Level(2, 1);
      level.biases = [0.0];
      level.weights = [[2], [2]];
      const result = Level.feedForward([1, 1], level);
      expect(result[0]).toBe(1);
    });

    it('sum <= bias -> output=0', () => {
      const level = new Level(2, 1);
      level.biases = [5.0];
      level.weights = [[1], [1]];
      const result = Level.feedForward([1, 1], level);
      expect(result[0]).toBe(0);
    });
  });
});

describe('NeuralNetwork edge cases', () => {
  it('feedForward with all-zero weights returns zeros', () => {
    const nn = makeKnownNetwork([2, 1], [[[0], [0]]], [[0]]);
    const result = NeuralNetwork.feedForward([1, 1], nn);
    expect(result[0]).toBe(0);
  });

  it('trainStep with NaN learning rate does not crash', () => {
    const nn = makeKnownNetwork([2, 1], [[[0.1], [0.1]]], [[0.0]]);
    expect(() => NeuralNetwork.trainStep(nn, [1, 0], [1], NaN)).not.toThrow();
  });

  it('trainStep with mismatched targets length returns false', () => {
    const nn = makeKnownNetwork(
      [2, 2],
      [
        [
          [0.1, 0.2],
          [0.3, 0.4],
        ],
      ],
      [[0.0, 0.0]],
    );
    const result = NeuralNetwork.trainStep(nn, [1, 0], [], 0.5);
    expect(result).toBe(false);
  });

  it('constructor with 0 hidden layers creates single-layer network', () => {
    const nn = new NeuralNetwork([2, 4]);
    expect(nn.levels.length).toBe(1);
    expect(nn.levels[0].inputs.length).toBe(2);
    expect(nn.levels[0].outputs.length).toBe(4);
  });
});
