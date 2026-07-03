# AI Agent Refactor Plan

## Purpose

This file breaks the architecture audit into smaller, self-contained implementation tasks that can be executed one-by-one by an AI agent while preserving the existing browser-script architecture.

## Global Guardrails

- Preserve the current global-script runtime model. Do not introduce ES modules or bundler-specific syntax.
- Keep existing runtime behavior stable unless a task explicitly requires a behavior fix.
- Prefer small, reversible changes over large rewrites.
- Each subtask should be implementable and verifiable independently.

## Recommended Execution Order

1. Serialization and data boundary hardening
2. Car decomposition and sensor isolation
3. Simulator and game view separation
4. UI panel decomposition
5. World generation separation and config cleanup

## Structural Reorganization Recommendations

These recommendations are intentionally reflected in the subtasks below so the plan stays aligned with the audit report.

1. Strengthen the layered architecture

   - Keep math utilities pure and domain-specific logic inside the car, AI, simulator, and world layers.
   - Preserve the existing script-based runtime model while making boundaries clearer.

2. Enforce explicit serialization boundaries

   - Make neural-network and car persistence use explicit serializer/deserializer helpers.
   - Avoid ad-hoc plain-object cloning for domain entities.

3. Split oversized classes into collaborators

   - Extract physics, rendering, and AI-control mapping from the main car class.
   - Isolate sensor raycasting from the sensor wrapper.

4. Refine custom-element boundaries using Atomic Design principles

   - Keep simple controls as small UI units.
   - Let larger panels and toolbars compose smaller pieces instead of acting as monoliths.

5. Reduce global DOM coupling in the simulator shell
   - Inject host configuration rather than hard-coding page-specific DOM lookups.
   - Keep the shell focused on lifecycle and rendering concerns.

---

## Subtask 1 — Harden Neural Network Serialization

### Goal

Make neural-network data handling explicit and safe by introducing first-class serialization helpers.

### Files

- ts/neural-network/network.ts
- Any places using JSON clone/copy patterns for brain data

### What to Implement

- Add a serialization boundary for neural network data.
- Introduce helpers such as:
  - `NeuralNetwork.deserialize(data)`
  - `NeuralNetwork.clone(network)`
- Replace ad-hoc deep-copy logic based on `JSON.parse(JSON.stringify(...))`.
- Ensure consumers receive real `NeuralNetwork` instances rather than plain JSON-like objects.

### Acceptance Criteria

- No runtime logic depends on raw JSON clone behavior for brain data.
- Existing save/load flows still work.
- The network class exposes explicit serialization helpers.

### Agent Prompt

Use the current network model as the source of truth and introduce explicit serialization helpers without changing the overall runtime architecture. Keep the change local, preserve behavior, and replace any plain-object copy logic with typed helpers.

---

## Subtask 2 — Introduce a Car Factory/Deserializer

### Goal

Replace direct mutation-based car loading with a safer construction path.

### Files

- ts/car/car.ts
- ts/car/types.ts or related car info definitions

### What to Implement

- Add a constructor/factory pattern for car rehydration from persisted info.
- Prefer `Car.fromInfo(info)` or `Car.deserialize(info)` over mutating an existing instance in place.
- Preserve the existing public API where possible.
- Ensure brain payloads are restored into proper network instances.

### Acceptance Criteria

- Car creation from saved info is explicit and deterministic.
- Existing car loading paths still work.
- No new module system is introduced.

### Agent Prompt

Refactor car rehydration to avoid mutating a partially initialized instance. Keep the change behavior-preserving and make saved car data load through a clear factory or deserializer.

---

## Subtask 3 — Extract Car Physics from the Main Car Class

### Goal

Reduce the size of the main car class by moving motion and collision state into a dedicated collaborator.

### Files

- ts/car/car.ts
- New file: ts/car/physics/carPhysics.ts

### What to Implement

- Create a lightweight physics helper responsible for movement, damage state, and physical update concerns.
- Keep `Car` as an orchestrator that delegates to the physics component.
- Preserve the visible car behavior and public methods.

### Acceptance Criteria

- The main car class no longer owns all motion logic directly.
- Existing gameplay and simulation behavior remain intact.
- The refactor is isolated to the car domain.

### Agent Prompt

Split the physical update responsibilities out of the main car class into a focused helper class. Keep the public behavior compatible and avoid touching unrelated systems.

---

## Subtask 4 — Extract Car Rendering and Sprite Caching

### Goal

Move rendering concerns out of the main car class into a dedicated renderer helper.

### Files

- ts/car/car.ts
- New file: ts/car/rendering/carRenderer.ts

### What to Implement

- Extract sprite caching and draw logic into a renderer helper.
- Keep the renderer focused on canvas operations and visual composition.
- Preserve the current rendering behavior and caching semantics.

### Acceptance Criteria

- Car drawing logic is no longer embedded in the core car class.
- Visual output remains unchanged.
- The renderer is reusable and clearly scoped.

### Agent Prompt

Create a small rendering component for car visualization, including sprite caching, while keeping the current appearance and performance characteristics intact.

---

## Subtask 5 — Extract Car Brain Adapter for Control Mapping

### Goal

Separate AI/control mapping from the main car entity.

### Files

