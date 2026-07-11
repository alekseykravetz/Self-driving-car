# Architecture Fix Tasklist

Tracked issues from the full architecture audit. Each section is a self-contained fix.

---

## 1. Delete Stale Duplicate LayoutManager

`ts/simulator/training/rendering/layoutManager.ts` (145 lines) is a dead duplicate of `ts/simulator/rendering/layoutManager.ts` with missing optimizations. No file imports it.

- [ ] Delete `ts/simulator/training/rendering/layoutManager.ts`
- [ ] Also delete compiled `js/simulator/training/rendering/layoutManager.js`

---

## 2. Extract Domain Constants from `ts/math/utils.ts` into `ts/math/worldUnits.ts`

`ts/math/utils.ts` leaks 11 simulation/geographic constants into Layer 1 (pure math). Extract them into a new file.

- [ ] Create `ts/math/worldUnits.ts` with:
  - `WORLD_PIXELS_PER_METER = 14`
  - `SIMULATION_FPS = 60`
  - `METERS_PER_DEGREE_LATITUDE = 111000`
  - `worldPixelsToMeters(px)`
  - `metersToWorldPixels(meters)`
  - `pxPerFrameToKmh(pxPerFrame)`
  - `kmhToPxPerFrame(kmh)`
  - `formatMetersFromWorldPixels(px)`
  - `formatKmhFromPxPerFrame(pxPerFrame)`
  - `formatElapsedTime(frames)`
  - `framesToSeconds(frames)`
- [ ] Remove these 11 exports from `ts/math/utils.ts`
- [ ] Update all importers (grep for each symbol, update import paths)
  - Known consumers: `osm.ts`, `sensor.ts`, `carPhysics.ts`, `trainingSimulator.ts`, etc.
- [ ] Verify no existing import is broken by checking that affected files still compile

---

## 3. Fix Layer Violation: `ts/math/graph/graph.ts` Imports Rendering

`drawPoint` and `drawSegment` imported from `ts/rendering/` into Layer 1.

- [ ] Remove `draw()` method from `Graph` class (or replace with a pure geometry approach)
- [ ] Update callers to draw graph points/segments in their own rendering loops
  - Search: who calls `graph.draw(ctx)`? Expect: `world.ts`, `graphEditor.ts`, world editor templates
- [ ] Re-check that `graph.ts` no longer imports from `rendering/`

---

## 4. Fix Layer Violation: `ts/math/heatmapGrid.ts` Imports `Car` Type

Type-only import of `Car` from `ts/car/` creates a conceptual dependency upward.

- [ ] Define a local `VehiclePosition` interface in `heatmapGrid.ts`: `{ x: number; y: number; speed: number; damaged: boolean }`
- [ ] Change `record(cars: Car[])` to `record(vehicles: VehiclePosition[])`
- [ ] Update callers to pass compatible data
- [ ] Remove `import type { Car } from '../car/car.js'`

---

## 5. Fix ES2022 Private Field Violations

### 5a. `ts/car/physics/carPhysics.ts:26`
- [ ] `private move(...)` → `#move(...)`
- [ ] Update internal references: `this.move(...)` → `this.#move(...)`

### 5b. `ts/neural-network/network.ts:179`
- [ ] `private static randomize(level: Level)` → `static #randomize(level: Level)`
- [ ] Update internal references

### 5c. `ts/neural-network/visualizer.ts:98-105` (optional — static readonly constants)
- [ ] Consider extracting `NODE_RADIUS`, `MARGIN`, etc. as module-level `const` exports instead of `private static readonly` class properties

---

## 6. Extract Named Constants for Magic Numbers

### 6a. `ts/car/sensors/sensor.ts`
- [ ] `0.9` → `TRAFFIC_STATE_RED_THRESHOLD`
- [ ] `0.4` → `TRAFFIC_STATE_YELLOW_THRESHOLD`
- [ ] `3` → `BASIC_RAY_DOT_RADIUS`
- [ ] `4` → `TRAFFIC_RAY_DOT_RADIUS`

### 6b. `ts/car/controls/cameraControls.ts`
- [ ] `4` (scale factor) → `VIDEO_DOWNSCALE_FACTOR`
- [ ] `0.8` → `REVERSE_SIZE_RATIO`
- [ ] `1.2` → `FORWARD_SIZE_RATIO`

### 6c. `ts/car/controls/markerDetector.ts`
- [ ] `10` (k-means iterations) → `KMEANS_ITERATIONS`

### 6d. `ts/car/car.ts`
- [ ] `4` (NN output size) → `NN_OUTPUT_COUNT` in `ts/car/config.ts`
- [ ] Default `[6]` (hidden layers) → `DEFAULT_HIDDEN_LAYERS` in `ts/car/config.ts`

---

## 7. Extract Duplicate Ray-Edge Intersection Logic

`ts/car/physics/sensorRaycaster.ts:#nearestEdgeOffset` and `ts/car/sensors/sensor.ts:#polygonRayOffset` implement nearly identical ray-edge offset logic.

- [ ] Extract into a shared utility function in `ts/math/collision.ts` (or new `ts/math/rayUtils.ts`)
- [ ] Both files call the shared function instead of duplicating
- [ ] Verify sensor readings and sensor rendering are unchanged

---

## 8. Reduce God-Object Surface in `car.ts`

### 8a. Extract `update()` brain-inference into `#processBrain()`
- [ ] Pull the 30-line sensor/brain inference block (lines ~250-280) into a dedicated `#processBrain(time, polygons, trafficControls, otherCars)` method
- [ ] `update()` becomes: apply steering → run physics → `#processBrain()` → sync engine

### 8b. Move defaults to `config.ts`
- [ ] Move `default hiddenLayers = [6]` from constructor to `ts/car/config.ts` as `DEFAULT_HIDDEN_LAYERS`

### 8c. Fix constructor calling `this.update()`
- [ ] Remove `this.update()` from constructor (line 131)
- [ ] If any code depends on this side-effect, call `car.update()` explicitly after construction (or add an `init()` method)
- [ ] Audit callers of `new Car(...)` to ensure nothing breaks

---

## 9. Break `car.ts` ↔ `carRenderer.ts` Circular Coupling

- [ ] Define `CarDrawData` interface in `ts/car/rendering/carRenderer.ts`:
  ```ts
  interface CarDrawData {
    polygon: Point[];
    damaged: boolean;
    color: string;
    name?: string;
    sensor?: Sensor;
    progress?: number;
    finishTime?: number;
  }
  ```
- [ ] Add a `toDrawData(): CarDrawData` method to `Car`
- [ ] Change `CarRenderer.draw(ctx, options?)` to accept `CarDrawData` instead of the full `Car` instance
- [ ] Update the one call site (`car.ts:draw()`)

---

## 10. Fix Brain/Sensor Desync in `car.ts:load()`

- [ ] After the `try { deserialize } catch { }` block, validate that `this.brain` (if present) has layer dimensions compatible with current sensor config
- [ ] Use `CarBrainAdapter.brainsCompatible(existingBrain, sensorConfig)` or similar validation
- [ ] If incompatible, either clear the brain (`this.brain = undefined`) or regenerate it
