# Neural Network & Neuroevolution

The AI brain system in `ts/neural-network/` implements a feedforward neural network trained via genetic algorithms (no backpropagation). The network makes binary decisions about car controls each frame.

---

## Network Architecture (`ts/neural-network/network.ts`)

### Level (Single Layer)

```typescript
class Level {
  inputs: number[]; // Values received from previous layer (or sensor data)
  outputs: number[]; // Computed activations (binary: 0 or 1)
  weights: number[][]; // weights[i][o] = connection strength input_i → output_o
  biases: number[]; // One bias per output neuron (threshold)

  constructor(inputCount: number, outputCount: number);
  static feedForward(givenInputs: number[], level: Level): number[];
  static randomize(level: Level): void;
}
```

**Initialization** (`randomize`):

- All weights set to random values in range `[-1, 1]`
- All biases set to random values in range `[-1, 1]`

**Feedforward** (per level):

```
For each output neuron o:
  sum = 0
  for each input i:
    sum += inputs[i] * weights[i][o]

  if (sum > biases[o]):
    outputs[o] = 1    // Neuron fires
  else:
    outputs[o] = 0    // Neuron silent
```

**Activation function**: Binary step (threshold at bias value). This produces crisp on/off decisions — the car either turns or doesn't, accelerates or doesn't. No sigmoid, ReLU, or other continuous activation.

**Why binary step?** The car's control system accepts boolean flags (`forward`, `left`, `right`, `reverse`). Continuous activations would need an additional threshold step. Binary step matches the output semantics directly.

---

### NeuralNetwork (Multi-Layer)

```typescript
class NeuralNetwork {
  levels: Level[];

  constructor(neuronCounts: number[]);
  static feedForward(givenInputs: number[], network: NeuralNetwork): number[];
  static mutate(network: NeuralNetwork, amount: number): void;
  static crossover(net1: NeuralNetwork, net2: NeuralNetwork): NeuralNetwork;
  static toMutatedFromPool(
    brains: NeuralNetwork[],
    amount: number,
  ): NeuralNetwork;
}
```

**Constructor**: Creates `neuronCounts.length - 1` levels, connecting consecutive layer sizes.

Example: `[6, 6, 4]` creates:

- Level 0: 6 inputs → 6 outputs (36 weights + 6 biases = 42 params)
- Level 1: 6 inputs → 4 outputs (24 weights + 4 biases = 28 params)
- Total: 70 parameters

**Feedforward** (full network):

```typescript
static feedForward(givenInputs: number[], network: NeuralNetwork): number[] {
  let outputs = Level.feedForward(givenInputs, network.levels[0]);
  for (let i = 1; i < network.levels.length; i++) {
    outputs = Level.feedForward(outputs, network.levels[i]);
  }
  return outputs;
}
```

---

## Typical Network Configuration

```
┌─────────────────────────────────────┐
│ INPUT LAYER (6 neurons)             │
│  [ray1, ray2, ray3, ray4, ray5,     │
│   speed]                            │
│  Values: 0.0–1.0 (normalized)      │
└────────────────┬────────────────────┘
                 │ 6×6 = 36 weights
┌────────────────▼────────────────────┐
│ HIDDEN LAYER (6 neurons)            │
│  Feature extraction                 │
│  Outputs: 0 or 1 (binary)          │
└────────────────┬────────────────────┘
                 │ 6×4 = 24 weights
┌────────────────▼────────────────────┐
│ OUTPUT LAYER (4 neurons)            │
│  [forward, left, right, reverse]    │
│  Outputs: 0 or 1 (binary)          │
└─────────────────────────────────────┘

Total parameters: 36 + 24 + 6 + 4 = 70 (weights + biases)
```

### Input Encoding

| Input  | Source              | Range  | Meaning                           |
| ------ | ------------------- | ------ | --------------------------------- |
| ray1-5 | `1 - sensor.offset` | [0, 1] | 0 = clear path, 1 = touching wall |
| speed  | `speed / maxSpeed`  | [0, 1] | 0 = stopped, 1 = max speed        |

### Output Decoding

