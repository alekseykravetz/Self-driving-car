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
  static mutateFromPool(brains: NeuralNetwork[], amount: number): NeuralNetwork;

  // Serialization helpers (replaces ad-hoc JSON clone patterns)
  static deserialize(data: NeuralNetwork): NeuralNetwork;
  static clone(network: NeuralNetwork): NeuralNetwork;
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

Legacy (non-traffic-aware) cars:

| Input  | Source              | Range  | Meaning                           |
| ------ | ------------------- | ------ | --------------------------------- |
| ray1-N | `1 - sensor.offset` | [0, 1] | 0 = clear path, 1 = touching wall |
| speed  | `speed / maxSpeed`  | [0, 1] | 0 = stopped, 1 = max speed        |

Traffic-aware cars (`sensor.trafficAwareness: true`) interleave one light-state
input per ray between the distance inputs, so the input layer is
`rayCount*2 + 1` instead of `rayCount + 1`:

| Input       | Source                      | Range  | Meaning                               |
| ----------- | --------------------------- | ------ | ------------------------------------- |
| rayDist1-N  | `1 - sensor.offset`         | [0, 1] | 0 = clear path, 1 = touching wall     |
| rayLight1-N | `encodeTrafficState(state)` | [0, 1] | green=1, yellow=0.5, red/off/absent=0 |
| speed       | `speed / maxSpeed`          | [0, 1] | 0 = stopped, 1 = max speed            |

A light-state input is only non-zero for a ray whose closest hit is a traffic
light in front of the road-border hit; otherwise it is 0 (treated as absent).

### Output Decoding

| Output | Control            | Value | Effect          |
| ------ | ------------------ | ----- | --------------- |
| out[0] | `controls.forward` | 0/1   | Accelerate      |
| out[1] | `controls.left`    | 0/1   | Steer left      |
| out[2] | `controls.right`   | 0/1   | Steer right     |
| out[3] | `controls.reverse` | 0/1   | Brake / reverse |

### Configurable Architecture

The `hiddenLayers` parameter in `CarInfo` allows customizing the network depth:

- Default: `[6]` → architecture `[rayCount+1, 6, 4]` (legacy) or `[rayCount*2+1, 6, 4]` (traffic-aware)
- Custom: `[8, 6]` → architecture `[inputSize, 8, 6, 4]`

Input layer size is chosen by `CarBrainAdapter.inputLayerSize(rayCount, trafficAwareness)`. When `rayCount` or `trafficAwareness` changes, the entire network must be rebuilt (input layer size changes). `brainsCompatible()` rejects any brain swap whose input layer size does not match the target car, so traffic-aware and legacy brains never get cross-applied.

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
  const child = NeuralNetwork.clone(net1);
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

### Pool-Based Mutation (`NeuralNetwork.mutateFromPool`)

```typescript
static mutateFromPool(brains: NeuralNetwork[], amount: number): NeuralNetwork {
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

Brain data flows through `CarBrainAdapter` — the Car class never imports
`NeuralNetwork` directly. PoolManager uses `as NeuralNetwork` casts internally:

```typescript
function applyPoolToCars(cars, pool, mutationRate): void {
  const brains = pool.filter((c) => c.brain).map((c) => c.brain);

  for (let i = 0; i < cars.length; i++) {
    if (i < brains.length) {
      // Elitism: exact copy of pool member (via CarBrainAdapter.clone)
      cars[i].brain = CarBrainAdapter.clone(brains[i]);
    } else {
      // Offspring: crossover + mutation from pool
      cars[i].brain = CarBrainAdapter.mutateFromPool(brains, mutationRate);
    }
  }
}
```

The adapter's `clone` and `mutateFromPool` internally cast to `NeuralNetwork`
and delegate to `NeuralNetwork.clone` / `NeuralNetwork.mutateFromPool`.

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

Real-time, **interactive** rendering of the neural network's internal state on a
dedicated canvas. `NetworkVisualizer` is a stateful instance: it caches the
geometry it builds each frame (a `NetworkLayout` of neurons and connections) so
the owning canvas can hit-test the mouse and reveal exact numeric values on
hover.

```typescript
class NetworkVisualizer {
  // Draw the whole network; `time` (ms) drives the signal-flow animation.
  draw(
    ctx: CanvasRenderingContext2D,
    network: NeuralNetwork,
    time: number,
  ): void;

