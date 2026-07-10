# AI Product Architect — Feature Recommendation Report

## Overview

This report analyzes the Self-Driving Car Simulator codebase (4 HTML entry points, ~120 TypeScript source files, zero runtime dependencies) against the four expansion axes defined in [ai-feature-roadmap.md](./ai-feature-roadmap.md). Five concrete features are proposed, ranked by effort/impact, with detailed architectural implementation strategies that respect the project's performance pillars: **O(1) spatial queries via the uniform hash grid, pre-composited cached car masks, and zero runtime dependencies.**

## Recommendation Priority Matrix

| Priority | Feature                             | Effort | Impact     | Risk   | Dependencies             |
| -------- | ----------------------------------- | ------ | ---------- | ------ | ------------------------ |
| 1        | **C1: Spatial Congestion Heatmap**  | Small  | High       | None   | None                     |
| 2        | **A1: Traffic Light Perception**    | Medium | High       | Low    | Back-compat flag         |
| 3        | **D2: Traffic Control Override**    | Small  | Low-Medium | None   | A1 (light infra)         |
| 4        | **D1: Human-in-the-Loop Training**  | Small  | Medium     | Low    | None                     |
| 5        | **B1: Multi-Class Sensor Readings** | Large  | High       | Medium | A1 (shared sensor infra) |

---

## Priority 1 — Feature C1: Spatial Congestion Heatmap

### Core Concept

A grid-based counter that records vehicle occupancy and idle-time per cell over time, rendered as a color overlay on the game canvas. Provides live visual analytics of traffic bottlenecks with zero external tooling.

### Target Layer

`ts/simulator/` (shared across all three simulators), `ts/math/spatialGrid.ts`, `ts/rendering/heatmapRenderer.ts` (new file)

### Why Build It

The project's stated goal is to discover traffic problems (congestion points, bottlenecks), yet there is zero telemetry today. A heatmap is the highest-value, lowest-cost analytics feature. It reveals congestion visually without external tools, and the existing `SpatialHashGrid` cell structure is a natural counter array.

### Architectural Implementation Strategy

- **Data Structures & Math:** Create `HeatmapGrid` wrapping the same `cellSize` (150px) as `SpatialHashGrid`. Each cell tracks:

  ```ts
  class HeatmapCell {
    occupancyFrames: number; // frames where >=1 car was in this cell
    totalFrames: number; // frames since recording started
    idleFrames: number; // frames where car speed was near zero
  }
  ```

  `HeatmapGrid.record(cars)` maps each car position to a cell (O(1) via `floor(pos / cellSize)`), increments occupancy, and checks car speed against a threshold (<0.5 px/frame) for idle detection.

- **Rendering:** New function `drawHeatmap(ctx, viewPoint)`. Draws each cell as a semi-transparent filled rectangle. Color mapping: occupancy ratio `0→1` maps `blue→cyan→yellow→red` via `lerp` through RGBA values. Viewport culling: only cells intersecting the visible rect are drawn. For a 2000×2000px viewport at 150px cells: ~196 cells drawn per frame. Throttle canvas redraw to ~4 fps by caching to an offscreen canvas.

- **State/Persistence:** Ephemeral — resets on simulation restart or world change. Future extension: "Download telemetry" button to export as CSV/JSON. No schema change.

- **Performance Safeguards:**
  - Recording: O(number of cars) with O(1) cell lookup per car. No cross-car interaction.
  - Rendering: Viewport-culled; offscreen canvas caching decouples redraw from game loop.
  - Hook into `SimulatorShell` render loop (per the roadmap rule: "Telemetry collection should hook into the SimulatorShell render loop").

---

## Priority 2 — Feature A1: Traffic Light Perception for AI Cars

### Core Concept

AI cars detect and react to traffic light state through their existing sensor network, stopping at red lights and proceeding on green/yellow.

### Target Layer

`ts/car/sensors/sensor.ts`, `ts/car/brain/carBrainAdapter.ts`, `ts/world/trafficManager.ts`, `ts/math/spatialGrid.ts`

### Why Build It

Traffic lights exist in the world editor and are managed by `TrafficManager` (state machine: green→yellow→red cycling per crossroad), but cars completely ignore them. This is the #1 gap in achieving a cooperative ecosystem. The infrastructure (lights, state machine, spatial grid) is already in place; only the car perception side is missing.

### Architectural Implementation Strategy