| Output | Control            | Value | Effect          |
| ------ | ------------------ | ----- | --------------- |
| out[0] | `controls.forward` | 0/1   | Accelerate      |
| out[1] | `controls.left`    | 0/1   | Steer left      |
| out[2] | `controls.right`   | 0/1   | Steer right     |
| out[3] | `controls.reverse` | 0/1   | Brake / reverse |

### Configurable Architecture

The `hiddenLayers` parameter in `CarInfo` allows customizing the network depth:

- Default: `[6]` → architecture `[rayCount+1, 6, 4]`
- Custom: `[8, 6]` → architecture `[rayCount+1, 8, 6, 4]`

When `rayCount` changes, the entire network must be rebuilt (input layer size changes).

---

## Genetic Algorithm (Neuroevolution)

### Mutation (`NeuralNetwork.mutate`)

```typescript
static mutate(network: NeuralNetwork, amount: number): void {
  for (const level of network.levels) {
    for (let i = 0; i < level.biases.length; i++) {
      level.biases[i] = lerp(level.biases[i], Math.random() * 2 - 1, amount);
    }
    for (let i = 0; i < level.weights.length; i++) {
      for (let j = 0; j < level.weights[i].length; j++) {
        level.weights[i][j] = lerp(level.weights[i][j], Math.random() * 2 - 1, amount);
      }
    }
  }
}
```

**`amount` controls mutation strength:**

| Amount | Effect                               | Use Case                |
| ------ | ------------------------------------ | ----------------------- |
| 0.0    | No change (exact copy)               | Elite preservation      |
| 0.05   | 5% nudge toward random value         | Fine-tuning good brains |
| 0.1    | 10% interpolation (default)          | Standard mutation       |
| 0.3    | 30% randomization                    | High exploration        |
| 1.0    | Completely random (ignores original) | Fresh start             |

The `lerp` formula: `original + (random - original) * amount` smoothly interpolates between preservation and randomization.

### Crossover (`NeuralNetwork.crossover`)

```typescript
static crossover(net1: NeuralNetwork, net2: NeuralNetwork): NeuralNetwork {
  const child = JSON.parse(JSON.stringify(net1));  // Deep clone parent1
  for (const level of child.levels) {
    for (let i = 0; i < level.biases.length; i++) {
      if (Math.random() > 0.5) level.biases[i] = net2.levels[...].biases[i];
    }
    for (let i = 0; i < level.weights.length; i++) {
      for (let j = 0; j < level.weights[i].length; j++) {
        if (Math.random() > 0.5) level.weights[i][j] = net2.levels[...].weights[i][j];
      }
    }
  }
  return child;
}
```

Each gene (weight or bias) is randomly selected from one of two parents with 50/50 probability. This produces offspring with traits from both parents.

### Pool-Based Mutation (`NeuralNetwork.toMutatedFromPool`)

```typescript
static toMutatedFromPool(brains: NeuralNetwork[], amount: number): NeuralNetwork {
  const parent1 = brains[Math.floor(Math.random() * brains.length)];
  const parent2 = brains[Math.floor(Math.random() * brains.length)];
  const child = NeuralNetwork.crossover(parent1, parent2);
  NeuralNetwork.mutate(child, amount);
  return child;
}
```

1. Select two random parents from the elite pool
2. Crossover their genes (50/50 per gene)
3. Apply mutation at the given rate
4. Return the new individual

This combines **exploitation** (crossover from proven parents) with **exploration** (mutation adds novelty).

---

## Training Manager Integration

The `<training-panel>` element orchestrates the evolutionary process using `poolManager.ts` functions:

### Population Generation (`createCarsForTraining`)

```typescript
function createCarsForTraining(count, type, config, startInfo): Car[] {
  // Create N cars at the start position with given config
  // All cars are identical initially (same position, same physics)
}
```

### Brain Application (`applyPoolToCars`)

```typescript
function applyPoolToCars(cars, pool, mutationRate): void {
  const brains = pool.filter((c) => c.brain).map((c) => c.brain);

  for (let i = 0; i < cars.length; i++) {
    if (i < brains.length) {
      // Elitism: exact copy of pool member
      cars[i].brain = JSON.parse(JSON.stringify(brains[i]));
    } else {
      // Offspring: crossover + mutation from pool
      cars[i].brain = NeuralNetwork.toMutatedFromPool(brains, mutationRate);
    }
  }
}
```

