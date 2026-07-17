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
   * Supervised backpropagation training step using a sigmoid relaxation of the
   * network's binary step activation.
   *
   * The network computes `z = Σ w·x − bias` then activates when `z > 0`
   * (i.e. `sum > bias`). The logistic `σ(z)` shares the exact same decision
   * boundary (`σ(z) > 0.5 ⟺ z > 0`), so training the smooth surrogate and then
   * running the hard step at inference time is consistent. This gives real,
   * graded gradients (and proper multi-layer credit assignment) that the binary
   * step / straight-through estimator cannot provide.
   *
   * Runs its own forward pass from `inputs` (using sigmoid activations) so it
   * does not depend on a prior `feedForward` call and never reads the binary
   * `level.outputs` left over from inference.
   *
   * Weights and biases are kept in the same `[-1, 1]` range the genetic cars
   * use, so the brain inspector, the network visualizer, and the saved-brain
   * format all stay consistent. Three ingredients make training well-behaved at
   * that scale:
   *   - **Sigmoid gain** (`GAIN`): sharpens the training sigmoid so it still
   *     approximates the hard binary step even when weights are small (avoids a
   *     soft-sigmoid train/inference mismatch that would tank accuracy).
   *   - **Label smoothing** (`LABEL_SMOOTH`): targets become 0.1 / 0.9 instead
   *     of 0 / 1, so cross-entropy no longer drives the sigmoid to fully
   *     saturate — the weights it wants stay finite instead of blowing up.
   *   - **Weight decay** (`WEIGHT_DECAY`): a gentle L2 pull toward 0 that keeps
   *     weights away from the clamp boundary.
   *
   * Bias-sign note: since `z = Σ w·x − bias`, `∂z/∂bias = −1`, so the bias is
   * *increased* by `lr · δ` (equivalently decreased when the neuron should fire
   * more), while weights are updated by `−lr · δ · input`.
   *
   * @param inputs The input vector for this frame (same vector fed to feedForward).
   * @param targets Desired binary outputs (0/1) per output neuron.
   * @param lr Learning rate (single number) or per-output learning rates (array).
   *        When an array, each output neuron uses its own LR; hidden levels use `lr[0]`.
   */
  static trainStep(
    network: NeuralNetwork,
    inputs: number[],
    targets: number[],
    lr: number | number[] = 0.1,
  ): boolean {
    const numLevels = network.levels.length;
    if (numLevels === 0) return false;

    // Keep parameters in the genetic cars' [-1, 1] range so every consumer
    // (visualizer, inspector, saved brains) stays consistent.
    const CLAMP = 1;
    const GAIN = 2; // sigmoid steepness — sharp decisions from small weights
    const LABEL_SMOOTH = 0.1; // targets → 0.1 / 0.9 instead of 0 / 1
    const WEIGHT_DECAY = 0.002;
    const clamp = (v: number): number => Math.max(-CLAMP, Math.min(CLAMP, v));
    const sigmoid = (z: number): number => 1 / (1 + Math.exp(-GAIN * z));

    // Forward pass with sigmoid activations, keeping each level's activation
    // vector. activations[0] is the raw input; activations[k+1] is level k's out.
    const activations: number[][] = new Array(numLevels + 1);
    activations[0] = inputs;
    for (let k = 0; k < numLevels; k++) {
      const level = network.levels[k];
      const inp = activations[k];
      const out = new Array<number>(level.outputs.length);
      for (let i = 0; i < level.outputs.length; i++) {
        let sum = 0;
        for (let j = 0; j < inp.length; j++) {
          sum += (inp[j] ?? 0) * level.weights[j][i];
        }
        out[i] = sigmoid(sum - level.biases[i]);
      }
      activations[k + 1] = out;
    }

    // Backward pass: deltas[k][i] = ∂L/∂z for output i of level k.
    // The GAIN factor is the derivative of σ(GAIN·z) w.r.t. z.
    const deltas: number[][] = new Array(numLevels);
    const outIdx = numLevels - 1;
    const outAct = activations[numLevels];
    deltas[outIdx] = new Array<number>(outAct.length);
    for (let i = 0; i < outAct.length; i++) {
      // Sigmoid + cross-entropy with label smoothing → δ = GAIN·(σ − target).
      const smoothed = targets[i] * (1 - 2 * LABEL_SMOOTH) + LABEL_SMOOTH;
      deltas[outIdx][i] = GAIN * (outAct[i] - smoothed);
    }
    for (let k = numLevels - 2; k >= 0; k--) {
      const nextLevel = network.levels[k + 1];
      const nextDelta = deltas[k + 1];
      const act = activations[k + 1];
      const d = new Array<number>(act.length).fill(0);
      for (let j = 0; j < act.length; j++) {
        let sum = 0;
        for (let i = 0; i < nextLevel.outputs.length; i++) {
          sum += nextLevel.weights[j][i] * nextDelta[i];
        }
        d[j] = sum * GAIN * act[j] * (1 - act[j]); // × sigmoid'(GAIN·z)
      }
      deltas[k] = d;
    }

    // Apply weight/bias updates with gradient descent, weight decay, and the
    // [-1, 1] clamp.
    let changed = false;
    for (let k = 0; k < numLevels; k++) {
      const level = network.levels[k];
      const inp = activations[k];
      const delta = deltas[k];
      for (let i = 0; i < level.outputs.length; i++) {
        const di = delta[i];
        if (di === 0 || !isFinite(di)) continue;
        const effectiveLR = Array.isArray(lr)
          ? ((k === outIdx ? lr[i] : lr[0]) ?? lr[0])
          : lr;
        if (!isFinite(effectiveLR)) continue;
        const newBias = clamp(level.biases[i] + effectiveLR * di);
        if (newBias !== level.biases[i]) changed = true;
        level.biases[i] = newBias;
        for (let j = 0; j < inp.length; j++) {
          const w = level.weights[j][i];
          // Gradient + L2 weight decay, then clamp back into [-1, 1].
          const grad = di * (inp[j] ?? 0) + WEIGHT_DECAY * w;
          level.weights[j][i] = clamp(w - effectiveLR * grad);
        }
      }
    }
    return changed;
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

    Level.#randomize(this);
  }

  static #randomize(level: Level): void {
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
