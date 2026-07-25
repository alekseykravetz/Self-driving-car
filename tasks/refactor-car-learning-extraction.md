# Refactor: Extract Human-Backprop Learning from `Car` into `CarLearningManager`

**Date:** 2026-07-25
**Slug:** refactor-car-learning-extraction
**Entry points affected:** primarily `html/human-training.html` (Human Backpropagation). Must also remain correct for `html/simulator.html`, `html/traffic.html`, `html/race.html` where cars do NOT learn.
**Save-file impact:** none (localStorage `humanTrainedCar` brain format unchanged)
**Backward compat:** must be fully preserved

## Goal

`ts/car/car.ts` (~590 lines) is a god object: it owns physics state, sensor, brain, controls **and** the entire online human-imitation learning subsystem (experience-replay ring buffer, class-balanced batch sampling, per-output learning rates, decision-point detection). Extract the learning subsystem into a dedicated `CarLearningManager` so `Car` focuses on being a car and the backprop/replay logic lives in one testable unit.

**Behavior-preserving refactor. Human Backpropagation training dynamics (what the brain learns, when weights change) must be identical.**

## Context (read first)

- `AGENTS.md` (repo root) — read the **"Human Backpropagation mode"**, **"Experience replay in `Car`"**, **"`CarBrainAdapter.buildInput()` extracted"**, **"`trainStep` per-output LR"**, and **"`trainStep` safety guards"** sections. They describe the exact learning design this task relocates.
- Layer rules: `Car` is Layer 2. Neural-network access flows ONLY through `ts/car/brain/carBrainAdapter.ts` (Layer 3 bridge). `Car` must NOT import `NeuralNetwork` directly. The new manager therefore belongs next to the adapter in `ts/car/brain/` and must use `CarBrainAdapter` (not `NeuralNetwork`) for all training.
- Private members use `#`. Imports use `.js`. No barrel files.

### Key source members in `ts/car/car.ts`

- **Learning fields** (~lines 100-127): `#learningRate`, `#lastBrainOutput`, `#brainChangedThisFrame`, `#replayBuffer`, `#replayBufferMaxSize` (4096), `#batchSize` (16), `#prevControlState`.
- **Learning branch** inside `#processBrain(...)` (~lines 355-410): the `if (this.#learningFromHuman && !this.#autopilot && !this.damaged && ...)` block that builds the input vector, computes targets from control state, detects decision points, pushes to the replay buffer, computes per-output LR (`[lr, lr*1.5, lr*1.5, lr]`), calls `#trainBatch(...)`, and does the 3× extra `CarBrainAdapter.trainStep` on decision points.
- **`#trainBatch(lr)`** (~lines 423-510): class-balanced 50/50 turn/straight sampling + Fisher-Yates shuffle + per-sample `trainStep`.
- **Public API consumed elsewhere:** `get/set learningRate`, `setLearningRate(v)`, and getters exposing `#lastBrainOutput` and `#brainChangedThisFrame` (used by the Human Training panel/network visualizer). Find exact consumers with a workspace search for `learningRate`, `lastBrainOutput`, `brainChangedThisFrame` before moving anything.
- **`CarBrainAdapter.buildInput(...)` / `CarBrainAdapter.trainStep(...)`** in `ts/car/brain/carBrainAdapter.ts` — the training primitives the manager must call.

### Tests

- `tests/unit/car/car.test.ts` — existing Car tests (construction, update pipeline, setAutopilot, learningRate). Must stay green; add delegation coverage.
- Add `tests/unit/car/carLearningManager.test.ts` — new unit tests for the replay buffer, balanced sampling, and `train` return value.
- `tests/visual/human-training.spec.ts` — visual baseline must stay green.

## Architecture rules

1. **New collaborator:** `ts/car/brain/carLearningManager.ts`, `export class CarLearningManager`. Owns the replay buffer, batch size, prev-control state, learning rate, and the two output-mirror fields (`lastBrainOutput`, `brainChangedThisFrame`) OR return them from a `learn(...)` call — pick one and keep the public surface stable (see rule 4).
2. **Manager trains via `CarBrainAdapter` only** — never import `NeuralNetwork`. It receives the opaque `Brain` and passes it straight to `CarBrainAdapter.trainStep`.
3. **`Car` delegates, does not duplicate.** The learning branch in `#processBrain` becomes a single call like `this.#learning.learn({ brain, inputs, controlsState, ... })` returning whether weights changed; `Car` stores that into `#brainChangedThisFrame` (or reads it back from the manager).
4. **Public API stability.** `Car.learningRate` (get/set), `Car.setLearningRate`, and the getters for last brain output / brain-changed must keep the exact same names and semantics — external callers (Human Training panel, visualizer) must not need edits. If they end up delegating to the manager internally, that's fine.
5. **No behavior drift:** same buffer max (4096), same batch size (16), same per-output LR multipliers (`1.5` for left/right), same decision-point 3× extra steps, same `isTurn` definition, same balanced sampling and shuffle.
6. **Non-learning paths unaffected:** when `#learningFromHuman` is false (all AI/genetic/traffic/race cars), the manager must be inert / never allocate work.

## Scope

### In scope

- Create `CarLearningManager` and move the replay buffer, sampling, `#trainBatch`, decision-point logic, and the LR schedule into it.
- Reduce `Car`'s learning branch to construction of inputs/targets (or move that in too) + one delegated call.
- Keep `Car`'s public learning-related API identical via thin delegation.
- Add `tests/unit/car/carLearningManager.test.ts`.

### Out of scope

- Changing training math in `CarBrainAdapter.trainStep` or `NeuralNetwork`.
- Changing autopilot (`setAutopilot`) or `Controls.frozen` behavior.
- Changing the `humanTrainedCar` localStorage format.
- Splitting other Car concerns (physics/sensor/rendering) — separate task.

## Suggested steps

1. Search the workspace for every external reference to `learningRate`, `lastBrainOutput`, `brainChangedThisFrame`, `setLearningRate` so you know the public contract to preserve.
2. Create `CarLearningManager` with the moved fields and a `learn(args): boolean` method plus a `record`/buffer helper as needed; give it accessors for `lastBrainOutput` and `brainChangedThisFrame`.
3. In `Car`: add `#learning = new CarLearningManager()`; replace the learning block and `#trainBatch` with delegation; forward the public getters/setters to the manager.
4. `npx tsc --noEmit` until clean.
5. `npm test` — fix Car tests; write `carLearningManager.test.ts`.
6. `npm run test:visual` (human-training baseline) — must stay green.
7. `npm run fix:all`.

## Verification / acceptance criteria

- [ ] `npx tsc --noEmit` passes.
- [ ] `npm run lint:log` clean; `npm run format:check` clean.
- [ ] `npm test` green, including new `carLearningManager.test.ts`.
- [ ] `npm run test:visual` green with no baseline changes.
- [ ] `ts/car/car.ts` no longer declares `#replayBuffer`, `#replayBufferMaxSize`, `#batchSize`, `#prevControlState`, or `#trainBatch`.
- [ ] `ts/car/car.ts` does not import `NeuralNetwork` (still only `CarBrainAdapter`).
- [ ] Human Backpropagation still learns online (manual smoke check: drive in `html/human-training.html`, confirm the brain-activity dot flickers and accuracy updates).
- [ ] `wc -l ts/car/car.ts` meaningfully lower.
- [ ] Update the relevant `AGENTS.md` bullets ("Experience replay in `Car`", "Human Backpropagation mode") to point at `CarLearningManager`.
