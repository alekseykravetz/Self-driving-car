import { lerp } from '../math/utils.js';

export class NeuralNetwork {
  public levels: Level[];

  constructor(neuronCounts: number[]) {
    this.levels = [];
    // Create levels based on neuron counts
    // Each level connects neuronCounts[i] inputs to neuronCounts[i+1] outputs
    for (let i: number = 0; i < neuronCounts.length - 1; i++) {
      this.levels.push(new Level(neuronCounts[i], neuronCounts[i + 1]));
    }
  }

  // Static method to perform feedforward computation through the entire network
  static feedForward(givenInputs: number[], network: NeuralNetwork): number[] {
    // Start with the output of the first level
    let outputs: number[] = Level.feedForward(givenInputs, network.levels[0]);
    // Pass the outputs of the current level as inputs to the next level
    for (let i: number = 1; i < network.levels.length; i++) {
      outputs = Level.feedForward(outputs, network.levels[i]);
    }
    // Return the final outputs of the last level
    return outputs;
  }

  // Static method to mutate the network's weights and biases
  static mutate(network: NeuralNetwork, amount: number = 1): void {
    // Iterate through each level in the network
    network.levels.forEach((level: Level) => {
      // Mutate biases
      for (let i: number = 0; i < level.biases.length; i++) {
        level.biases[i] = lerp(
          level.biases[i],
          Math.random() * 2 - 1, // Target random value between -1 and 1
          amount, // Degree of mutation
        );
      }
      // Mutate weights
      for (let i: number = 0; i < level.weights.length; i++) {
        for (let j: number = 0; j < level.weights[i].length; j++) {
          level.weights[i][j] = lerp(
            level.weights[i][j],
            Math.random() * 2 - 1, // Target random value between -1 and 1
            amount, // Degree of mutation
          );
        }
      }
    });
  }

  /**
   * Static method to combine traits from two networks (crossover).
   * It randomly selects biases and weights from either network1 or network2.
   */
  static crossover(
    network1: NeuralNetwork,
    network2: NeuralNetwork,
  ): NeuralNetwork {
    const architecture = [
      network1.levels[0].inputs.length,
      ...network1.levels.map((l) => l.outputs.length),
    ];
    const child = new NeuralNetwork(architecture);
    for (let i = 0; i < child.levels.length; i++) {
      const level1 = network1.levels[i];
      const level2 = network2.levels[i];
      const childLevel = child.levels[i];

      // Crossover biases
      for (let j = 0; j < childLevel.biases.length; j++) {
        childLevel.biases[j] =
          Math.random() < 0.5 ? level1.biases[j] : level2.biases[j];
      }

      // Crossover weights
      for (let j = 0; j < childLevel.weights.length; j++) {
        for (let k = 0; k < childLevel.weights[j].length; k++) {
          childLevel.weights[j][k] =
            Math.random() < 0.5 ? level1.weights[j][k] : level2.weights[j][k];
        }
      }
    }
    return child;
  }

  /**
   * Deserialize a NeuralNetwork from plain JSON-like data.
   * Reconstructs the network structure from serialized brain data.
   */
  static deserialize(data: unknown): NeuralNetwork {
    if (!data || typeof data !== 'object' || !('levels' in data)) {
      throw new Error('Invalid NeuralNetwork data: missing levels');
    }
    const dataObj = data as { levels?: unknown };
    if (!Array.isArray(dataObj.levels)) {
      throw new Error('Invalid NeuralNetwork data: levels not an array');
    }

    const network = new NeuralNetwork([]);
    network.levels = (dataObj.levels as unknown[]).map((levelDataRaw) => {
      const levelData = levelDataRaw as {
        inputs: number[];
        outputs: number[];
        biases: number[];
        weights: number[][];
      };
      const level = new Level(
        levelData.inputs.length,
        levelData.outputs.length,
      );
      level.biases = [...levelData.biases];
      level.weights = levelData.weights.map((w) => [...w]);
      level.inputs = [...levelData.inputs];
      level.outputs = [...levelData.outputs];
      return level;
    });
    return network;
  }

  /**
   * Clone an existing NeuralNetwork, creating a deep copy safe for mutation.
   * Ensures the copy is a proper NeuralNetwork instance, not a plain object.
   */
  static clone(network: NeuralNetwork): NeuralNetwork {
    const cloned = new NeuralNetwork([]);
    cloned.levels = network.levels.map((level: Level) => {
      const clonedLevel = new Level(level.inputs.length, level.outputs.length);
      clonedLevel.biases = [...level.biases];
      clonedLevel.weights = level.weights.map((w: number[]) => [...w]);
      clonedLevel.inputs = [...level.inputs];
      clonedLevel.outputs = [...level.outputs];
      return clonedLevel;
    });
    return cloned;
  }