- ts/car/car.ts
- New file: ts/car/brain/carBrainAdapter.ts

### What to Implement

- Move the responsibility of converting neural-network outputs into control values into a focused adapter.
- Keep `Car` responsible for orchestrating the adapter and sensor data.
- Avoid introducing dependency cycles with the neural-network module.

### Acceptance Criteria

- Control mapping is isolated from the car’s physical state.
- Existing AI behavior remains unchanged.
- The adapter has a narrow, clearly defined interface.

### Agent Prompt

Extract the logic that translates network outputs into steering/throttle/brake controls into a dedicated adapter. Preserve existing AI behavior and keep the adapter dependency-light.

---

## Subtask 6 — Isolate Sensor Raycasting Logic

### Goal

Decouple perception geometry from the sensor component itself.

### Files

- ts/car/sensors/sensor.ts
- New file: ts/car/physics/sensorRaycaster.ts

### What to Implement

- Extract ray generation and intersection logic into a pure helper module.
- Leave `Sensor` as a thin wrapper around state and the raycaster API.
- Keep the same runtime outputs for perception readings.

### Acceptance Criteria

- Sensor logic is easier to reason about and test.
- No change in car perception behavior.
- The new raycaster is reusable and stateless where practical.

### Agent Prompt

Separate the geometry and intersection work from the sensor wrapper. Preserve the current readings and keep the change focused on decomposition rather than behavior change.

---

## Subtask 7 — Decouple Simulator Shell from Page-Specific DOM Queries

### Goal

Reduce coupling between the core simulator shell and page-specific UI elements.

### Files

- ts/simulator/core/simulatorShell.ts
- New file or helper: ts/simulator/views/simulatorPageHost.ts

### What to Implement

- Introduce a small host/config object for toolbar or panel references.
- Remove direct DOM query logic from the base shell where practical.
- Keep the shell responsible for canvas lifecycle and update/draw scheduling.

### Acceptance Criteria

- The base shell no longer hard-codes page-specific DOM assumptions.
- Existing pages still initialize correctly.
- The refactor improves reusability without breaking the simulator lifecycle.

### Agent Prompt

Make the simulator shell more reusable by injecting lightweight host configuration rather than directly querying specific page elements. Preserve the animation lifecycle and page behavior.

---

## Subtask 8 — Extract Race UI from Race Gameplay Logic

### Goal

Separate game state from view/panel construction.

### Files

- ts/games/race.ts
- New file: ts/games/racePanel.ts

### What to Implement

- Move DOM assembly, stats updates, and toolbar wiring into a dedicated view/panel helper.
- Keep `Race` focused on race rules, world setup, car generation, and progression.
- Preserve the same page experience.

### Acceptance Criteria

- Race gameplay logic is no longer mixed with DOM construction.
- The race UI remains functionally equivalent.
- The new panel helper is self-contained.

### Agent Prompt

Extract the race-specific UI layer from the gameplay class into a dedicated panel/view helper. Keep behavior intact and avoid changing the game loop or race rules.

---

## Subtask 9 — Split World Toolbar Responsibilities

### Goal

Break the large world toolbar element into smaller, focused pieces.

### Files

- ts/panels/worldToolbar.ts
- Optional helper files under ts/panels/

### What to Implement

- Separate selector behavior, mode controls, and file-loading logic into smaller helper units.
- Keep the main custom element as a composition root.
- Preserve the current user interactions.

### Acceptance Criteria

- The toolbar element is easier to understand and maintain.
- Existing controls still work.
- The refactor is scoped to the UI layer.

### Agent Prompt

Decompose the large toolbar element into smaller logical units while keeping its current UI and behavior intact. Avoid over-architecting; focus on clarity and separation of concerns.

---

## Subtask 10 — Separate World Generation from World State

### Goal

Make the world model less responsible for generation concerns.

### Files

- ts/world/world.ts
- ts/world/generation/worldGenerator.ts

### What to Implement

- Move generation and re-anchoring behavior into a dedicated generator helper if practical.
- Keep `World` focused on model state and persistence.
- Preserve save/load compatibility.

### Acceptance Criteria

- World generation logic is clearly separated from the world model.
- Existing world loading and generation flows still function.
- The refactor remains contained to the world domain.

### Agent Prompt

Refactor world generation responsibilities out of the core world model into a dedicated helper so the model remains focused on state and persistence.

---

## Subtask 11 — Review TypeScript Module Configuration

### Goal

Align the compiler config with the project’s runtime model.

### Files

- tsconfig.json

### What to Implement

- Review the current module target and decide whether it should be adjusted to better reflect the global-script architecture.
- Do not introduce module syntax or bundler behavior.

### Acceptance Criteria

- The compiler configuration is no longer misleading.
- The project remains compatible with its existing script-based loading approach.

### Agent Prompt

Review the TypeScript build configuration for clarity and consistency with the project’s browser-script architecture. Make the minimum change needed to remove confusion without changing the runtime loading model.

---

## Definition of Done for Each Subtask

A subtask is complete when:

- The requested refactor is implemented.
- The change remains compatible with the existing global-script runtime.
- Relevant behavior is verified manually or through available build/run commands.
- The scope stays narrow and does not introduce unrelated architecture churn.
