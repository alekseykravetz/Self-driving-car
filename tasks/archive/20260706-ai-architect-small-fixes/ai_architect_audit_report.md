# AI Architect Audit Report

**Date:** July 6, 2026
**Scope:** Full architectural audit of the browser-based autonomous vehicle simulation platform
**Standards:** Feature-Sliced Design (FSD), Atomic Design, project-specific engineering constraints

---

## 1. Layer Isolation & Import Hygiene

**Status: Mostly clean — 3 violations found**

### Commendable

- **Layer 1 (`ts/math/`)** imports only from `math/primitives/` and standard TS libs. No project imports from higher layers.
- **Layer 2 (`ts/car/`, `ts/world/`, `ts/rendering/`)** — Car never imports NeuralNetwork directly (only through `carBrainAdapter.ts`).
- **Layer 3 (`ts/neural-network/`)** imports only from `ts/math/utils.js`. No imports from car, world, or any higher layer.
- **Adapter pattern enforced.** `car/brain/carBrainAdapter.ts` is the sole bridge between car and neural-network.
- **All import paths use `.js` extension.** No bare specifiers found.
- **No barrel files introduced.** `ts/utils.ts` is a legacy re-export barrel (acknowledged in AGENTS.md).

### Violations

- **File:** `ts/world/types.ts:4,9,10`
  **Issue:** `Car`, `Viewport`, `IMiniMapCar` imported with value `import` but used only in type positions (interface properties).
  **Impact:** Violates project convention (`import type` for type-only imports). Increases risk of circular dependency if these modules ever import from `world/types`.
  **Remediation:** Convert to `import type`:
  ```ts
  import type { Car } from '../car/car.js';
  import type { Viewport } from '../viewport/viewport.js';
  import type { IMiniMapCar } from '../mini-map/miniMap.js';
  ```

---

## 2. Structural & Folder Boundaries (FSD)

**Status: Good overall — 1 significant concern, 0 domain leaks**

### Commendable

- **`ts/math/` is clean.** Pure primitives, collision detection, color, spatial grid, utils. No domain knowledge about cars or sensors.
- **`ts/car/` vs. `ts/neural-network/`** clean separation. Only bridge is `carBrainAdapter.ts`.
- **`ts/simulator/` vs. `ts/race/` / `ts/traffic/`** correct. Entry files in `ts/race/` and `ts/traffic/` are thin wrappers.
- **`ts/panels/` vs. `ts/simulator/panels/`** split is clean. Generic panels in `ts/panels/`, simulator-specific in `ts/simulator/panels/`.

### Violations

- **File:** `ts/simulator/core/simulatorShell.ts:13`
  **Issue:** Imports `resizeSimulatorLayout` from `../training/rendering/layoutManager.js` — a training-scoped directory. `SimulatorShell` is the shared base class for all simulators (training, race, traffic).
  **Impact:** Creates a dependency from a shared shell into a domain-specific submodule. If the training directory were ever restructured or extracted, the shared shell breaks.
  **Remediation:** Move `layoutManager.ts` to `ts/simulator/rendering/layoutManager.ts` and update the import path in `simulatorShell.ts`:
  ```ts
  // New path: ts/simulator/rendering/layoutManager.ts
  import { resizeSimulatorLayout } from '../rendering/layoutManager.js';
  ```

---

## 3. Design Pattern Evaluation

### Desired Patterns (Good)

