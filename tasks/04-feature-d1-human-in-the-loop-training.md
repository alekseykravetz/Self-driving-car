# Feature D1: Human-in-the-Loop Training

**Priority:** 4 | **Effort:** Small | **Impact:** Medium | **Risk:** Low

## Core Concept

The KEYS car's brain learns to **imitate the human's driving** each frame (online apprenticeship learning via straight-through-estimator backprop), then competes alongside AI cars for a slot in the next generation's gene pool. The user "teaches by example."

> **Design note (revision):** the original draft assumed the KEYS brain was already "shaped by human driving." It wasn't — the KEYS brain was random and never trained (only run forward to refresh the visualizer). Injecting it would have injected noise and likely _harmed_ training. This feature therefore adds a real online imitation-learning step **before** the brain enters the pool. See `docs/Physics.md` (Neural Network section) for the math.

## Target Files

- `ts/neural-network/network.ts` — `NeuralNetwork.trainStep` (STE backprop)
- `ts/car/car.ts` — `#learningFromHuman` flag, KEYS-branch training hook
- `ts/simulator/training/genetics/poolManager.ts` — `includeKeys` flag on pool selection
- `ts/simulator/training/trainingPanel.ts` — toggle wiring, generation-cycle integration
- `ts/simulator/training/templates/trainingPanelTemplate.ts` — checkbox + status badge

## Implementation (as built)

### 1. `NeuralNetwork.trainStep(network, targets, lr)` — `ts/neural-network/network.ts`

Online imitation-learning step. Assumes `feedForward(input, network)` was just called on the current frame's input, so each `level.inputs[]` / `level.outputs[]` already holds fresh values (the KEYS branch's existing visualizer forward pass satisfies this — no extra forward pass needed).

- **Output layer:** perceptron error `delta = target - output` (binary-step derivative treated as 1 via the straight-through estimator).
- **Hidden layers:** backprop through the next level's weights; `step' = 1` contributes no extra factor.
- **Update rule:** `w[input][output] += lr * delta * input`; `bias -= lr * delta`.
- **Bias sign:** this codebase uses `z = Σ w·x − bias` with `step(z > 0)`, so to raise `z` when error is positive we _decrease_ the bias (opposite of the usual `b += lr·err` convention).
- **No activation change at inference** — pool/crossover compatibility (`brainsCompatible`) is unaffected.

### 2. Car wiring — `ts/car/car.ts`

- New private field `#learningFromHuman: boolean = false` + `setLearningFromHuman(enabled)` / `learningFromHuman` getter.
- New constant `KEYS_LEARNING_RATE = 0.1` (single place to tune).
- In `update()`'s non-brain-driven `else` branch (the KEYS car), after the existing `CarBrainAdapter.computeControls(...)` forward pass (which already populates level state for the visualizer), if `#learningFromHuman && !damaged && speed !== 0 && controls instanceof Controls`, call `NeuralNetwork.trainStep(this.brain, [forward, left, right, reverse], KEYS_LEARNING_RATE)`. The target vector is read off `this.controls` (0/1 per channel).
- **Guards:** skip when damaged (don't learn crashes) or stationary (don't learn "sit still"). The `controls instanceof Controls` guard excludes Camera/Phone control schemes.

### 3. Pool selection — `ts/simulator/training/genetics/poolManager.ts`

Instead of a separate `injectKeysCarIntoPool(pool, keysCar, maxPoolSize, evalFitness)` (which would require re-evaluating `CarInfo` snapshots via a stub Car — fragile), the KEYS car is included as a **candidate alongside AI cars** during top-K selection:

- `getSortedAICars(cars, evalFit, includeKeys = false)` — when `includeKeys` is true, the `type !== 'KEYS'` filter is bypassed.
- `getTopAICars(cars, evalFit, k, includeKeys = false)` — same flag threaded through.
- `getTopCarInfoPool(cars, evalFit, poolSize, includeKeys = false)` — same.

This evaluates the KEYS car's fitness against the **live Car object** (real position/speed/fitness), not a stub, so ranking is accurate. Topology compatibility is still enforced downstream by `brainsCompatible()` inside `applyPoolToCars`, so an incompatible KEYS brain is silently dropped — exactly the graceful-skip behavior the original spec required. `applyPoolToCars` already skips the KEYS car itself (`type === 'KEYS'` → `continue`), so the imitation-learned KEYS brain is never overwritten by pool brains mid-session.

