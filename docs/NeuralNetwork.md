# Neural Network & Neuroevolution

The AI brain system in `ts/neural-network/` implements a feedforward neural network trained via genetic algorithms (neuroevolution) or, in the Human Backpropagation mode, via online straight-through-estimator backpropagation. The network makes binary decisions about car controls each frame.

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
  static trainStep(
    network: NeuralNetwork,
    inputs: number[],
    targets: number[],
    lr?: number | number[],
  ): boolean;
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

## Online Imitation Learning (`NeuralNetwork.trainStep`)

In addition to neuroevolution, the network supports **online backpropagation** via
a **sigmoid relaxation** of the binary-step network. This is used exclusively by
the [Human Backpropagation mode](#human-backpropagation-mode) to train a single
car's brain to imitate the human's keypresses each frame.

### Why a sigmoid relaxation

The network activates when `z = Σ w·x − bias > 0` (binary step). The logistic
`σ(z)` shares the **exact same decision boundary** (`σ(z) > 0.5 ⟺ z > 0 ⟺
sum > bias`), so a network trained on the smooth surrogate produces the correct
binary-step decisions at inference time. Unlike a straight-through estimator
(which treats `step' = 1` and yields a coarse, poorly-conditioned gradient that
fails to train multi-layer networks), the sigmoid gives real graded errors and
proper multi-layer credit assignment — while inference stays pure binary step,
keeping the brain compatible with the genetic/AI cars, serialization, and the
visualizer.

### Method

```typescript
static trainStep(
  network: NeuralNetwork,
  inputs: number[],
  targets: number[],
  lr: number | number[] = 0.1,
): boolean;
```

Runs its **own** sigmoid forward pass from `inputs` (it does not depend on a
prior `feedForward` call and never reads the binary `level.outputs` left by
inference), then backpropagates and updates every layer. Inference continues to
use binary step, so pool/crossover compatibility is unaffected.

Returns `true` if any weight or bias was updated this step (i.e. at least one
output neuron had a non-zero error), `false` otherwise. The Human Backpropagation
panel uses this to pulse a "brain activity" indicator — the dot lights green
only on frames where the brain actually learned something.

`lr` can be a single number (applied uniformly to all outputs) or an array of
per-output learning rates `[forward, left, right, reverse]`. When an array is
passed, per-neuron LR **only applies to the last (output) level** — hidden
layers use `lr[0]` as the base rate. This prevents the array from being indexed
beyond its length (which would produce `NaN`).

### Algorithm

Weights and biases stay in the genetic cars' `[-1, 1]` range, so the brain
inspector, the network visualizer, and the saved-brain format all stay
consistent (no big numbers, no special-casing). Three ingredients keep training
well-behaved at that small scale:

- **Sigmoid gain** (`GAIN = 2`) — the training sigmoid is `σ(GAIN·z)`, sharp
  enough to approximate the hard binary step even with small weights. Without
  it, small weights make the sigmoid soft (outputs near 0.5) and training no
  longer matches step inference, which tanks accuracy.
- **Label smoothing** (`ε = 0.1`) — targets become `0.1 / 0.9` instead of
  `0 / 1`, so cross-entropy no longer drives the sigmoid to fully saturate. This
  is what stops the weights from blowing up (fully saturating a sigmoid requires
  ever-larger weights).
- **Weight decay** (`λ = 0.002`) — a gentle L2 pull toward 0 keeping weights off
  the clamp boundary.

Steps:

1. **Forward pass:** `a = σ(GAIN·z)` per neuron, feeding sigmoid activations
   forward through every layer.
2. **Output layer:** `δ = GAIN · (a − smooth(target))` (the sigmoid +
   cross-entropy gradient with label smoothing — a graded error, not the binary
   `±1` of STE).
3. **Hidden layers:** backprop through the next level's weights and multiply by
   the sigmoid derivative: `δ_hidden[k] = (Σ_j w_next[k][j] · δ_next[j]) · GAIN · a[k] · (1 − a[k])`.
4. **Update rule:** `w[input][output] -= lr · (δ · input + λ · w)`;
   `bias += lr · δ` (see bias-sign convention below).

### Safety guards

- **NaN/Inf prevention** — `!isFinite(di)` and `!isFinite(effectiveLR)`
  guards skip corrupted values; neurons with a zero delta are also skipped.
- **Weight clamping** — all weights and biases are clamped to `[-1, 1]` after
  every update, matching the range used by the genetic cars' init/mutation so a
  backprop-trained brain is indistinguishable in scale from an evolved one.

### Bias sign convention

This codebase uses `z = Σ w·x − bias`, so `∂z/∂bias = −1` and gradient descent
becomes `bias += lr · δ` (with `δ = ∂L/∂z`). Equivalently, the bias is
**decreased** when a neuron should fire more easily — the opposite of the usual
`b -= lr·δ` convention for `z = Σ w·x + bias`.

### Guards (applied in `Car.#processBrain`)

- **Not when damaged** — don't learn from crashes.
- **Not when no keys are pressed** — skip idle frames so "release keys" frames
  don't overwrite lessons via recency bias.
- **Not in autopilot mode** — the brain is driving, not learning.
- **Not when learning is paused** — the L-key toggle sets `#learningFromHuman`
  to `false`, halting all weight updates while still allowing the forward pass
  (so the visualizer and accuracy display keep working).
- **Only for `Controls`-type cars** — excludes Camera/Phone control schemes.

### Learning rate

The default `lr = 0.1` is tunable from the Human Backpropagation panel
(0.01–0.5). Higher values converge faster but risk oscillation; lower values
produce smoother learning.

**Per-output scaling** — the Human Backpropagation mode boosts the (rarer) turn
channels: `forward: 1×`, `left: 1.5×`, `right: 1.5×`, `reverse: 1×` of the base
slider value. Each replay sample is a **full** SGD step (the LR is _not_ divided
by the batch size — doing so previously made learning ~16× too slow to converge).
See the Simulators doc for details.

---

## Human Backpropagation Mode

A standalone simulator (`html/human-training.html`) that uses `trainStep` to
teach a neural network by having a human drive the car. The brain learns to
imitate the human's keypresses in real time — no genetic algorithm, no
population, no generations.

### How it works

1. A single KEYS car is created with a fresh (or saved) brain. Learning is **ON
   by default**.
2. Each frame, the forward pass runs (populating `level.inputs[]`/`outputs[]`
   for the visualizer), and the brain's output is compared to the human's actual
   keypresses.
3. When the human is driving (not in autopilot, not damaged, keys pressed, and
   learning is ON), `NeuralNetwork.trainStep` nudges the brain's weights toward
   the human's actions. The return value (`boolean`) indicates whether any
   weights changed — used to pulse the panel's brain-activity dot.
4. The network visualizer shows **match rings** on output neurons: green when
   the brain's output agrees with the human's key, red when it disagrees.
5. A **rolling-window accuracy** percentage (last 120 frames ≈ 2 seconds) tracks
   how often the brain matches the human across all four control channels.
   Per-channel accuracy is shown under each key indicator so the user can see
   that left/right accuracy is lower than forward accuracy.

### Learning toggle (L key)

Press **L** to toggle learning on/off independently of driving. When learning is
paused, the brain's weights are frozen — driving the car does not train it, but
the forward pass still runs so the visualizer and accuracy display keep working.
The panel shows **LEARNING** (green) or **PAUSED** (orange), and the shortcuts
toolbar L indicator reflects the state. Learning is ON by default when the car
is created. The L key uses `latchOnly: true` on the `KeyboardManager` toggle
binding — each keydown flips the state (press-to-toggle), and keyup is a no-op
so the state persists after releasing the key.

### Autopilot toggle

The panel's "Autopilot" checkbox switches the car to brain-driven driving
(`Car.#autopilot = true`): the brain's output controls the car, learning pauses,
and the accuracy display shows `—`. To prevent the human's keyboard from
overwriting the brain's controls between frames, `Car.setAutopilot(true)` also
sets `controls.frozen = true` on the `Controls` instance — the keyboard
listeners become no-op while frozen. The panel shows an "AUTOPILOT ACTIVE"
banner. Switch back to resume human driving and restore the previous learning
state. When autopilot is disengaged, all four controls are reset to `false` so
the car stops immediately (no phantom forward movement from the brain's last
output).

### Persistence

The brain is auto-saved to localStorage key `humanTrainedCar` (a single
`CarInfo` JSON) every ~60 frames, on crash, and on page unload. Reloading the
page restores the trained brain and resumes training. A "Download .car" button
exports the brain as a standard `.car` file; "Reset brain" clears the save and
starts fresh.

### Car configuration

A config modal (`<human-training-config-modal>`) shown on entry and via a
"Config" button lets the user set all car/sensor parameters (height, width,
hidden layers, max speed, accel, friction, ray count/length/spread/offset,
state-aware checkbox). When a saved brain exists, the config is locked (brain
topology is fixed by the saved sensor/hidden-layer dims); "Reset brain" unlocks
it.

### Crash behavior

On crash, the car auto-respawns at the start position with the **same trained
brain** — training continues seamlessly. The brain is saved before respawn so
no progress is lost.

---

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

Legacy cars (`sensor.stateAware === false`):

| Input  | Source              | Range  | Meaning                           |
| ------ | ------------------- | ------ | --------------------------------- |
| ray1-N | `1 - sensor.offset` | [0, 1] | 0 = clear path, 1 = touching wall |
| speed  | `speed / maxSpeed`  | [0, 1] | 0 = stopped, 1 = max speed        |

State-aware cars (`sensor.stateAware: true`) interleave one state input per ray
between the distance inputs, so the input layer is `rayCount*2 + 1` instead of
`rayCount + 1`:

| Input       | Source                | Range  | Meaning                               |
| ----------- | --------------------- | ------ | ------------------------------------- |
| rayDist1-N  | `1 - sensor.distance` | [0, 1] | 0 = clear path, 1 = touching wall     |
| rayState1-N | `SensorReading.state` | [0, 1] | 0=green/off/absent, 0.5=yellow, 1=red |
| speed       | `speed / maxSpeed`    | [0, 1] | 0 = stopped, 1 = max speed            |

A state input is 0 for rays whose closest hit is a road border with no other
obstacle in front; it is non-zero when a traffic light (yellow=0.5, red=1) or
another car (1) sits in front of the wall hit.

### Output Decoding

| Output | Control            | Value | Effect          |
| ------ | ------------------ | ----- | --------------- |
| out[0] | `controls.forward` | 0/1   | Accelerate      |
| out[1] | `controls.left`    | 0/1   | Steer left      |
| out[2] | `controls.right`   | 0/1   | Steer right     |
| out[3] | `controls.reverse` | 0/1   | Brake / reverse |

### Configurable Architecture

The `hiddenLayers` parameter in `CarInfo` allows customizing the network depth:

- Default: `[6]` → architecture `[rayCount+1, 6, 4]` (legacy) or `[rayCount*2+1, 6, 4]` (state-aware)
- Custom: `[8, 6]` → architecture `[inputSize, 8, 6, 4]`

Input layer size is chosen by `CarBrainAdapter.inputLayerSize(rayCount, stateAware)`. When `rayCount` or `stateAware` changes, the entire network must be rebuilt (input layer size changes). `brainsCompatible()` rejects any brain swap whose input layer size does not match the target car, so state-aware and legacy brains never get cross-applied.

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
  // `match` (optional) draws green/red rings on output neurons to show
  // whether the brain's output matches the human's keypress — used by
  // the Human Backpropagation mode.
  draw(
    ctx: CanvasRenderingContext2D,
    network: NeuralNetwork,
    time: number,
    stateAware?: boolean,
    match?: (boolean | null)[],
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
  bias `b=` are shown beside it, **every connection weight** (both incoming and
  outgoing) is labelled near its far end, and unrelated elements dim to reduce
  clutter.
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
