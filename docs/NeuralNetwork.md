# Neural Network & Evolution

The "brain" of the autonomous vehicles is implemented in `ts/neural-network/`.

## Network Structure (`ts/neural-network/network.ts`)

The `NeuralNetwork` is a simple feedforward network composed of multiple `Level` objects.

### Levels

Each `Level` represents a layer of neurons:

- **Inputs**: Received from the previous level (or sensors for the first level).
- **Outputs**: Calculated based on weighted sums of inputs and biases.
- **Weights**: Define the strength of connections between neurons in adjacent levels.
- **Biases**: Shift the activation function for each output neuron.
- **Activation Function**: A step function is used—if the weighted sum exceeds the bias, the neuron fires (outputs 1), otherwise it outputs 0.

### Feedforward Mechanism

The network processes data from input to output:

1.  **Input Layer**: Receives sensor offsets and current car speed.
2.  **Hidden Layers**: Extract features from the sensor data.
3.  **Output Layer**: Produces 4 values representing `Forward`, `Left`, `Right`, and `Reverse`.

## Genetic Algorithm

The simulation uses a genetic algorithm to "train" the neural networks.

### Mutation

Instead of traditional backpropagation, the network is trained through evolution:

1.  **Selection**: The car that travels the furthest (highest `fitness`) is saved.
2.  **Variation**: New generations are created by cloning the best brain and applying random **mutations**.
3.  **Mutation Rate**: The `amount` parameter in `NeuralNetwork.mutate()` determines how much the weights and biases are nudged toward new random values.

### Persistence

Brains are serialized as JSON and can be saved to local storage or external files (e.g., `saves/bestBrain.txt`). This allows the simulation to preserve progress across sessions.

## Network Visualizer (`ts/neural-network/visualizer.ts`)

A dedicated UI component that renders the neural network's architecture in real-time.

- **Nodes**: Represent neurons (brighter colors indicate higher activity).
- **Edges**: Represent weights (color and thickness indicate weight strength and polarity).
- **Interactivity**: Shows the live activations as the car navigates the environment.
