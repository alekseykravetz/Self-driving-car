# Architectural Violations & Concerns

## 1. ts/games/race.ts — Template Method Pattern Violation (High Severity)

**File:** `ts/games/race.ts`

Race manages its own full canvas lifecycle (constructor sets up `gameCanvas`, `cameraCanvas`, `miniMapCanvas`, owns raw `requestAnimationFrame` loop at `ts/games/race.ts:358-361`), completely duplicating the scaffolding already abstracted in `SimulatorShell`. It does not extend `SimulatorShell`.

**Impact:** Duplicated code for viewport reset, camera management, animation loop, canvas resize wiring. Any improvement to `SimulatorShell`'s render-throttled RAF loop or responsive layout must be manually replicated in `Race`. 362 lines of tightly-coupled code that bypasses the architectural template pattern.

**Remediation:** Refactor `Race` to extend `SimulatorShell`, pulling the generic canvas/viewport/camera/animation loop into the shared base class. The race-specific logic (corridor progress, car generation, countdown, statistics panel) should live in `update()` and `draw()` overrides.

## 2. ts/math/primitives/point.ts — Domain Leakage (Medium Severity)

**File:** `ts/math/primitives/point.ts:18-46`

`Point.draw()` embeds Canvas 2D rendering logic directly into a math primitive. This is a cross-cutting concern violation — a pure data structure (`{x, y, z}`) should not know about `CanvasRenderingContext2D`, `ctx.arc()`, or `strokeStyle`.

**Impact:** The same pattern propagates to `Segment.draw()`, `Polygon.draw()`, and `Envelope.draw()`. Makes the math layer dependent on browser Canvas APIs, preventing reuse in headless or non-Canvas contexts.

**Remediation:** Extract all `draw` methods from math primitives into a dedicated `ts/rendering/` layer with renderer functions that accept primitives as data. Alternatively, keep the draw methods but move these files out of `ts/math/` into a rendering layer.

## 3. ts/math/utils.ts — Domain Knowledge Leakage (Medium Severity)

**File:** `ts/math/utils.ts:5-17`

`DEFAULT_CAR_CONFIG` (`maxSpeed`, `acceleration`, `friction`, sensor config) lives in `ts/math/utils.ts` — a file meant for pure mathematical utility functions. `WORLD_PIXELS_PER_METER` and `SIMULATION_FPS` are physics constants; car config is domain data.

**Impact:** Blurs FSD boundaries. The math module should not define car physics defaults.

**Remediation:** Move `DEFAULT_CAR_CONFIG` to `ts/car/config.ts` or consolidate with existing sensor/car configuration. Keep only pure math constants in `ts/math/`.

## 4. ts/car/physics/carPhysics.ts — Spatial Grid Not Used for Collision (High Severity)

**File:** `ts/car/physics/carPhysics.ts:95-138`

`assessDamage()` performs a brute-force O(n) scan of all polygons for collision detection, computing bounding boxes and `polysIntersect` for every polygon in the scene. The `SpatialHashGrid` exists at `ts/math/spatialGrid.ts` with an efficient `query()` method, but it's only used in `TrainingSimulator` and `TrafficSimulator` for border filtering, not exposed to `CarPhysics`.

**Impact:** With large city-scale maps (thousands of road border segments) and large car populations, every car scans every border segment every frame instead of querying the spatial index.

**Remediation:** Refactor `CarPhysics.assessDamage()` (or the car `update()` pipeline) to accept pre-filtered polygons from a spatial grid query, matching the pattern already used in `worldModeBehavior.ts:62-85` and `trafficSimulator.ts:290-301`.

## 5. ts/car/physics/carPhysics.ts — Magic Numbers (Medium Severity)

**File:** `ts/car/physics/carPhysics.ts:34,36,56,63,69`

Hardcoded values: `-this.car.maxSpeed / 2` (reverse speed cap ratio), `0.03` (steering angle delta), `1` and `-1` (flip multiplier). These are tuning constants with no named identifier.

**Impact:** Without extraction to a config object, tuning requires code changes. `0.03` appears both in `carPhysics.ts` and in `borderCollision.ts:32,34` (as `0.1` angle correction) — two different steering magic numbers with no clear rationale.

**Remediation:** Extract `STEERING_SPEED = 0.03`, `REVERSE_SPEED_RATIO = 0.5`, `COLLISION_ANGLE_CORRECTION = 0.1` into `DEFAULT_CAR_CONFIG` or a dedicated physics config object.

## 6. ts/simulator/training/trainingSimulator.ts — God File (Medium Severity)

**File:** `ts/simulator/training/trainingSimulator.ts`