- **Data Structures & Math:** Add a `TrafficControlGrid` alongside the existing border grid that indexes all active light control centers and stop/yield marking polygons. Cell size matches the border grid (150px). Cars query both grids in their update loop.

  Extend `Sensor.update()` to accept `(x, y, angle, roadPolygons, trafficControls)` where `trafficControls` is `{ polygon: Point[], state: 'green' | 'yellow' | 'red' | 'off' }[]`. After finding the closest polygon per ray, check if a traffic control polygon exists along the same ray and cache its state.

- **Network Input Layer Change:** Each ray can potentially provide a traffic state. Input grows from `rayCount + 1` to `rayCount * 2 + 1` (distance + traffic state per ray). Traffic state encoding: `1 = green, 0.5 = yellow, 0 = red/off/absent`.

  The layer change is gated by a new `CarInfo` field `sensor.trafficAwareness: boolean`. Legacy `.car` files default to `false`, preserving the old `rayCount + 1` input layer. The `hiddenLayers` field auto-detects: if `trafficAwareness` is true but `hiddenLayers` is absent, infer from brain topology.

- **Rendering:** No changes needed — `Light.draw()` already renders the current state. Optionally draw a colored indicator on the best car's sensor display when a traffic light is detected.

- **State/Persistence:** `CarInfo` interface gains `sensor.trafficAwareness?: boolean`. `Car.toInfo()` serializes it; `Car.fromInfo()` reads it. Backward compatible: all existing `.car` files continue to work.

- **Performance Safeguards:**
  - Traffic controls indexed in their own spatial grid — per-car query is O(cells covered), not O(total controls).
  - Grid rebuilt only when world markings change, not per frame.
  - At city scale (<500 intersections, ~8 lights each), overhead is negligible.

---

## Priority 3 — Feature D2: Traffic Control Override

### Core Concept

Users click a traffic light to toggle its state manually in the world editor and traffic simulator. A "force all lights green" hotkey triggers a grid-wide green wave for experimentation.

### Target Layer

`ts/world/editors/` (world editor), `ts/simulator/traffic/trafficSimulator.ts`, `ts/world/trafficManager.ts`, `<shortcuts-toolbar>`

### Why Build It

Manual traffic control override lets users experiment with traffic flow ("what if all lights are green?") and debug intersection behavior. It is a low-code way to test traffic scenarios and demonstrates intersection-level control.

### Architectural Implementation Strategy

- **Data Structures & Math:** `TrafficManager` gains:

  ```ts
  overrideLight(light: Light, state: LightState): void;
  releaseOverride(): void;
  ```

  When an override is active, the automatic update cycle skips that light. `Light` gains `overridden: boolean`. `TrafficManager.update()` checks the flag before cycling each light.

- **World Editor:** In `LightEditor`, add click detection on the light's drawn position. Clicking a placed light cycles its state: `off → green → yellow → red → off`.

- **Traffic Simulator:** Hotkey 'G' (displayed in shortcuts toolbar) toggles global green wave. The `TrafficSimulator` iterates `world.markings` for `Light` instances and calls `trafficManager.overrideLight()`. Releasing restores normal cycling.

- **Rendering:** No changes. Overridden lights could draw a "MANUAL" indicator or brighter glow as a UX polish.

- **State/Persistence:** Ephemeral — override states are not saved with the world. Future extension: persist `Light.overridden` + `state` in world file.

- **Performance Safeguards:** One scan of the markings array for lights (O(markings), typically <200). A simple boolean check per light in `TrafficManager.update()`. Negligible.

---

## Priority 4 — Feature D1: Human-in-the-Loop Training

### Core Concept

The KEYS car's brain (shaped by human driving) is injected into the genetic breeding pool, potentially becoming a parent for the next generation. The user "teaches by example."

### Target Layer

`ts/simulator/training/trainingPanel.ts`, `ts/simulator/training/genetics/poolManager.ts`, `<training-panel>` custom element

### Why Build It

The KEYS car exists in every training session but is thrown away each generation. Allowing it to contribute to the gene pool lets the user demonstrate good driving, and the genetic algorithm incorporates that behavior through crossover. This bridges manual driving and autonomous training — "apprenticeship learning" within the existing GA framework — with minimal code change.

### Architectural Implementation Strategy