  /**
   * Online imitation-learning step for the KEYS car (human-in-the-loop).
   * Assumes `feedForward(inputVector, network)` was just called on the current
   * frame's input, so each `level.inputs[]` and `level.outputs[]` already holds
   * fresh values. Trains every layer via the straight-through estimator
   * (treats the binary-step derivative as 1), so inference keeps using step
   * activation and pool/crossover compatibility is unaffected.
   *
   * Note on the bias sign: this codebase uses `z = Σ w·x − bias` with
   * `step(z > 0)`, so to raise `z` when the error is positive we *decrease*
   * the bias (opposite of the usual `b += lr·err` convention).
   */
  static trainStep(
    network: NeuralNetwork,
    targets: number[],
    lr: number = 0.1,
  ): void {
    const levels = network.levels;
    const L = levels.length;
    if (L === 0) return;

    const outLevel = levels[L - 1];
    if (targets.length !== outLevel.outputs.length) return;

    // deltas[i][j] = error signal for output j of level i.
    const deltas: number[][] = new Array(L);

    // Output level: perceptron error (STE: step' = 1, so delta = target - output).
    const outDelta = new Array<number>(outLevel.outputs.length);
    for (let j = 0; j < outLevel.outputs.length; j++) {
      outDelta[j] = (targets[j] ?? 0) - outLevel.outputs[j];
    }
    deltas[L - 1] = outDelta;

    // Hidden levels: backprop through the next level's weights. step' = 1
    // contributes no extra factor, so delta_hidden[k] = Σ_j w_next[k][j] * delta_next[j].
    for (let i = L - 2; i >= 0; i--) {
      const level = levels[i];
      const next = levels[i + 1];
      const delta = new Array<number>(level.outputs.length).fill(0);
      for (let k = 0; k < level.outputs.length; k++) {
        let sum = 0;
        for (let j = 0; j < next.outputs.length; j++) {
          sum += next.weights[k][j] * deltas[i + 1][j];
        }
        delta[k] = sum;
      }
      deltas[i] = delta;
    }

    // Apply updates: w[input][output] += lr * delta_out * input; bias -= lr * delta.
    for (let i = 0; i < L; i++) {
      const level = levels[i];
      const delta = deltas[i];
      for (let j = 0; j < level.outputs.length; j++) {
        const d = delta[j];
        if (d === 0) continue;
        for (let k = 0; k < level.inputs.length; k++) {
          level.weights[k][j] += lr * d * level.inputs[k];
        }
        level.biases[j] -= lr * d;
      }
    }
  }

  /**
   * Generates a new network by crossing over and mutating from a pool of networks.
   * Clones parents before crossover to prevent mutation of the original pool.
   */
  static mutateFromPool(
    networks: NeuralNetwork[],
    amount: number = 0.1,
  ): NeuralNetwork {
    const parent1 = NeuralNetwork.clone(
      networks[Math.floor(Math.random() * networks.length)],
    );
    const parent2 = NeuralNetwork.clone(
      networks[Math.floor(Math.random() * networks.length)],
    );

    const child = NeuralNetwork.crossover(parent1, parent2);
    NeuralNetwork.mutate(child, amount);

    return child;
  }
}

export class Level {
  public inputs: number[];
  public outputs: number[];
  public biases: number[];
  public weights: number[][];

  constructor(inputCount: number, outputCount: number) {
    this.inputs = new Array(inputCount);
    this.outputs = new Array(outputCount);
    this.biases = new Array(outputCount);

    this.weights = [];
    for (let i: number = 0; i < inputCount; i++) {
      this.weights[i] = new Array(outputCount);
    }

    Level.randomize(this);
  }

  private static randomize(level: Level): void {
    // Initialize weights with random values between -1 and 1
    for (let i: number = 0; i < level.inputs.length; i++) {
      for (let j: number = 0; j < level.outputs.length; j++) {
        level.weights[i][j] = Math.random() * 2 - 1;
      }
    }
    // Initialize biases with random values between -1 and 1
    for (let i: number = 0; i < level.biases.length; i++) {
      level.biases[i] = Math.random() * 2 - 1;
    }
  }

  // Static method to compute the output of a level given inputs
  static feedForward(givenInputs: number[], level: Level): number[] {
    // Assign given inputs to the level's inputs
    for (let i: number = 0; i < level.inputs.length; i++) {
      level.inputs[i] = givenInputs[i];
    }

    // Calculate the output for each neuron in the level
    for (let i: number = 0; i < level.outputs.length; i++) {
      let sum: number = 0;
      // Sum weighted inputs
      for (let j: number = 0; j < level.inputs.length; j++) {
        sum += level.inputs[j] * level.weights[j][i];
      }

      // Apply activation function (step function in this case)
      // if (sum + level.biases[i] > 0) // Scientist's version (alternative activation)
      if (sum > level.biases[i]) {
        level.outputs[i] = 1; // Activate neuron
      } else {
        level.outputs[i] = 0; // Deactivate neuron
      }
    }

    // Return the computed outputs
    return level.outputs;
  }
}

// Example Usage (Optional):
/*
const nn = new NeuralNetwork([2, 3, 1]); // 2 input neurons, 3 hidden, 1 output
const inputs = [0.5, -0.2];
const outputs = NeuralNetwork.feedForward(inputs, nn);
console.log(outputs); // Output: e.g., [1] or [0]

NeuralNetwork.mutate(nn, 0.1); // Mutate the network slightly
const mutatedOutputs = NeuralNetwork.feedForward(inputs, nn);
console.log(mutatedOutputs);
*/