714 lines, the largest file in the codebase. Manages two entirely distinct modes (simple vs world) with separate `update`/`draw` methods (`#updateSimple`, `#drawSimple`, `#updateWorld`, `#drawWorld`), camera tracking, network visualizer wiring, toolbar config, init modal routing, and training metrics. Essentially two simulators in one file.

**Impact:** Reduced maintainability; changes to simple mode risk affecting world mode and vice versa.

**Remediation:** Split into `SimpleTrainingSimulator` and `WorldTrainingSimulator` subclasses, or extract mode-specific behavior into strategy objects (the mode files at `ts/simulator/training/modes/` already contain pure functions — promote them to strategies).

## 7. ts/neural-network/network.ts — `mutateFromPool()` Mutates Pool References (Medium Severity)

**File:** `ts/neural-network/network.ts:88-99`

`mutateFromPool()` directly selects parents from the pool array and passes them to `crossover()` without cloning. Since `crossover()` actually creates a new child (immutable), the parents are not mutated — but the documentation says it "mutates original pool references". The method coexists with `toMutatedFromPool()` (lines 156-171) which explicitly clones first.

**Impact:** Code smell. The unsafe `mutateFromPool()` is retained alongside the safe `toMutatedFromPool()`, creating a trap for future developers.

**Remediation:** Remove `mutateFromPool()` entirely and rename `toMutatedFromPool()` to `mutateFromPool()`, or make the former delegate to the latter.

## 8. ts/simulator/training/modes/borderCollision.ts — Magic Number (Low Severity)

**File:** `ts/simulator/training/modes/borderCollision.ts:32,34`

`car.angle += 0.1` / `car.angle -= 0.1` for collision correction. The magnitude `0.1` radians (~5.7°) is arbitrary.

**Impact:** Two different steering correction constants in the codebase: `0.03` in `carPhysics.ts` and `0.1` here.

**Remediation:** Extract to a named constant.

## 9. html/simulator.html — NeuralNetwork Loaded After Car (Low Severity)

**File:** `html/simulator.html:86-91`, `html/traffic.html:83-88`, `html/race.html:79-84`

`car/car.js` script tag appears before `neural-network/network.js` on every page. While this works because `Car` does not reference `NeuralNetwork` until instantiation (which happens later in the inline `<script>`), it violates the declared dependency hierarchy (Layer 3 should precede Layer 4 consumption).

**Impact:** Fragile ordering that could break if `Car`'s static initialization ever references `NeuralNetwork`.

**Remediation:** Move all `neural-network` script tags before `car` script tags in every HTML file.

## 10. html/world.html — Missing SpatialGrid (Low Severity)

**File:** `html/world.html`