- **Data Structures & Math:** Extend `poolManager.ts`:

  ```ts
  function injectKeysCarIntoPool(
    pool: CarInfo[],
    keysCar: Car,
    maxPoolSize: number,
    evaluateFitness: (car: Car) => number,
  ): CarInfo[];
  ```

  Converts `keysCar.toInfo()`, computes its fitness (same formula as AI cars), inserts it into the sorted pool by fitness. The lowest-ranked AI car is evicted if the pool exceeds `maxPoolSize`. The KEYS brain must pass `brainsCompatible()` — if not (car config changed), skip injection.

- **UI:** Add a checkbox toggle `<label><input type="checkbox" id="injectKeys"> Inject KEYS brain into gene pool</label>` to the training panel. When enabled, `#createCarsWithPool` calls `injectKeysCarIntoPool` after extracting the top AI pool. A status dot or text "KEYS ∈ pool" indicates active injection.

- **Rendering:** No visual changes. Optionally color the KEYS car differently when its brain is in the pool.

- **State/Persistence:** Transient training parameter — not persisted. `TrainingManagerOptions` gains `injectKeys: boolean`. No `CarInfo` or `World` schema changes.

- **Performance Safeguards:** Runs once per generation: O(poolSize) insertion sort. No per-frame cost.

---

## Priority 5 — Feature B1: Multi-Class Sensor Readings

### Core Concept

Sensor rays report not just distance but also the type of obstacle (road border, car, traffic control) and its relative velocity, enabling richer behaviors like gap acceptance, overtaking, and speed matching.

### Target Layer

`ts/car/sensors/sensor.ts`, `ts/car/physics/sensorRaycaster.ts`, `ts/car/brain/carBrainAdapter.ts`, `ts/car/car.ts`

### Why Build It

All obstacles are currently opaque polygons — a car cannot distinguish a parked car from a lane divider from a road barrier. Adding type and velocity to sensor readings is the next step toward human-like driving and unlocks emergent behaviors like lane-changing, defensive driving, and traffic flow optimization through genetic training.

### Architectural Implementation Strategy

- **Data Structures & Math:** New reading interface:

  ```ts
  interface SensorReading {
    distance: number;
    type: 'border' | 'car' | 'trafficControl' | 'none';
    relativeSpeed: number; // 0 for static obstacles
  }
  ```

  `SensorRaycaster.getReadings()` accepts tagged polygon groups: `{ borders: Point[][], cars: Car[], controls: Point[][] }`. For each ray, it finds the nearest hit across all groups, records the type, and (for cars) reads the other car's speed to compute relative velocity.

- **Network Input Layer Change:** Each ray's output grows from 1 number to 3 numbers `[distance, type_encoded, relative_speed]`. Input layer grows from `rayCount + 1` to `rayCount * 3 + 1`.

  New `CarInfo` field: `sensor.sophistication: 'basic' | 'classified'`. Default `'basic'` preserves legacy. The `CarBrainAdapter` switches input assembly based on this field. Type encoding: continuous tri-valued `1 = border, 0.5 = car, 0 = none`. Relative speed is clamped to `[-1, 1]` as fraction of this car's max speed.

- **Rendering:** Color-code sensor rays by type:

  - Red = car
  - Yellow = border
  - Green = traffic control

- **State/Persistence:** `CarInfo.sensor.sophistication` added. `hiddenLayers` must account for larger input layer. Legacy `.car` files default to `'basic'`. Brain compatibility is preserved: `brainsCompatible()` validates level dimensions, so a `basic` brain cannot be loaded into a `classified` car and vice versa.

- **Performance Safeguards:**
  - Tagged polygon groups are already available in all simulators.
  - The raycaster's polygon loop becomes 2–3 sequential loops over smaller arrays — no net regression.
  - At 5000 cars, the bottleneck remains the car-vs-car distance-filtered O(n²) loop, not the per-ray raycaster.
  - The `relativeSpeed` extraction is O(1) per reading (reads a single scalar from another car).

---

## Appendix: Feature Delivery Order

| Step | Feature                       | Milestone                                        |
| ---- | ----------------------------- | ------------------------------------------------ |
| 1    | C1 — Heatmap                  | "I can see congestion patterns on the canvas"    |
| 2    | A1 — Light Perception         | "AI cars stop at red lights on loaded world"     |
| 3    | D2 — Traffic Control Override | "I click a light to change its state"            |
| 4    | D1 — Human-in-the-Loop        | "My driving shapes the gene pool"                |
| 5    | B1 — Multi-Class Sensor       | "Cars distinguish cars from borders from lights" |

Each step is independently shippable and adds concrete value. Steps 1–4 are all small-to-medium effort; step 5 is the largest and benefits from the foundation built in steps 2–3.
