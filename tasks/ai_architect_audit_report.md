# AI Architecture Audit Report — Self-Driving Car Simulator

## 1. Architectural Violations & Concerns

### CRITICAL: Circular Dependencies

- **`ts/car/car.ts` ↔ `ts/car/physics/carPhysics.ts`** — `Car` imports `CarPhysics`, `CarPhysics` imports `Car` (line 1). These form a mutual dependency that will break at runtime if the module loading order ever changes. Remediation: Extract a `CarState` interface (position, speed, angle, polygon, etc.) that `CarPhysics` receives as a parameter, breaking the direct class dependency.

- **`ts/car/car.ts` ↔ `ts/car/sensors/sensor.ts`** — `Car` creates `new Sensor(this, ...)`, `Sensor` imports `Car`. Same bidirectional coupling. Remediation: `Sensor` should accept only the position data it needs (`x`, `y`, `angle`) rather than the full `Car` instance.

### CRITICAL: Layer 2 Upward Import (Layer Boundary Violation)

- **`ts/car/car.ts:1`** — `import { NeuralNetwork } from '../neural-network/network.js'`. Layer 2 (Car) imports from Layer 3 (NeuralNetwork). According to the architecture, `CarBrainAdapter` should be the sole bridge. `Car` references `NeuralNetwork` in its constructor, `toInfo()`, and `load()`. Remediation: Move brain-related operations (constructor brain creation, serialization) behind the adapter, and have `Car` only know about a generic `Brain` interface through the adapter.

### MODERATE: God Object — `Car`

- **`ts/car/car.ts`** — The `Car` class owns 29 fields, all public. It orchestrates physics, rendering, sensors, brains, controls, and audio. No true private fields (`#`). External code freely mutates `car.speed`, `car.angle`, `car.x`, `car.y`, `car.polygon`, `car.damaged`. Impact: mutation is untraceable, making debugging generation-to-generation transitions difficult. Remediation: Use `#` private fields with controlled setters/getters; move audio (`engine`, `explode()`) out of the `update()` method and into a listener pattern.

### MODERATE: Audio Leakage into Entity Layer

- **`ts/car/car.ts:9,183-210`** — `Car.update()` calls `explode()` and `this.engine.setVolume()/setPitch()`. This embeds audio output logic inside a physics entity. Remediation: Fire a `'damaged'` event that the simulator shell (Layer 4) listens to; `SoundEngine` should be managed by the simulator, not the car.

### MODERATE: Missing Encapsulation in Physics

- **`ts/car/physics/carPhysics.ts:10-12`** — `car: Car` is public. `move()` directly mutates `this.car.speed`, `this.car.angle`, `this.car.x`, `this.car.y`. Remediation: `CarPhysics.update()` should accept position/state as input parameters and return a delta or new state, rather than mutating through a public reference.

### MINOR: Magic Numbers Spread

- **`ts/simulator/training/modes/trafficFactory.ts`** — Hardcoded `width: 30, height: 50, maxSpeed: 2`, Y-coordinates (-100, -300, -500, -700) are repeated across every car creation. Should source from `DEFAULT_CAR_CONFIG`.
- **`ts/world/world.ts:380-385`** — `arrowSpacing = 200`, `arrowLength = 20`, `arrowAngle = Math.PI / 8` in `#drawLaneMarkings` are inlined rather than extracted to a config.
- **`ts/world/trafficManager.ts:90-91`** — `greenDuration = 2`, `yellowDuration = 1` seconds, repeated in `update()` at line 105-106. Duplicated magic literals.

### MINOR: Inconsistent Private Field Usage

- Some classes use `#` private fields (`WorldEditor`, `SpatialHashGrid`, `StoreManager`, `CarRenderer`), others use TypeScript `private` keyword (`StoreManager.private static instance`, `Level.private static randomize`), and `Car` uses no access modifiers at all. Impact: TypeScript `private` is erased at runtime and does not protect against external mutation. Recommend `#` everywhere.

### MINOR: Misc `ts/utils.ts` Bag

- **`ts/utils.ts`** — Contains `polysIntersect` (collision math), `getRGBA` (color utility), `getRandomColor` (random color gen), `safeJsonParse` (data validation), `stripFileExtension` (string utility). These are semantically unrelated. Impact: unclear which layer they belong to; creates a generic "junk drawer" module. Recommend splitting: `polysIntersect` → `ts/math/collision.ts`, color helpers → `ts/math/color.ts`, JSON/string → `ts/store/serialization.ts` or similar.

---

## 2. Commendable Implementations