### Full Generation Cycle

```
Generation N:
  ┌─────────────────────────────────────────────────┐
  │ 1. createCarsForTraining(count, 'AI', config)   │
  │ 2. applyPoolToCars(cars, savedPool, rate)       │
  │    → First K: exact copies (elitism)            │
  │    → Rest: crossover + mutate (offspring)       │
  ├─────────────────────────────────────────────────┤
  │ 3. Simulation runs... (all cars drive)          │
  │    → Each car: sense → think → act → move       │
  │    → Damaged cars stop                          │
  │    → fitness tracked per frame                  │
  ├─────────────────────────────────────────────────┤
  │ 4. Generation ends (user clicks 🧬):           │
  │    → getTopCarInfoPool(cars, fitness, poolSize) │
  │    → Sort by fitness, take top K as CarInfo     │
  │    → savePoolToStorage(pool)                    │
  │ 5. Next generation: goto step 1                 │
  └─────────────────────────────────────────────────┘
```

### Configurable Parameters (via UI)

| Parameter     | Range     | Default | Effect                                      |
| ------------- | --------- | ------- | ------------------------------------------- |
| Car Count     | 0–5000    | 100     | Population size per generation              |
| Pool Size     | 1–20      | 5       | Number of elite survivors (K)               |
| Mutation Rate | 0.001–1.0 | 0.1     | `amount` param for `NeuralNetwork.mutate()` |

### Evolutionary Pressure

- **Elitism**: Top K brains survive unchanged → ensures quality never decreases
- **Crossover**: Combines successful traits from two parents → explores between solutions
- **Mutation**: Random perturbation → introduces novelty and prevents local optima
- **Selection**: Only top K survive → strong pressure toward better fitness
- **Diversity**: Random parent pairing within pool → prevents premature convergence

---

## Network Visualizer (`ts/neural-network/visualizer.ts`)

Real-time rendering of the neural network's internal state on a dedicated canvas.

```typescript
class Visualizer {
  static drawNetwork(
    ctx: CanvasRenderingContext2D,
    network: NeuralNetwork,
  ): void;
  static drawLevel(
    ctx,
    level,
    left,
    top,
    width,
    height,
    labels?: string[],
  ): void;
}
```

### Visual Layout

```
┌─────────────────────────────────────┐
│  Output Layer       ↥  ↤  ↦  ↧    │  (top)
│        ↕ weight connections         │
│  Hidden Layer       ○  ○  ○  ○  ○  ○│
│        ↕ weight connections         │
│  Input Layer        ○  ○  ○  ○  ○  ○│  (bottom)
└─────────────────────────────────────┘
```

Levels are drawn bottom-to-top (input at bottom, output at top).

### Visual Elements

**Nodes (Neurons)**:

- Circle with black outline
- Inner fill colored by value:
  - Yellow/white = high positive value (active, close to 1)
  - Black/dark = low/zero value (inactive)
- Color computed via `getRGBA(value)` utility

**Connections (Weights)**:

- Lines connecting input nodes to output nodes
- Color: `getRGBA(weight)` — yellow for positive, blue/purple for negative
- Thickness proportional to |weight| (stronger connections appear bolder)
- Dashed style for very small weights (near zero)

**Bias Indicators** (output nodes):

- Dashed circle around each output neuron
- Color indicates bias magnitude and sign

**Output Labels** (rightmost layer only):

| Symbol | Meaning |
| ------ | ------- |
| ↥      | Forward |
| ↤      | Left    |
| ↦      | Right   |
| ↧      | Reverse |

### Real-time Updates

The visualizer redraws every frame with the best car's current network state. This shows:

- Which sensors are detecting obstacles (input layer lights up)
- How hidden neurons respond to the pattern (feature extraction visible)
- Which control outputs are active (output layer shows current decisions)
- Which weights are strong/weak (connection colors and thickness)

This provides immediate visual feedback during training — you can see the network "thinking" as it navigates obstacles.
