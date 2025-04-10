class NeuralNetwork {
  // Declare public member with type Level[]
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
          Math.random() * 2 - 1, // Target random value
          amount, // Degree of mutation
        );
      }
      // Mutate weights
      for (let i: number = 0; i < level.weights.length; i++) {
        for (let j: number = 0; j < level.weights[i].length; j++) {
          level.weights[i][j] = lerp(
            level.weights[i][j],
            Math.random() * 2 - 1, // Target random value
            amount, // Degree of mutation
          );
        }
      }
    });
  }
}

class Level {
  // Declare public members with types
  public inputs: number[];
  public outputs: number[];
  public biases: number[];
  public weights: number[][]; // Array of arrays of numbers

  constructor(inputCount: number, outputCount: number) {
    this.inputs = new Array(inputCount);
    this.outputs = new Array(outputCount);
    this.biases = new Array(outputCount);

    this.weights = [];
    for (let i: number = 0; i < inputCount; i++) {
      // Each element of weights is an array of numbers
      this.weights[i] = new Array(outputCount);
    }

    // Call the static private method to initialize weights and biases
    Level.randomize(this);
  }

  // Use 'private static' for TypeScript private static methods
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