- **`SpatialHashGrid` (`ts/math/spatialGrid.ts`)** — Excellent. Clean `#` private fields, stamp-based dedup avoids Set allocation per query, parameterized cell size, build/clear/insert/query API. Used by `TrafficSimulator`, `RaceSimulator`, and `TrainingSimulator` via `queryBordersNearCar`. Properly documented with JSDoc.

- **`SimulatorShell` → subclass template method** — The abstract `SimulatorShell` (`ts/simulator/core/simulatorShell.ts`) correctly enforces the Template Method pattern with `update()`/`draw(time)` abstract methods, render-throttled RAF loop, and resize wiring. Subclasses (`TrainingSimulator`, `TrafficSimulator`, `RaceSimulator`) properly defer to the base instead of rewriting the lifecycle.

- **`CarRenderer.#spriteCache`** — Static `Map<string, HTMLCanvasElement>` flyweight cache. Per-frame sprite allocation is avoided; thousands of cars render as a single `drawImage` each. Good.

- **`World` serialization (v2 schema)** — `World.load()` and `World.toJSON()` handle v1→v2 migration with zero baked geometry, reproducible tree prototypes from seed, and footprint-only buildings. Proper backward compatibility.

- **`StoreManager`** — Well-encapsulated singleton with `#` private fields, file-scoped constants (avoiding tsc global alias collision), proper error handling for localStorage quota overflow, and clean source-ordering for asset resolution (loaded → editor → store).

- **`poolManager.ts`** — Uses `NeuralNetwork.clone()` before crossover to prevent parent mutation, and `brainsCompatible()` to guard topology mismatches. Good defensive design.

- **Import hygiene** — All imports use `.js` extensions across the codebase ✓. No bare specifiers ✓. Deliberate avoidance of barrel files ✓. Entry files follow the stated pattern (nominal imports → declares → side-effect imports → async IIFE).

---

## 3. Structural Reorganization Recommendations

### Immediate Priority

| Action                                                     | Files                                                     | Rationale                                                                                                                                       |
| ---------------------------------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Extract `CarState` interface                               | New `ts/car/carState.ts`                                  | Break `car.ts` ↔ `carPhysics.ts` circular dep. `CarPhysics` takes `CarState` + `ControlsState` instead of `Car` instance.                      |
| Extract `SensorState`                                      | Modify `ts/car/sensors/sensor.ts`                         | `Sensor` receives `(x, y, angle)` instead of `Car`, breaking the `car.ts` ↔ `sensor.ts` cycle.                                                 |
| Move `NeuralNetwork` import from `car.ts` to adapter layer | Modify `ts/car/car.ts`, `ts/car/brain/carBrainAdapter.ts` | Resolve Layer 2 → Layer 3 upward import. `Car` should reference an opaque `Brain` type; all serialization/feedforward goes through the adapter. |
| Extract audio out of `Car.update()`                        | Modify `ts/car/car.ts`, `ts/simulator/`                   | Fire domain events; let the simulator shell subscribe to car state changes.                                                                     |

### Medium Priority

| Action                                       | Files                                                | Rationale                                                                                                                                                        |
| -------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Encapsulate `Car` fields                     | `ts/car/car.ts`                                      | Mark position, speed, angle, etc. as `#` private with controlled accessors. Prevents untracked mutation from physics/simulator code.                             |
| Split `ts/utils.ts`                          | New `ts/math/collision.ts`, `ts/math/color.ts`, etc. | Remove the misc utility bag. `polysIntersect` belongs in math.                                                                                                   |
| Extract magic numbers in `trafficFactory.ts` | `ts/simulator/training/modes/trafficFactory.ts`      | Reference `DEFAULT_CAR_CONFIG` instead of hardcoded width/height/speed.                                                                                          |
| Deduplicate `greenDuration`/`yellowDuration` | `ts/world/trafficManager.ts`                         | Extract to module-level constants or a config object; currently duplicated between `#initializeControlCenters` and `update()`.                                   |
| Encapsulate `trafficManager` frame counting  | `ts/world/trafficManager.ts`                         | `frameCount` is incremented in `update()` → called from `World.draw()`. Frame counting in a draw method is a side-effect violation. Move to a time-delta system. |

### Low Priority / Nice-to-Have

| Action                                           | Files                                  | Rationale                                                                                         |
| ------------------------------------------------ | -------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `RaceSimulator` delegate extraction              | `ts/simulator/racing/raceSimulator.ts` | 357-line class with 12 private methods. Extract `RaceProgressTracker` and `RaceCollisionHandler`. |
| `WorldEditor` delegate extraction                | `ts/world/editors/worldEditor.ts`      | 543-line class. The editor tool map, OSM parsing, and UI wiring could be split.                   |
| Consistent `#` private fields across all classes | Multiple files                         | Unify on ES2022 `#` convention across the codebase for runtime encapsulation.                     |