  // Mouse/keyboard interactivity (wired by the simulator shell).
  setMouse(x: number, y: number): boolean; // returns true when over an element
  clearMouse(): void; // call on mouseleave
  handleClick(x: number, y: number): boolean; // consumes clicks on the toggle
  toggleDensity(): void; // show every value at once (bound to the `v` key)
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
│                    ray1 … rayN speed │
└─────────────────────────────────────┘
```

Rows run bottom-to-top (input at bottom, output at top). The input row is
labelled `ray1…rayN` plus the trailing `speed` input; the output row shows the
control arrows.

### Colour palette (diverging amber ↔ cyan)

A visualizer-local palette replaces the shared `getRGBA()` (which stays
untouched for car/sensor rendering). It reads strongly on the black canvas:

- **Positive** values → amber → yellow (`#FFB000` … `#FFE44D`).
- **Negative** values → **cyan** (`#00E5FF`) instead of the old hard-to-see dark
  blue.
- Magnitude is encoded with lightness **and** line width; alpha has a floor
  (`0.25 + 0.75·|value|`) so weak weights stay faintly visible instead of
  disappearing.

An always-on **legend** (cyan −1 → dark 0 → amber +1) sits in the bottom-left
corner next to the density-toggle button.

### Visual Elements

**Nodes (Neurons)**:

- Dark disc with a glowing radial-gradient core coloured by the activation.
- Output/hidden neurons carry a **static** dashed **bias ring** (colour = bias
  sign/magnitude). Input neurons have no bias ring.

**Connections (Weights)**:

- Lines from input nodes (bottom) to output nodes (top).
- Colour by weight (amber positive / cyan negative); thickness ∝ |weight|.

**Signal-flow animation**:

- For each connection the live `signal = input × weight` is computed. Connections
  actually carrying signal show **travelling particles** moving input→output,
  with speed, size and brightness ∝ |signal|. Idle connections stay calm dim
  lines. Particle phase is derived from `time` (no per-frame allocation).
- This replaces the old, meaningless global dashed-line scroll — motion now
  reflects what the network is really doing for the current inputs.

**Output Labels** (top layer only):

| Symbol | Meaning |
| ------ | ------- |
| ↥      | Forward |
| ↤      | Left    |
| ↦      | Right   |
| ↧      | Reverse |

### Hover inspection

- **Hover a neuron** → a white highlight ring appears, its activation `a=` and
  bias `b=` are shown beside it, **every incoming connection weight** is labelled
  near its line, and unrelated elements dim to reduce clutter.
- **Hover a connection** → the line brightens and a cursor tooltip shows the
  `weight`, the source `input`, the live `contrib = input × weight`, and the
  `src → dst` neuron indices. The tooltip is clamped to stay on-canvas.
- **Density toggle** (`v` key or the on-canvas `values (v)` button) shows every
  neuron/weight value at once — handy for screenshots. Default off.

### Real-time Updates

The visualizer redraws every render frame with the current network state of the
car selected by the toolbar tracking mode — the best AI car by default, or the
user-controlled KEYS car when tracking is set to "keys" (which also reveals the
KEYS car's sensor rays on the main canvas). This shows:

- Which sensors are detecting obstacles (input layer lights up)
- How hidden neurons respond to the pattern (feature extraction visible)
- Which control outputs are active (output layer shows current decisions)
- Which weights are strong/weak (connection colours and thickness)
- **Where signal is actually flowing** right now (travelling particles)

This provides immediate visual feedback during training — you can see the
network "thinking" as it navigates obstacles, and hover any neuron or connection
to read its exact learned values.