The world editor page loads `math/primitives/` and `math/graph/` but does not load `math/spatialGrid.js`. The spatial grid is only loaded on simulator pages. Consistent with current usage (the editor doesn't need it), but if the editor ever added spatial queries, it would be missing.

**Impact:** None currently; worth noting for future changes.

---

# Commendable Implementations

## 1. ts/math/spatialGrid.ts — Excellent Spatial Index Implementation

**File:** `ts/math/spatialGrid.ts`

- Clean uniform spatial hash grid with O(1) range queries using `Int32Array` stamping for dedup (avoids `Set` allocation per query).
- Proper abstraction with `build()` / `insert()` / `clear()` / `query()` API.
- Narrow-phase integration in `worldModeBehavior.ts` and `trafficSimulator.ts` using squared-distance filtering to avoid `sqrt` in hot paths.

## 2. ts/car/rendering/carRenderer.ts — Well-Executed Flyweight Pattern

**File:** `ts/car/rendering/carRenderer.ts`

- Pre-composited sprite caching via `#spriteCache: Map<string, HTMLCanvasElement>` keyed by `color|width|height`.
- Shared image singleton (`#sharedImage`).
- Efficient `globalCompositeOperation` for per-color tinting without per-car canvas draw ops.
- Clean `draw(ctx, options)` with typed `CarDrawOptions` interface.

## 3. ts/car/car.ts — Factory/Serialization Pattern

**File:** `ts/car/car.ts`

- `Car.fromInfo(opts, info?)` static factory with well-documented JSDoc.
- `toInfo()` serialization to `CarInfo` interface.
- `load(info)` for mutation-based back-compat.
- Clean separation: delegates physics to `CarPhysics`, rendering to `CarRenderer`.

## 4. ts/simulator/core/simulatorShell.ts — Template Method Pattern

**File:** `ts/simulator/core/simulatorShell.ts`

- Abstract class defining the animation lifecycle: `animate()` → `update()` (every frame) / `draw()` (throttled).
- Render-throttle mechanism via `renderInterval` from the animation loop toolbar.
- Responsive layout via `resizeLayout()`.
- True ES2022 private fields (`#wireNetworkInteractivity`).
- Clean subclass contract: override `update()` and `draw()`.

## 5. ts/simulator/training/genetics/poolManager.ts — Optimized Selection

**File:** `ts/simulator/training/genetics/poolManager.ts`

- `getTopAICars()` uses a single-pass partial selection (O(n) instead of O(n log n)) for small pool sizes.
- `getTopCarInfoPool()` correctly maps to `CarInfo` for serialization.
- `brainsCompatible()` guard prevents topology mismatch.

## 6. ts/car/physics/sensorRaycaster.ts — Allocation-Free Hot Path

**File:** `ts/car/physics/sensorRaycaster.ts`

- `getIntersectionOffset()` in `math/utils.ts:193-209` avoids allocating intersection points during the per-ray scan; the winning point is computed once.
- Clean separation of ray casting and reading.

## 7. ts/store/storeManager.ts — Robust Singleton with Legacy Migration

**File:** `ts/store/storeManager.ts`

- Async `init()` with idempotency guard.
- Graceful `QuotaExceededError` handling (keeps data in-memory, warns).
- Legacy key migration (`world` → `editorWorld`, `bestBrains` → `bestPool`).
- Clean `getAllWorlds()` / `getAllCars()` ordering (loaded → editor → store).
- File-scope constants avoid `var _a` class-name aliasing collisions.

## 8. html/simulator.html, html/traffic.html, html/race.html — Global Restriction Compliance

- Zero import/export statements across all 92 TypeScript files.
- `tsconfig.json` correctly sets `"module": "none"`.
- Script tag ordering follows the layered dependency hierarchy.
- Zero runtime npm dependencies (all dev-only).

---

# Structural Reorganization Recommendations

## Tier 1 (High Priority) — Correct Architectural Violations

### 1. Refactor Race to extend SimulatorShell

- Move `ts/games/race.ts` → `ts/simulator/racing/raceSimulator.ts` (extends `SimulatorShell`)
- Extract generic canvas/viewport/camera/animation from Race into the shared shell
- Move `ts/games/racePanel.ts` → `ts/simulator/racing/racePanel.ts`
- Keeps consistent template method pattern across all three simulators

### 2. Extract draw methods from math primitives

- Move `draw()` from `Point`, `Segment`, `Polygon`, `Envelope` into dedicated renderers in a new `ts/rendering/` or `ts/drawing/` layer
- Keeps `ts/math/` purely algebraic

### 3. Move DEFAULT_CAR_CONFIG from ts/math/utils.ts to ts/car/config.ts

- Create `ts/car/config.ts` with `DEFAULT_CAR_CONFIG`, `STEERING_SPEED`, etc.
- Keep math-leaning constants (`WORLD_PIXELS_PER_METER`, `SIMULATION_FPS`) in utils or a `ts/physics/constants.ts`

## Tier 2 (Medium Priority) — Improve Encapsulation & Boundaries

### 4. Integrate spatial grid into CarPhysics.assessDamage()

- Either: expose grid to `Car.update(polygons, grid?)` and pre-filter
- Or: have the caller (`worldModeBehavior`, `trafficSimulator`, `Race`) query the grid and pass only nearby borders to `car.update()`

### 5. Split TrainingSimulator (714 lines)

- Extract `SimpleTrainingSimulator` and `WorldTrainingSimulator` subclasses
- Or use strategy pattern: `SimpleModeStrategy` / `WorldModeStrategy` objects injected into a single `TrainingSimulator`

### 6. Remove NeuralNetwork.mutateFromPool(), retain only the safe NeuralNetwork.toMutatedFromPool() (renamed)

## Tier 3 (Low Priority) — Polish & Consistency

### 7. Extract magic numbers in carPhysics.ts, borderCollision.ts, simpleModeBehavior.ts, trafficSimulator.ts into named constants

### 8. Fix script tag ordering — move neural-network/network.js and neural-network/visualizer.js before car/car.js in all 4 HTML files (cosmetic fix for declared layer purity)

### 9. Consider upgrading MathPrimitives to use ES2022 private # fields where appropriate (e.g., Point's internal z and intersection could stay public since they're data)

### 10. Normalize private keyword usage to # private fields for any class that doesn't need subclass access (e.g., TrainingSimulator's private mode could be #mode)

---

# Proposed Directory Evolution (Feature-Sliced Design)

```
ts/
├── math/                                # Layer 1: Pure math (no rendering, no domain)
│   ├── primitives/                      # Point, Segment, Polygon, Envelope (data only)
│   ├── graph/                           # Graph
│   ├── osm-importer/                    # OSM importer
│   ├── spatialGrid.ts                   # Spatial hash grid
│   └── utils.ts                         # Pure math functions (lerp, distance, etc.)
│
├── physics/                             # Layer 2 (new): Physics constants
│   └── constants.ts                     # WORLD_PIXELS_PER_METER, SIMULATION_FPS, etc.
│
├── world/                               # Layer 2: World system
│   ├── items/                           # Building, Tree
│   ├── markings/                        # All marking types
│   ├── editors/                         # All editors
│   ├── generation/                      # WorldGenerator
│   ├── loader/                          # WorldLoader
│   ├── simple/                          # SimpleWorld
│   ├── world.ts
│   ├── corridor.ts
│   ├── trafficManager.ts
│   └── types.ts
│
├── car/                                 # Layer 2: Car system
│   ├── config.ts                        # DEFAULT_CAR_CONFIG (moved from math/utils)
│   ├── brain/                           # CarBrainAdapter
│   ├── controls/                        # Controls, PhoneControls, CameraControls, MarkerDetector
│   ├── loader/                          # CarLoader
│   ├── physics/                         # CarPhysics, SensorRaycaster
│   ├── rendering/                       # CarRenderer (Flyweight sprite cache)
│   ├── sensors/                         # Sensor
│   └── car.ts                           # Car (Facade)
│
├── neural-network/                      # Layer 3: Neural networks
│   ├── network.ts
│   └── visualizer.ts
│
├── rendering/                           # Layer 3 (new): Canvas renderers for primitives
│   ├── pointRenderer.ts
│   ├── segmentRenderer.ts
│   ├── polygonRenderer.ts
│   └── envelopeRenderer.ts
│
├── audio/                               # Layer 3: Sound engine
│   └── sound.ts
│
├── camera/                              # Layer 4: 3D camera system
│   ├── camera.ts
│   ├── extrusion.ts
│   └── types.ts
│
├── viewport/                            # Layer 4: Pan/zoom viewport
│   ├── viewport.ts
│   └── scaleIndicator.ts
│
├── mini-map/                            # Layer 4: Mini-map
│   └── miniMap.ts
│
├── panels/                              # Layer 4: Shared UI panels
│   ├── templates/                       # HTML template generators
│   ├── modeControls.ts
│   ├── assetSelectors.ts
│   ├── worldToolbar.ts
│   ├── shortcutsToolbar.ts
│   └── worldLayersToolbar.ts
│
├── simulator/                           # Layer 4: Concrete simulations
│   ├── core/                            # SimulatorShell (abstract)
│   ├── panels/                          # LayoutToolbar, AnimationLoopToolbar (shared)
│   ├── views/                           # SimulatorPageHost
│   ├── training/                        # TrainingSimulator, SimpleTrainingSimulator,
│   │   ├── genetics/                    # WorldTrainingSimulator, poolManager,
│   │   ├── modes/                       # storageManager, world/SimpleModeBehavior
│   │   ├── rendering/                   # drawSimulatorCars, layoutManager
│   │   └── templates/                   # Panel templates
│   ├── traffic/                         # TrafficSimulator
│   │   ├── templates/
│   │   ├── trafficPanel.ts
│   │   └── trafficSimulator.ts
│   └── racing/                          # Race → RaceSimulator (new, extends SimulatorShell)
│       ├── raceSimulator.ts             # (refactored from ts/games/race.ts)
│       └── racePanel.ts                 # (refactored from ts/games/racePanel.ts)
│
├── store/                               # Layer 4: Asset management
│   ├── templates/
│   ├── storeManager.ts
│   ├── storePanel.ts
│   └── types.ts
│
└── utils.ts                             # Cross-cutting helpers (safeJsonParse, etc.)
```

This organization cleanly separates the 4 layers, enforces FSD boundaries, moves rendering out of math, and aligns all three simulation modes (training, traffic, racing) under the `SimulatorShell` template method pattern.

# tasks

Priority File Source Issue
High refactor-race-to-extend-simulatorshell.md #1 — Template method pattern violation
High extract-draw-methods-from-math-primitives.md #2 — Domain leakage in math layer
High move-default-car-config-from-math-utils.md #3 — Config in wrong module
Medium integrate-spatial-grid-into-carphysics.md #4 — O(n) collision scan
Medium split-trainingsimulator.md #6 — God file (714 lines)
Medium remove-unsafe-mutatefrompool.md #7 — Unsafe mutation trap
Low extract-magic-numbers-to-constants.md #5, #8 — Magic numbers
Low fix-script-tag-ordering.md #9 — Wrong dependency order
Low normalize-private-fields.md #10 — Inconsistent visibility
