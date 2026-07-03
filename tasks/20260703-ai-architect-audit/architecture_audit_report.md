# AI Architect Audit Report

## Project Scope

This audit covers the browser-based self-driving car simulation platform under `/Users/alex/Code/Self-driving-car`. The codebase is implemented as zero-runtime-dependency, TypeScript-compiled JavaScript loaded via sequential `<script>` tags, with global scope classes exposed on `window`.

## Methodology

- Confirmed the HTML entry files use explicit script ordering and no `type="module"` imports.
- Inspected core layers: `ts/math`, `ts/car`, `ts/neural-network`, `ts/simulator`, `ts/games`, `ts/world`, and UI panels.
- Evaluated adherence to the requested global-script architecture, feature-sliced domain boundaries, and pattern expectations.

---

## 🚨 Architectural Violations & Concerns

### File/Location: `ts/car/car.ts`

- Issue: `Car` is a large god object mixing physics, sensor/brain wiring, rendering asset caching, and audio behavior.
- Impact: Hard-to-maintain coupling between vehicle dynamics, visualization, AI control, and sound; slows future refactor and testability.
- Remediation: Split into at least three responsibilities:
  - `CarPhysics` / movement and collision state
  - `CarSensor` / perception and ray-casting
  - `CarView` or `CarRenderer` / sprite composition and draw logic
  - `CarBrainAdapter` / AI output mapping to controls

### File/Location: `ts/car/car.ts`

- Issue: `load(info: CarInfo)` mutates the car instance and deserializes brain data using `JSON.parse(JSON.stringify(info.brain))`.
- Impact: The brain payload is treated as `NeuralNetwork` but is actually plain JSON, which risks broken prototype behavior and opaque runtime bugs.
- Remediation: Introduce explicit serialization types such as `SerializedNeuralNetwork`, plus a static factory method like `Car.fromInfo(info: CarInfo)` or `NeuralNetwork.load(serialized)`.

### File/Location: `ts/simulator/core/simulatorShell.ts`

- Issue: The simulator shell owns too much DOM/querying responsibility for specific custom panels and toolbar elements.
- Impact: While the Template Method pattern is present, the base shell is still tightly coupled to page-specific element names and toolbar DOM structure.
- Remediation: Move custom element lookup into a lightweight host/config layer, and keep `SimulatorShell` focused on canvas lifecycle, animation timing, and abstract `update()` / `draw()`.

### File/Location: `ts/games/race.ts`

- Issue: `Race` manages both gameplay state and DOM panel construction (`#createRacePanel`, toolbar wiring, statistics DOM updates).
- Impact: Mixing game state with view assembly violates separation of concerns and creates a brittle page-specific layer.
- Remediation: Extract the UI assembly into a dedicated `RaceView` or `RacePanel` component, leaving `Race` responsible only for world, car, and race rules.

### File/Location: `ts/car/sensors/sensor.ts`

- Issue: `Sensor` depends on the owning `Car` for origin/angle and mutates its own rays/readings with direct world-edge intersection logic.
- Impact: This is not a fatal issue, but it places perception logic inside a class that is also responsible for rendering and physical attachment.
- Remediation: Preserve `Sensor` as a perception component, but decouple ray geometry generation from world query filtering, and document the domain boundary clearly.

### File/Location: `tsconfig.json`

- Issue: `module` is set to `commonjs` while the runtime is browser script tags.
- Impact: It is likely harmless when no imports/exports exist, but it is confusing and may mislead future contributors about the intended module format.
- Remediation: Clarify the compiler configuration or change `module` to `none`/`es2022` if the browser output is intended to remain script global.

### File/Location: `ts/neural-network/network.ts`

- Issue: `NeuralNetwork` uses plain objects and `JSON.parse(JSON.stringify(...))` for deep copy semantics instead of explicit serialization boundaries.
- Impact: This obscures whether the network is domain logic or transport data, and can leak mutated prototype-less objects into consumers.
- Remediation: Add first-class serialization helpers such as `NeuralNetwork.clone(network)` and `NeuralNetwork.deserialize(data)`.

### File/Location: `ts/panels/worldToolbar.ts`

- Issue: One custom element handles too many workouts: UI state, asset selectors, file loading, mode switching, and active selection management.
- Impact: This makes the element an organism-level monolith that is difficult to test and reuse across simulator/game shells.
- Remediation: Split the toolbar into smaller element groups or helper classes: selectors, mode buttons, and camera controls.

### File/Location: `ts/world/world.ts`

- Issue: `World.load(info)` is a good factory, but the `World` constructor still generates and owns both graph and generated decoration state.
- Impact: This makes `World` both a data container and a generation engine.
- Remediation: Consider separating `WorldGenerator` completely from `World` so that `World` is purely an immutable-like model and the generator is a service.

---

## 🌟 Commendable Implementations

### File/Location: `ts/math/spatialGrid.ts`

- Strength: Excellent spatial partitioning implementation with private fields, stamped deduplication, and low-allocation query semantics.
- Impact: This is a solid performance optimization for high-car-count scenes and matches the desired spatial-indexing pattern.

