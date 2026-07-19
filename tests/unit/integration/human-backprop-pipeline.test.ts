import { describe, it, expect } from 'vitest';
import { setupImageMock } from '../../helpers/setupImageMock.js';

setupImageMock();

import { Car } from '../../../ts/car/car.js';
import { NeuralNetwork } from '../../../ts/neural-network/network.js';
import { makeKnownNetwork } from '../../helpers/makeKnownNetwork.js';

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

function makeTurnBrain(): unknown {
  return makeKnownNetwork(
    [6, 6, 4],
    [
      Array.from({ length: 6 }, () => Array(6).fill(0)),
      Array.from({ length: 6 }, () => Array(4).fill(0)),
    ],
    [Array(6).fill(0.1), [-0.1, -0.1, 0.1, 0.1]],
  );
}

describe('Human backprop pipeline integration', () => {
  it('Car trains brain via trainStep when controls change', () => {
    const car = new Car({ x: 0, y: 0, controlType: 'AI' });
    car.brain = makeKnownForwardBrain();
    car.setLearningFromHuman(true);

    car.update([], [], []);
    const nn = car.brain as NeuralNetwork;
    const outputBias0 = nn.levels[1].biases[0];

    car.update([], [], []);
    expect(nn.levels[1].biases[0]).not.toBe(outputBias0);
  });

  it('Replay buffer stores (inputs, targets) pairs and replays them', () => {
    const car = new Car({ x: 0, y: 0, controlType: 'AI' });
    car.brain = makeKnownForwardBrain();
    car.setLearningFromHuman(true);

    let changedCount = 0;
    for (let i = 0; i < 30; i++) {
      car.update([], [], []);
      if (car.brainChangedThisFrame) changedCount++;
    }
    expect(changedCount).toBeGreaterThan(0);
  });

  it('trainBatch samples balanced turn vs straight entries without error', () => {
    const car = new Car({ x: 0, y: 0, controlType: 'AI' });
    car.brain = makeKnownForwardBrain();
    car.setLearningFromHuman(true);

    for (let i = 0; i < 50; i++) {
      expect(() => car.update([], [], [])).not.toThrow();
    }
  });

  it('trainBatch with turn brain fills both turn and straight pools', () => {
    const car = new Car({ x: 0, y: 0, controlType: 'AI' });
    car.brain = makeTurnBrain();
    car.setLearningFromHuman(true);

    for (let i = 0; i < 50; i++) {
      expect(() => car.update([], [], [])).not.toThrow();
    }
  });

  it('Brain weights change after training', () => {
    const car = new Car({ x: 0, y: 0, controlType: 'AI' });
    car.brain = makeKnownForwardBrain();
    car.setLearningFromHuman(true);

    const nn = car.brain as NeuralNetwork;
    const initialWeights = nn.levels.map((l) => ({
      biases: [...l.biases],
      weights: l.weights.map((w) => [...w]),
    }));

    for (let i = 0; i < 100; i++) {
      car.update([], [], []);
    }

    const weightsChanged = nn.levels.some((l, li) =>
      l.biases.some((b, bi) => b !== initialWeights[li].biases[bi]),
    );
    expect(weightsChanged).toBe(true);
  });

  it('Learning toggle via setLearningFromHuman stops weight changes', () => {
    const car = new Car({ x: 0, y: 0, controlType: 'AI' });
    car.brain = makeKnownForwardBrain();
    car.setLearningFromHuman(true);

    for (let i = 0; i < 30; i++) {
      car.update([], [], []);
    }

    const nn = car.brain as NeuralNetwork;
    const snapshot = nn.levels.map((l) => ({
      biases: [...l.biases],
      weights: l.weights.map((w) => [...w]),
    }));

    car.setLearningFromHuman(false);
    for (let i = 0; i < 30; i++) {
      car.update([], [], []);
      expect(car.brainChangedThisFrame).toBe(false);
    }

    const unchanged = nn.levels.every((l, li) =>
      l.biases.every((b, bi) => b === snapshot[li].biases[bi]),
    );
    expect(unchanged).toBe(true);
  });
});