### 4. UI toggle — `ts/simulator/training/templates/trainingPanelTemplate.ts`

Added inside the "Simulation" section:

```html
<label class="inject-keys-toggle" title="…">
  <input type="checkbox" id="injectKeys" checked />
  <span>Learn from KEYS car</span>
  <span class="keys-status" id="keysPoolStatus"></span>
</label>
```

Defaults to **on** (the feature is the whole point of D1). The `#keysPoolStatus` badge shows "∈ pool" when enabled, empty when disabled.

### 5. Panel wiring — `ts/simulator/training/trainingPanel.ts`

- New DOM fields `#injectKeysInput`, `#keysPoolStatus`.
- `#injectKeysInput` `change` listener → `#applyLearningFromHumanToKeysCar()` (propagates toggle to the live KEYS car mid-generation so learning starts/stops immediately) + `#updateKeysPoolStatus()` (refreshes the badge).
- `#createCarsWithPool` calls `keysCar[0].setLearningFromHuman(this.injectKeysEnabled)` so a freshly-restarted session respects the checkbox from frame 0.
- `nextGeneration()` calls `this.#getTopCarInfoPool(this.injectKeysEnabled)` — when on, the KEYS car competes for a pool slot; when off, existing behavior is preserved.
- Public `get injectKeysEnabled(): boolean` for external reads.

### 6. `TrainingManagerOptions.injectKeys`

**Not added.** The toggle state lives in the DOM checkbox (transient per the persistence rule below). No options field is needed because the panel owns the lifecycle.

### 7. Rendering

No visual changes to the simulation canvas. The network visualizer already shows the KEYS brain; with learning on, you'll watch activations converge toward your keypresses over a generation.

### 8. Persistence

Transient training parameter — not persisted to localStorage or world files. Resets to the default (on) on page reload, which is acceptable per the original spec.

## Performance

- `trainStep` runs once per frame on the single KEYS car over a `[inputs, …hidden, 4]` network — negligible vs. the hundreds of AI forward passes.
- Pool inclusion runs once per generation: O(population) selection (unchanged from existing `getTopAICars`).
- The KEYS brain is shared (not copied) during training; only its `toInfo()` snapshot enters the pool, exactly as the original spec planned.

## Acceptance Criteria

- [x] Toggle checkbox appears in the training panel (Simulation section), default on
- [x] When enabled, the KEYS brain is trained online each frame to imitate the human's keypresses (visible in the network visualizer: activations converge toward your driving)
- [x] When enabled, the KEYS car competes for a slot in the next generation's gene pool (ranked by the same fitness function as AI cars)
- [x] When disabled, the KEYS car is excluded from pool selection and its brain is not trained (existing behavior preserved)
- [x] Incompatible brains (e.g. sensor topology changed mid-session) are gracefully skipped via `brainsCompatible()` inside `applyPoolToCars` — no errors
- [x] Pool size never exceeds `poolSize` (the KEYS car is a candidate, not an addition)
- [x] Toggle state persists across generations within a session; resets to default on page reload (acceptable)

## Visual validation

1. Start training, drive the KEYS car for a full generation. The network visualizer should show output activations increasingly matching your keypresses.
2. Click **Next Gen** with the toggle on → some AI children should inherit your behavior via crossover (look for cars that steer where you steered).
3. Toggle off mid-session → learning stops immediately, KEYS brain is excluded from the next pool.
4. Change sensor topology (e.g. toggle Traffic Lights) → `brainsCompatible` rejects the KEYS brain silently; no errors in console.

## References

- `NeuralNetwork.trainStep` — `ts/neural-network/network.ts`
- `Car.setLearningFromHuman` / `#learningFromHuman` — `ts/car/car.ts`
- `getSortedAICars` / `getTopAICars` / `getTopCarInfoPool` `includeKeys` flag — `ts/simulator/training/genetics/poolManager.ts`
- `brainsCompatible()` — `ts/simulator/training/genetics/poolManager.ts`
- Toggle wiring — `ts/simulator/training/trainingPanel.ts`
- Template — `ts/simulator/training/templates/trainingPanelTemplate.ts`