### File/Location: `ts/simulator/core/simulatorShell.ts`

- Strength: Clear Template Method structure for animation lifecycle, render throttling, and reusable simulator scaffolding.
- Impact: This provides an excellent foundation for multiple simulator pages to share timing and layout behavior.

### File/Location: `ts/car/car.ts`

- Strength: Sprite caching with precompositing is a good flyweight-like optimization that reduces render cost significantly.
- Impact: This is a strong performance pattern for a canvas-based car renderer.

### File/Location: `ts/world/world.ts`

- Strength: `World.load(info)` and `toJSON()` form a unified persistence layer, including a backward-compatible v1/v2 migration path.
- Impact: This demonstrates thoughtful serialization and versioned compatibility for world data.

### File/Location: HTML entry files (`html/simulator.html`, `html/race.html`, `html/traffic.html`, `html/world.html`)

- Strength: Script ordering is explicit and consistent, with core math primitives loaded first, followed by world, then simulator/game layers.
- Impact: This confirms the global-script architecture is correctly enforced at runtime.

---

## 🗺️ Structural Reorganization Recommendations

### 1. Strengthen the Layered Architecture

- `ts/math/`: keep only pure mathematical utilities and spatial structures.
- `ts/car/`: preserve physics and vehicle domain objects, but factor rendering and brain wiring into dedicated collaborators.
- `ts/neural-network/`: keep AI logic mathematically abstract and avoid direct car or controls dependencies.
- `ts/simulator/`: retain shell lifecycle and page scaffolding; move page-specific DOM assembly and panel wiring into `ts/simulator/views/` or `ts/simulator/pages/`.
- `ts/games/`: restrict to game-specific orchestration only (`Race`, `Traffic`, `WorldEditor`, etc.).

### 2. Enforce explicit serialization boundaries

- Create a dedicated `CarSerializer` or `CarInfo` utility type alongside `NeuralNetworkSerializer`.
- Prefer `static fromInfo(info: CarInfo)` over mutating instance `load(info)`.
- Ensure stored brains are deserialized back into real `NeuralNetwork` instances before use.

### 3. Convert large classes into smaller collaborators

- Extract `CarSpriteCache` into a dedicated renderer helper with `getSprite(color, width, height)`.
- Extract `SensorRaycaster` as a pure geometry/perception module that accepts origin, angle, polygons, and returns readings.
- Extract `RacePanel` from `Race` to manage toolbar and stats DOM, so `Race` can focus on gameplay flow.

### 4. Refine custom element boundaries using Atomic Design

- Atoms: keep individual toolbar buttons, toggles, and labeled controls in `ts/panels/atoms`.
- Molecules: group selector rows, layout switches, and mode buttons in `ts/panels/molecules`.
- Organisms: keep `WorldToolbarElement`, `TrainingPanelElement`, and `WorldLayersToolbarElement` as self-contained organisms, but split internal paging/selector logic into child components or helper classes.
- Templates/Pages: keep exclusive shells such as `Race`, `TrainingSimulator`, and `WorldEditor` as page-level orchestrators.

### 5. Reduce global DOM coupling in `SimulatorShell`

- Replace direct `document.querySelector()` calls in the base shell with constructor-injected panel references, or a small `SimulatorHost` object.
- Keep `SimulatorShell` responsible for canvas management and let the page decide which toolbars exist.

---

## Recommendations Summary

1. Keep the current layering concept; the project already has a good separation between math, world, car, AI, and shell.
2. Refactor large classes and custom elements to reduce god-object behavior.
3. Strengthen serialization and clone semantics for AI brains and saved car/world data.
4. Preserve `SimulatorShell` and `SpatialHashGrid` as architectural winners.
5. Consider a small directory reorganization to make the layer boundaries explicit as `atoms/molecules/organisms/templates` for UI and `core/domain/ai/shells` for engine logic.

---

## Suggested File Targets for Refactor

- `ts/car/car.ts`
- `ts/car/sensors/sensor.ts`
- `ts/simulator/core/simulatorShell.ts`
- `ts/games/race.ts`
- `ts/panels/worldToolbar.ts`
- `ts/neural-network/network.ts`
- `ts/world/world.ts`

## Short Refactor Sprint Plan

### Sprint Goal

Split the biggest domain responsibilities while preserving the global script load model and runtime behavior.

### Sprint Tasks

1. Refactor `ts/car/car.ts`
   - Extract `CarPhysics` for motion and damage state.
   - Extract `CarRenderer`/`CarSpriteCache` for sprite composition and draw methods.
   - Extract `CarBrainAdapter` or `CarController` to map neural network outputs to `Controls`.
   - Keep `Car` as the lightweight orchestrator that composes these parts.
2. Harden serialization boundaries
   - Add `NeuralNetwork.deserialize()` and `NeuralNetwork.clone()`.
   - Replace `JSON.parse(JSON.stringify(...))` with explicit network load logic.
   - Add `Car.fromInfo(info)` or `Car.deserialize(info)` and reduce direct instance mutation.
