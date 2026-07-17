# Fix Layer Violation: Extract `CarBrainAdapter.trainStep()`

**Date:** 2026-07-17
**Slug:** fix-layer-violation-car-brainadapter
**Entry points affected:** none — shared `ts/` only (car, car-brain-adapter)
**Save-file impact:** none — no schema changes; `humanTrainedCar` localStorage key unchanged
**Backward compat:** preserved — brain serialization unchanged; `NeuralNetwork.trainStep` still exported (but no longer called from `car/`)

## Goal

Eliminate the layer isolation violation where `ts/car/car.ts` directly imports and calls `NeuralNetwork` — a Layer 3 module — from Layer 2 (`car/`). Per AGENTS.md: "Car must never import NeuralNetwork, audio, or explode. Bridge through CarBrainAdapter and CarCallbacks." The `CarBrainAdapter` already bridges `createBrain`, `serialize`, `deserialize`, `feedForward`/`computeControls`, and `buildInput`. It needs a `trainStep` method so `car.ts` never touches `NeuralNetwork` directly.

## Context (read first)

- `AGENTS.md` — architecture rules (layer isolation, `Brain = unknown` opaque type, `CarBrainAdapter` bridge).
- `ts/car/car.ts` — lines 397-405 (decision-point extra train calls), lines 419-491 (`#trainBatch` method with 3 `NeuralNetwork.trainStep` call sites), line 12 (direct `import { NeuralNetwork }`).
- `ts/car/brain/carBrainAdapter.ts` — existing bridge with `createBrain`, `serialize`, `deserialize`, `computeControls`, `buildInput`, `inputLayerSize`, `brainsCompatible`. Add `trainStep` here.
- `ts/neural-network/network.ts` — `NeuralNetwork.trainStep()` signature: `static trainStep(network: NeuralNetwork, inputs: number[], targets: number[], lr: number | number[]): boolean`.

## Scope

- **In scope:**
  - Add `static trainStep(brain: Brain, inputs: number[], targets: number[], lr: number | number[]): boolean` to `CarBrainAdapter`.
  - Replace all `NeuralNetwork.trainStep(...)` calls in `car.ts` with `CarBrainAdapter.trainStep(...)`.
  - Replace all `this.brain as NeuralNetwork` casts in `car.ts` with `this.brain` (typed as `Brain`) — no casting needed when passing to `CarBrainAdapter.trainStep`.
  - Remove `import { NeuralNetwork } from '../neural-network/network.js'` from `car.ts`.
  - Clean up `CarBrainAdapter` imports: `NeuralNetwork` is imported there already (line 2), but `IntersectionPoint` on line 1 should use `import type`.
- **Out of scope:**
  - No changes to `NeuralNetwork` internals, `trainStep` algorithm, or any other file outside `ts/car/car.ts` and `ts/car/brain/carBrainAdapter.ts`.
  - No changes to `ts/car/brain/carBrainAdapter.ts` imports of `NeuralNetwork` — Layer 3 imports are legitimate in the adapter (it is the bridge).

## Implementation

### 1. `ts/car/brain/carBrainAdapter.ts` — add `trainStep` method

Add to the `CarBrainAdapter` class, after `computeControls`:

```ts
static trainStep(
  brain: Brain,
  inputs: number[],
  targets: number[],
  lr: number | number[],
): boolean {
  return NeuralNetwork.trainStep(brain as NeuralNetwork, inputs, targets, lr);
}
```

Also fix the `IntersectionPoint` import on line 1: change from `import { IntersectionPoint }` to `import type { IntersectionPoint }`.

The existing `buildInput` method takes `IntersectionPoint` as a parameter type — the `import type` will still satisfy the type annotation and be elided at compile time.

### 2. `ts/car/car.ts` — replace all `NeuralNetwork` references

**Remove the direct import (line 12):**

```diff
- import { NeuralNetwork } from '../neural-network/network.js';
```

No replacement needed — `CarBrainAdapter` is already imported on line 11.

**Replace `this.brain as NeuralNetwork` casts in `#trainBatch` (lines 421, 397):**

At line 397 (decision-point block, inside `#processBrain`):

```diff
- const brain = this.brain as NeuralNetwork;
+ const brain = this.brain;
```

Then replace the `NeuralNetwork.trainStep(brain, ...)` call on line 400 with:

```diff
- NeuralNetwork.trainStep(brain, inputVector, targets, perOutputLR)
+ CarBrainAdapter.trainStep(brain, inputVector, targets, perOutputLR)
```

At line 421 (`#trainBatch` method):

```diff
- const brain = this.brain as NeuralNetwork;
+ const brain = this.brain;
```

Replace `NeuralNetwork.trainStep(brain, ...)` on line 428 with:

```diff
- NeuralNetwork.trainStep(brain, buffer[i].inputs, buffer[i].targets, lr)
+ CarBrainAdapter.trainStep(brain, buffer[i].inputs, buffer[i].targets, lr)
```

Replace `NeuralNetwork.trainStep(brain, ...)` on line 482 with:

```diff
- NeuralNetwork.trainStep(brain, buffer[idx].inputs, buffer[idx].targets, lr)
+ CarBrainAdapter.trainStep(brain, buffer[idx].inputs, buffer[idx].targets, lr)
```

**There are no other `NeuralNetwork.` references in `car.ts`** — verified by grep showing only `NeuralNetwork.trainStep` and `NeuralNetwork` in the import line and cast expressions.

## Brain / persistence considerations

None. The `Brain = unknown` abstraction is preserved — `car.ts` never touches `NeuralNetwork` as a type after this change. Brain serialization, `CarInfo`, and localStorage keys are unaffected.

## Acceptance criteria

- `npm run fix:all` passes (format + lint) and `tsc --noEmit` compiles clean.
- `ts/car/car.ts` contains no import of `NeuralNetwork` — only imports from `CarBrainAdapter` and `Controls`, `PhoneControls`, `CameraControls`, `CarPhysics`, `CarRenderer`, `config`, and types.
- `ts/car/brain/carBrainAdapter.ts` imports `NeuralNetwork` (as value, for the bridge) and `IntersectionPoint` as `import type`.
- Human backpropagation (html/human-training.html) and training simulator (html/simulator.html, html/traffic.html) still work — brain training, replay buffer, and inference all function identically.
- No behavioral changes: `trainStep` is delegated through the adapter, same algorithm.

## Docs to update

- `AGENTS.md` — no changes needed (rule already documented; this _fixes_ the violation).
- `docs/Physics.md` — no changes needed (no new API surface documented).