| Pattern                      | Location                                                                                            | Status                                                                   |
| ---------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Factory/Serialization**    | `Car.fromInfo()` / `load()` / `toInfo()`, `NeuralNetwork.deserialize()` / `clone()`, `World.load()` | ✅ Round-trip fidelity maintained                                        |
| **Template Method**          | `SimulatorShell` abstract class with `update()`/`draw(time)` hooks                                  | ✅ All 3 subclasses implement correctly without rewriting core lifecycle |
| **Flyweight (Sprite Cache)** | `CarRenderer.#spriteCache` keyed by `color\|width\|height`                                          | ✅ Per-frame `drawImage`, no per-frame allocations                       |
| **Spatial Partitioning**     | `SpatialHashGrid` with `Int32Array` stamp-based O(1) dedup                                          | ✅ Used by RaceSimulator, TrafficSimulator via `queryBordersNearCar()`   |
| **Side-effect registration** | Custom elements register themselves via their module                                                | ✅ Entry files import for side effects                                   |
| **Audio via Callbacks**      | `CarCallbacks` (`onDamaged`, `onEngineUpdate`) decouples audio from Car                             | ✅ RaceSimulator injects SoundEngine at setup                            |

### Anti-Patterns (Bad)

#### Magic Numbers

| File                                                         | Location                 | Value                                                                                                | Recommendation                                                          |
| ------------------------------------------------------------ | ------------------------ | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `ts/car/sensors/sensor.ts:22-25`                             | Constructor defaults     | `rayCount ?? 5`, `rayLength ?? 150`, `raySpread ?? Math.PI / 2`                                      | Import defaults from `DEFAULT_CAR_CONFIG.sensor` instead of duplicating |
| `ts/simulator/training/modes/trafficFactory.ts:4-6`          | Module-level constants   | `TRAFFIC_WIDTH = 30`, `TRAFFIC_HEIGHT = 50`, `TRAFFIC_MAX_SPEED = 2`                                 | Reference `DEFAULT_CAR_CONFIG` or create a traffic config object        |
| `ts/simulator/spatialGridUtils.ts:49`                        | `bodyMargin` computation | `Math.hypot(car.width, car.height) * 0.5`                                                            | Use `BODY_MARGIN_RATIO` from `ts/car/config.ts`                         |
| `ts/simulator/training/modes/simpleModeBehavior.ts:15,35-37` | Module-level constants   | `INITIAL_TRAFFIC_Y = -700`, `TRAFFIC_LOOKAHEAD = 1500`, `TRAFFIC_ROW_GAP = 200`, `TRAFFIC_SPEED = 2` | Extract to a `SimpleModeConfig` object                                  |
| `ts/simulator/traffic/trafficSimulator.ts:460,464`           | Arrow-head angle         | `2.618` and `-2.618`                                                                                 | Replace with `(5 * Math.PI / 6)` / `(-5 * Math.PI / 6)`                 |
| `ts/race/entry.ts:102`                                       | Panel width              | `rightPanelWidth = 250`                                                                              | Minor — could move to layout constants                                  |

#### God Object (Minor Smell)

- **File:** `ts/simulator/racing/raceSimulator.ts` (~367 lines)
  **Issue:** Handles race initialization, car generation, progress tracking, collision handling, and full draw logic.
  **Impact:** Reduced readability and testability.
  **Remediation:** Extract `RaceProgressTracker` (progress/finish logic) and `RaceCarGenerator` (car creation from pool/config) into separate modules.

---

## 4. Code Standards & Style Adherence

### Commendable

- **Naming conventions:** All classes PascalCase, methods/variables camelCase. Files match primary export name.
- **`#` private fields used consistently:** `Car`, `SimulatorShell`, `RaceSimulator`, `TrafficSimulator`, `TrainingSimulator`, `Controls`, `CarRenderer`.
- **`draw(ctx, options?)` pattern:** `Car.draw()`, `Sensor.draw()`, `World.draw()` all follow typed options interface pattern.
- **Entry point structure:** All 4 entry files follow the required pattern: (1) nominal imports, (2) `declare` for DOM refs, (3) side-effect imports, (4) async IIFE with `StoreManager.init()`.
- **Zero runtime dependencies.** Canvas 2D API only.

### Violations