3. Clean up simulator shell coupling
   - Create a small `SimulatorHost` argument object for `SimulatorShell` to receive toolbar/card references.
   - Remove direct `document.querySelector()` calls from the base shell.
4. Separate view assembly from game state
   - Extract `RacePanel` or `RaceView` for toolbar/stats DOM wiring.
   - Keep `Race` focused on world, cars, and race progression.
5. Split complex panels by role
   - Identify `WorldToolbarElement` sub-domains and move selector logic into helper classes or smaller custom elements.

### Sprint Deliverables

- `Car` split into physics + renderer + control adapter.
- Explicit AI serialization helpers for `NeuralNetwork` and `CarInfo`.
- `SimulatorShell` dependency injection for toolbar/panel references.
- A cleaner `Race` UI separate from gameplay logic.

### Success Criteria

- No runtime module syntax changes are introduced.
- The existing pages still load with the same script order.
- `Car` no longer contains rendering and audio behavior within its core physics update loop.

## Proposed Directory Layout

- `ts/math/`
  - pure geometry, utility functions, spatial indexing
- `ts/car/`
  - core vehicle domain objects and factories
- `ts/car/physics/`
  - physics motion, collision checks, and damage state
- `ts/car/rendering/`
  - sprite caching, draw helpers, and render options
- `ts/car/brain/`
  - brain adapter, controller mapping, and serialization helpers
- `ts/neural-network/`
  - abstract network logic and serialization utilities
- `ts/simulator/`
  - lifecycle shell, canvas management, and layout wiring
- `ts/simulator/views/`
  - simulator-specific DOM/UI assembly for `Race`, `TrainingSimulator`, etc.
- `ts/panels/`
  - custom element modules grouped by atomic design intent

## Exact Refactor Task List

1. `ts/car/car.ts`

   - Extract `CarPhysics` into `ts/car/physics/carPhysics.ts`.
   - Extract sprite caching and `draw(ctx)` behavior into `ts/car/rendering/carRenderer.ts`.
   - Extract AI output mapping into `ts/car/brain/carBrainAdapter.ts`.
   - Keep `Car` as a composition root that delegates to physics, sensor, renderer, and brain adapter.

2. `ts/neural-network/network.ts`

   - Add `static deserialize(data: unknown): NeuralNetwork`.
   - Add `static clone(network: NeuralNetwork): NeuralNetwork`.
   - Replace every `JSON.parse(JSON.stringify(...))` copy with these helpers.

3. `ts/car/sensors/sensor.ts`

   - Extract ray generation and intersection logic into `ts/car/physics/sensorRaycaster.ts`.
   - Keep `Sensor` as a thin wrapper around origin/angle state and the pure raycaster API.

4. `ts/simulator/core/simulatorShell.ts`

   - Create a `SimulatorHost` interface containing toolbar/panel references.
   - Update `SimulatorShell` constructor to accept the host object instead of querying DOM directly.
   - Move page-specific query logic into `ts/simulator/views/simulatorPageHost.ts` or each page's init code.

5. `ts/games/race.ts`

   - Extract `RacePanel` into `ts/games/racePanel.ts`.
   - Move DOM creation, stats updates, and toolbar wiring there.
   - Keep `Race` responsible only for world loading, car generation, race state, and update/draw loops.

6. `ts/panels/worldToolbar.ts`

   - Identify distinct subdomains: mode buttons, selection lists, and file loaders.
   - Move asset selector rendering and event binding into helper functions or a child element.
   - Keep `WorldToolbarElement` as an organism that composes smaller UI pieces.

7. `ts/world/world.ts` and `ts/world/generation/worldGenerator.ts`

   - Ensure `World.load(info)` only rehydrates model data.
   - Move all generation and re-anchoring behavior into `WorldGenerator` helper functions.

8. `tsconfig.json`
   - Review whether `module: commonjs` should become `none` or `es2022` to align with no bundler script loading.

## Next Step

The report now includes an exact refactor plan with directory layout guidance and file-level actions.

## Prioritized Refactor Checklist

1. `ts/car/car.ts` decomposition
   - Extract `CarPhysics` and `CarRenderer`.
   - Move AI-output-to-controls mapping into a dedicated adapter.
   - Keep the existing `Car` API stable while swapping internal collaborators.
2. AI serialization hardening
   - Add `NeuralNetwork.deserialize()` and `NeuralNetwork.clone()`.
   - Replace all `JSON.parse(JSON.stringify(...))` network copies.
   - Introduce `Car.fromInfo(info)` or `Car.deserialize(info)`.
3. Simulator shell decoupling
   - Define a `SimulatorHost` interface.
   - Remove direct DOM queries from `SimulatorShell`.
   - Keep page-specific toolbar setup in `ts/simulator/views/`.
4. Race view separation
   - Extract `RacePanel` from `ts/games/race.ts`.
   - Move DOM and stats wiring into the new view helper.
5. Toolbar atomic splitting
   - Break `WorldToolbarElement` into selector, mode, and control subdomains.
   - Keep the organism as a composition of smaller helpers.

These are the highest-impact changes that preserve behavior while reducing coupling.
