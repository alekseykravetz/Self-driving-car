# Neural Network & Neuroevolution

The AI brain system in `ts/neural-network/` implements a feedforward neural network trained via genetic algorithms (no backpropagation). The network makes binary decisions about car controls each frame.

---

## Network Architecture (`ts/neural-network/network.ts`)

### Level (Single Layer)

```typescript
class Level {
  inputs: number[]; // Values received from previous layer
  outputs: number[]; // Computed activations
  weights: number[][]; // weights[i][o] = connection strength input_i → output_o
  biases: number[]; // One bias per output neuron

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

**Activation function**: Binary step (threshold at bias value). This produces crisp on/off decisions — the car either turns or doesn't, accelerates or doesn't.

---

### NeuralNetwork (Multi-Layer)

```typescript
class NeuralNetwork {
  levels: Level[];

  constructor(neuronCounts: number[]); // e.g., [6, 6, 4]
  static feedForward(givenInputs: number[], network: NeuralNetwork): number[];
  static mutate(network: NeuralNetwork, amount: number): void;
  static crossover(net1: NeuralNetwork, net2: NeuralNetwork): NeuralNetwork;
  static mutateFromPool(
    networks: NeuralNetwork[],
    amount: number,
  ): NeuralNetwork;
}
```

**Constructor**:
Creates `neuronCounts.length - 1` levels, connecting consecutive layer sizes.
Example: `[6, 6, 4]` → Level(6→6) + Level(6→4) = 2 levels.

**Feedforward** (full network):

```
output = Level.feedForward(inputs, levels[0])
for i = 1 to levels.length-1:
  output = Level.feedForward(output, levels[i])
return output
```

---

## Typical Network Configuration

```
┌─────────────────────────────────┐
│ INPUT LAYER (6 neurons)         │
│  [ray1, ray2, ray3, ray4, ray5, │
│   speed]                        │
└────────────────┬────────────────┘
                 │ 6×6 = 36 weights
┌────────────────▼────────────────┐
│ HIDDEN LAYER (6 neurons)        │
│  Feature extraction             │
└────────────────┬────────────────┘
                 │ 6×4 = 24 weights
┌────────────────▼────────────────┐
│ OUTPUT LAYER (4 neurons)        │
│  [forward, left, right, reverse]│
└─────────────────────────────────┘

Total parameters: 36 + 24 + 6 + 4 = 70 (weights + biases)
```

**Inputs**: 5 sensor readings (1 - offset, so closer = higher) + normalized speed
**Outputs**: Binary decisions mapped to `controls.forward/left/right/reverse`

---

## Genetic Algorithm (Neuroevolution)

### Mutation (`NeuralNetwork.mutate`)

```typescript
static mutate(network: NeuralNetwork, amount: number): void {
  for each level:
    for each bias:
      bias = lerp(bias, random(-1, 1), amount)
    for each weight:
      weight = lerp(weight, random(-1, 1), amount)
}
```

- `amount = 0` → no change (exact copy)
- `amount = 0.1` → 10% nudge toward random value (subtle variation)
- `amount = 1` → completely random (fresh network)

This smoothly interpolates between preservation and randomization.

### Crossover (`NeuralNetwork.crossover`)

```typescript
static crossover(net1: NeuralNetwork, net2: NeuralNetwork): NeuralNetwork {
  child = clone(net1)
  for each level:
    for each bias:
      if (random() > 0.5) bias = net2.bias
    for each weight:
      if (random() > 0.5) weight = net2.weight
  return child
}
```

Randomly selects each gene (weight/bias) from one of two parents. Produces offspring with traits from both.

### Pool-Based Evolution (`NeuralNetwork.mutateFromPool`)

```typescript
static mutateFromPool(networks: NeuralNetwork[], amount: number): NeuralNetwork {
  parent1 = networks[randomIndex]
  parent2 = networks[randomIndex]
  child = crossover(parent1, parent2)
  mutate(child, amount)
  return child
}
```

1. Select two random parents from the top-performing pool
2. Crossover their genes
3. Apply mutation
4. Return new individual

---

## Training Manager Integration

The `<training-manager-panel>` custom element (`TrainingManagerPanelElement`) orchestrates the evolutionary process:

```
Generation N:
  1. Take bestPool[] (top K brains from previous generation)
  2. Generate carCount cars:
     - First K cars: exact copies of pool members (elitism)
     - Remaining cars: mutateFromPool(pool, mutationRate)
  3. Run simulation until all damaged or timeout
  4. Evaluate fitness for each car
  5. Sort by fitness, take top K → new bestPool[]
  6. Save to localStorage
  7. Repeat
```

### Configurable Parameters (via UI)

| Parameter     | Range     | Default | Effect                          |
| ------------- | --------- | ------- | ------------------------------- |
| Car Count     | 0–5000    | 100     | Population size per generation  |
| Pool Size     | 1–20      | 5       | Number of elite survivors       |
| Mutation Rate | 0.001–1.0 | 0.1     | How much to randomize offspring |

### Selection Pressure

- **Elitism**: Top K brains survive unchanged
- **Fitness-proportional**: Higher fitness = more likely to be in pool
- **Diversity**: Random crossover between pool members prevents convergence
- **Exploration**: Mutation rate controls exploration vs exploitation

---

## Network Visualizer (`ts/neural-network/visualizer.ts`)

Real-time rendering of the neural network's internal state.

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

### Visual Elements

**Nodes (Neurons)**:

- Circle with black outline
- Inner fill colored by activation:
  - Red = high positive activation (close to 1)
  - Blue = high negative / zero activation
  - White = neutral
- Output nodes also show bias as a dashed ring

**Connections (Weights)**:

- Lines connecting input nodes to output nodes
- Color: `getRGBA(weight)` — red for positive, blue for negative
- Thickness proportional to |weight|

**Labels** (output layer only):

- ↥ = Forward
- ↤ = Left
- ↦ = Right
- ↧ = Reverse

### Layout

```
┌─────────────────────────────────────┐
│  Output Layer       ↥  ↤  ↦  ↧    │  (top)
│        ↕ connections                │
│  Hidden Layer       ○  ○  ○  ○  ○  ○│
│        ↕ connections                │
│  Input Layer        ○  ○  ○  ○  ○  ○│  (bottom)
└─────────────────────────────────────┘
```

Levels are drawn bottom-to-top (input at bottom, output at top).

---

## Persistence

### Save

```typescript
localStorage.setItem('bestBrain', JSON.stringify(bestNetwork));
localStorage.setItem('bestBrains', JSON.stringify(topKNetworks));
```

### Load

```typescript
const saved = JSON.parse(localStorage.getItem('bestBrain'));
// Apply to car: car.brain = saved
```

### Export (`.car` files)

Car files include the full network structure plus physics/sensor parameters:

```javascript
const carData = ({
  brain: { levels: [{ inputs: [...], outputs: [...], weights: [[...]], biases: [...] }, ...] },
  maxSpeed: 3,
  friction: 0.05,
  acceleration: 0.2,
  sensor: { rayCount: 5, raySpread: 1.57, rayLength: 150, rayOffset: 0 }
})
```