- **File:** `ts/world/types.ts` (entire file)
  **Issue:** None of the 10 imports use `import type` despite all being type-only (used in interface property positions).
  **Impact:** Increased risk of circular dependencies; does not follow project convention.
  **Remediation:** Annotate all imports with `import type`.

---

## 5. Structural Reorganization Recommendations

### High Priority

1. **Move `resizeSimulatorLayout` from `ts/simulator/training/rendering/layoutManager.ts` to `ts/simulator/rendering/layoutManager.ts`**

   - Eliminates the training-scoped import from `SimulatorShell`.
   - All simulators use this layout code; it is not training-specific.

2. **Convert value imports to `import type` in `ts/world/types.ts`**
   - All 10 imports are type-only (`Point`, `Segment`, `Graph`, `Car`, `Marking`, `Corridor`, `Building`, `Tree`, `TreeInstance`, `Viewport`, `IMiniMapCar`).
   - Strengthens cycle safety and matches convention.

### Medium Priority

3. **Consolidate traffic constants** — Extract `TRAFFIC_WIDTH`, `TRAFFIC_HEIGHT`, `TRAFFIC_MAX_SPEED` from `trafficFactory.ts` into a config object (or reference `DEFAULT_CAR_CONFIG`).

4. **Fix `BODY_MARGIN_RATIO` usage** — `spatialGridUtils.ts:49` uses `0.5` directly instead of importing `BODY_MARGIN_RATIO` from `car/config.ts`.

5. **Eliminate duplicate sensor defaults** — `sensor.ts` constructor duplicates `DEFAULT_CAR_CONFIG.sensor` values. Import from config instead.

### Low Priority

6. **Extract `RaceProgressTracker` and `RaceCarGenerator`** from `RaceSimulator` (~367 lines).

7. **Replace magic numbers `2.618` / `-2.618` in `trafficSimulator.ts`** with `(5 * Math.PI / 6)` / `(-5 * Math.PI / 6)`.

---

## Appendix: Files Reviewed

| Directory                                                                  | Files                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ts/car/`                                                                  | `car.ts`, `carState.ts`, `config.ts`, `brain/carBrainAdapter.ts`, `physics/carPhysics.ts`, `physics/sensorRaycaster.ts`, `sensors/sensor.ts`, `rendering/carRenderer.ts`, `controls/controls.ts`, `loader/carLoader.ts`                                                                                                                                                                                                        |
| `ts/neural-network/`                                                       | `network.ts`, `visualizer.ts`                                                                                                                                                                                                                                                                                                                                                                                                  |
| `ts/math/`                                                                 | `utils.ts`, `collision.ts`, `color.ts`, `spatialGrid.ts`                                                                                                                                                                                                                                                                                                                                                                       |
| `ts/simulator/`                                                            | `core/simulatorShell.ts`, `entry.ts`, `spatialGridUtils.ts`, `training/trainingSimulator.ts`, `training/genetics/poolManager.ts`, `training/genetics/storageManager.ts`, `training/modes/simpleModeBehavior.ts`, `training/modes/trafficFactory.ts`, `training/modes/borderCollision.ts`, `training/rendering/layoutManager.ts`, `training/rendering/carRenderer.ts`, `racing/raceSimulator.ts`, `traffic/trafficSimulator.ts` |
| `ts/panels/`                                                               | Directory listing                                                                                                                                                                                                                                                                                                                                                                                                              |
| `ts/store/`                                                                | `storeManager.ts`, `serialization.ts`                                                                                                                                                                                                                                                                                                                                                                                          |
| `ts/world/`                                                                | `entry.ts`, `types.ts`, `world.ts`                                                                                                                                                                                                                                                                                                                                                                                             |
| `ts/race/`                                                                 | `entry.ts`                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `ts/traffic/`                                                              | `entry.ts`                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `ts/viewport/`, `ts/mini-map/`, `ts/camera/`, `ts/audio/`, `ts/rendering/` | Entry points                                                                                                                                                                                                                                                                                                                                                                                                                   |
