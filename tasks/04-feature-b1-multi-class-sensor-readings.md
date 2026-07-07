# Feature B1: Multi-Class Sensor Readings

**Priority:** 5 | **Effort:** Large | **Impact:** High | **Risk:** Medium
**Depends on:** A1 (traffic-light perception, shipped), D2 (override, shipped)
**Replaces:** the original spec, which predated A1's `trafficAwareness`/`trafficReadings` infrastructure and assumed obstacle arrays were already type-separated.

## Core Concept

Sensor rays report not just distance but also the **type** of obstacle (road border / car / traffic control / none) and, for car hits, the **relative velocity** — enabling richer behaviors like gap acceptance, overtaking, and speed matching. This generalizes A1's traffic-only perception into a unified per-ray reading.

## Design Decisions

1. **Single 3-level `sophistication` enum** replaces the boolean `trafficAwareness` flag in `CarInfo.sensor`. Old `.car` files migrate on load: `trafficAwareness:true` → `sophistication:'traffic'`. The `trafficAwareness` field is no longer written by new saves (one axis, one source of truth).
2. **One-hot type encoding** for the `classified` input layer: `rayCount * 5 + 1` inputs per ray `[distance, isBorder, isCar, isControl, controlState, relativeSpeed]` + self-speed. `controlState` reuses A1's `encodeTrafficState` (green=1, yellow=0.5, red/off=0) and is meaningful only when `isControl=1`.
3. **Car-type detection only where car obstacles already exist** — traffic simulator + simple-mode training. World-mode training and race simulator do **not** thread other cars into the sensor (preserves 5000-car training perf; `isCar` is always 0 there). No new O(n²) loops.

## Target Files

| File                                                           | Change                                                                                                                                                                                                                  |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ts/car/sensors/sensorReading.ts`                              | **NEW** — `SensorReading` interface, `ObstacleType` union, `Sophistication` type, one-hot encoder helpers                                                                                                               |
| `ts/car/sensors/sensor.ts`                                     | Replace `trafficAwareness: boolean` with `sophistication: Sophistication`; merge traffic + border + car raycasting into one tagged pass for `classified`; new `#relativeSpeed()` helper                                 |
| `ts/car/physics/sensorRaycaster.ts`                            | New `getTaggedReadings(rays, borders, cars, controls)` returning `(TaggedHit \| null)[]`; share edge-intersection via `#nearestEdgeOffset()`                                                                            |
| `ts/car/brain/carBrainAdapter.ts`                              | `inputLayerSize(rayCount, sophistication)`; `computeControls` assembles per-mode input arrays; add `Sophistication` import                                                                                              |
| `ts/car/car.ts`                                                | `CarInfo.sensor.sophistication` field; migrate `trafficAwareness` on `load()`; thread `otherCars?: { polygon: Point[]; speed: number }[]` through `update()` + forward `this.speed, this.maxSpeed` to `Sensor.update()` |
| `ts/car/carState.ts`                                           | **Possibly** — if `OtherCarInfo` type is needed; otherwise inline `{ polygon, speed }`                                                                                                                                  |
| `ts/car/loader/carLoader.ts`                                   | `compareCarInfoParams` normalizes `sophistication` for comparison (migrate inline)                                                                                                                                      |
| `ts/simulator/training/genetics/poolManager.ts`                | Add doc comment to `brainsCompatible()` noting it validates input-layer dimension mismatches — no code change needed                                                                                                    |
| `ts/simulator/traffic/trafficSimulator.ts`                     | Split `#collectObstacles` into borders + cars; pass both to `car.update()`                                                                                                                                              |
| `ts/simulator/training/modes/simpleModeBehavior.ts`            | Split `nearbyPolygons` into borders + traffic cars (`{ polygon, speed }[]`); pass both                                                                                                                                  |
| `ts/simulator/training/modes/worldModeBehavior.ts`             | Pass `otherCars: []` for new `car.update()` arg (no car-vs-car)                                                                                                                                                         |
| `ts/simulator/racing/raceSimulator.ts`                         | Pass `otherCars: []` (no car-vs-car)                                                                                                                                                                                    |
| `ts/simulator/training/templates/trainingInitModalTemplate.ts` | Replace `#tiCarTrafficAwareness` checkbox with `#tiCarSophistication` `<select>`                                                                                                                                        |
| `ts/simulator/training/templates/trainingPanelTemplate.ts`     | Same replacement, `#carSophistication` selector                                                                                                                                                                         |
| `ts/simulator/training/trainingInitModal.ts`                   | Read/write `sophistication`; migration on `#fillCarConfig`                                                                                                                                                              |
| `ts/simulator/training/trainingPanel.ts`                       | Read/write `sophistication`; status row shows current mode                                                                                                                                                              |

## Implementation Steps

### 1. Create `ts/car/sensors/sensorReading.ts`

New file with types and pure encoder helpers (no imports of `Car` to avoid cycles):

```ts
export type ObstacleType = 'border' | 'car' | 'trafficControl' | 'none';
export type Sophistication = 'basic' | 'traffic' | 'classified';

export interface SensorReading {
  distance: number; // 0..1 parametric offset along the ray; 1 if no hit
  type: ObstacleType;
  relativeSpeed: number; // clamped [-1, 1] as fraction of this car's maxSpeed; 0 for static
  controlState: number; // 1=red, 0.5=yellow, 0=green/off/none (reversed encodeTrafficState — danger = higher)
  x: number; // hit point x
  y: number; // hit point y
}
```

### 2. Extend raycaster with tagged hit detection

In `ts/car/physics/sensorRaycaster.ts` — keep `getReadings` and `getReading` for backward compat (physics collision still uses raw borders). Add:

```ts
export interface TaggedHit {
  offset: number;
  x: number;
  y: number;
  type: 'border' | 'car' | 'trafficControl';
  carSpeed?: number;       // set when type==='car'
  controlState?: TrafficControlState;  // set when type==='trafficControl'
}

static getTaggedReadings(
  rays: Point[][],
  borders: Point[][],
  carPolys: { polygon: Point[]; speed: number }[],
  controls: { polygon: Point[]; state: TrafficControlState }[],
): (TaggedHit | null)[]
```

**Per-ray algorithm:**

1. For each ray, track `minHit: TaggedHit | null`, `minOffset = Infinity`.
2. Sweep borders → candidate `{ offset, type:'border' }`.
3. Sweep `carPolys` → candidate `{ offset, type:'car', carSpeed: poly.speed }`.
4. Sweep controls → candidate `{ offset, type:'trafficControl', controlState: poly.state }`.
5. Keep the smallest-offset candidate. No hit → `null`.

**Extract shared edge-intersection helper** to avoid three copies of the same loop:

```ts
#nearestEdgeOffset(ray: Point[], poly: Point[]): number | null
```

Returns the smallest non-negative offset or `null`. Used by `getReading`, `#getTrafficReadings`, and `getTaggedReadings`.

### 3. Rewrite `Sensor` class

Replace `trafficAwareness: boolean` with `sophistication: Sophistication`. Merge the two-pass logic (border `getReadings` + `#getTrafficReadings`) into a single tagged pass for `classified`; keep `basic` on the fast legacy path and `traffic` on the existing A1 path.

**New fields:**

```ts
class Sensor {
  sophistication: Sophistication;
  rays: Point[][];
  readings: (IntersectionPoint | null)[];          // basic + traffic modes (border hits)
  trafficReadings: (TrafficReading | null)[];      // traffic mode only
  classifiedReadings: (SensorReading | null)[];    // classified mode only
  ...
}
```

**New `update()` signature:**

```ts
update(
  x: number, y: number, angle: number,
  borders: Point[][],
  trafficControls?: SensorTrafficControl[],
  otherCars?: { polygon: Point[]; speed: number }[],
  selfSpeed?: number,
  selfMaxSpeed?: number,
): void
```

**Per-mode branch:**

| `sophistication` | Reads `otherCars` | Reads `trafficControls` | Raycaster call                                          | Stored in                      | Input layer        |
| ---------------- | ----------------- | ----------------------- | ------------------------------------------------------- | ------------------------------ | ------------------ |
| `basic`          | Ignored           | Ignored                 | `getReadings(rays, borders)`                            | `readings`                     | `rayCount + 1`     |
| `traffic`        | Ignored           | Used                    | `getReadings(rays, borders)` + `#getTrafficReadings`    | `readings` + `trafficReadings` | `rayCount * 2 + 1` |
| `classified`     | Used              | Used                    | `getTaggedReadings(rays, borders, otherCars, controls)` | `classifiedReadings`           | `rayCount * 5 + 1` |

When `classified` and `selfSpeed` / `selfMaxSpeed` are provided, `relativeSpeed` for car hits is `(otherCarSpeed - thisSpeed) / thisMaxSpeed`, clamped to `[-1, 1]`.

**`#relativeSpeed(otherSpeed, selfSpeed, selfMaxSpeed)`** helper:

```ts
#relativeSpeed(other: number, self: number, max: number): number {
  return Math.max(-1, Math.min(1, (other - self) / max));
}
```

**`Sensor.draw()`** — new branch for `classified` rendering:

| Type             | Ray color                                      | Dot                                        |
| ---------------- | ---------------------------------------------- | ------------------------------------------ |
| `none`           | Faint yellow (alpha 0.2), full-length          | None                                       |
| `border`         | Yellow, car → hit                              | Yellow r=3 at hit                          |
| `car`            | Red, car → hit                                 | Red r=3 at hit                             |
| `trafficControl` | Colored by state (green/yellow/red), car → hit | Colored r=4 with white 1.5px border at hit |

Keep the existing `trafficReadings` rendering for `traffic` mode unchanged. The `classified` branch reads `classifiedReadings[i]` instead.

### 4. Update `CarBrainAdapter`

```ts
static inputLayerSize(rayCount: number, sophistication: Sophistication): number {
  switch (sophistication) {
    case 'classified': return rayCount * 5 + 1;
    case 'traffic':    return rayCount * 2 + 1;
    default:           return rayCount + 1;
  }
}
```

`computeControls()` — add a `sophistication: Sophistication` parameter. Three assembly branches:

- **basic** (`readings: (IntersectionPoint | null)[]`): `readings.map(s => s === null ? 0 : 1 - s.offset).concat([speed/maxSpeed])` — unchanged.
- **traffic** (`readings + trafficReadings`): interleave `(1-offset, trafficState)` per ray + self-speed — current A1 behavior, unchanged.
- **classified** (`classifiedReadings: (SensorReading | null)[]`): interleave `[distance, isBorder, isCar, isControl, controlState, relativeSpeed]` per ray + self-speed, where:
  - `distance = reading === null ? 0 : 1 - reading.distance` (same offset convention as existing code: `1 - offset`)
  - `isBorder = reading?.type === 'border' ? 1 : 0`
  - `isCar = reading?.type === 'car' ? 1 : 0`
  - `isControl = reading?.type === 'trafficControl' ? 1 : 0`
  - `controlState = reading?.controlState ?? 0` (reuses `encodeTrafficState` — reversed: 1=red/0.5=yellow/0=green; danger = higher)
  - `relativeSpeed = reading?.relativeSpeed ?? 0`

### 5. Update `Car` + `CarInfo`

```ts
interface SensorConfig {
  rayCount: number;
  raySpread: number;
  rayLength: number;
  rayOffset: number;
  sophistication?: Sophistication; // new, defaults 'basic'
  /** @deprecated use sophistication instead */
  trafficAwareness?: boolean;
}
```

**`Car.load(info)` — migration:**

```ts
if (info.sensor.trafficAwareness === true && !info.sensor.sophistication) {
  info.sensor.sophistication = 'traffic';
}
this.sensor.sophistication = info.sensor.sophistication ?? 'basic';
```

Then rebuild brain if no supplied brain (existing pattern at `car.ts:163-172`), now keyed off the new `sophistication`-sensitive `inputLayerSize`.

**`Car.toInfo()`:**

```ts
sensor: {
  rayCount: ...,
  raySpread: ...,
  rayLength: ...,
  rayOffset: ...,
  sophistication: this.sensor?.sophistication ?? 'basic',
  // no trafficAwareness written — new saves are clean
}
```

**`Car.update()` — new third param:**

```ts
update(
  borders: Point[][] = [],
  trafficControls?: SensorTrafficControl[],
  otherCars?: { polygon: Point[]; speed: number }[],
): void
```

When calling `this.sensor.update()`, also pass `this.speed` and `this.maxSpeed` (needed for `classified`'s `relativeSpeed`):

```ts
this.sensor.update(
  this.x,
  this.y,
  this.angle,
  borders,
  trafficControls,
  otherCars,
  this.speed,
  this.maxSpeed,
);
```

### 6. Update `compareCarInfoParams` (carLoader.ts)

Since `Car.load` normalizes, `compareCarInfoParams` must also normalize before comparing:

```ts
function normalizeSoph(info: CarInfo): Sophistication {
  if (info.sensor.sophistication) return info.sensor.sophistication;
  return info.sensor.trafficAwareness ? 'traffic' : 'basic';
}
```

Drop the `trafficAwareness` comparison line; use `normalizeSoph(a) === normalizeSoph(b)` instead.

### 7. Wire simulators

**`trafficSimulator.ts`** — split `#collectObstacles` into two helpers:

- `#collectBorders(car, borderMode): Point[][]` (grid query, existing)
- `#collectCarObstacles(car): { polygon: Point[]; speed: number }[]` (existing O(n²) scan returning speed-augmented results)

```ts
const borders = this.#collectBorders(car, borderMode);
const otherCars =
  car.sensor?.sophistication === 'classified'
    ? this.#collectCarObstacles(car)
    : [];
const trafficControls =
  car.sensor?.sophistication !== 'basic'
    ? queryTrafficControlsNearCar(this.#trafficGrid, car)
    : [];
car.update(borders, trafficControls, otherCars);
```

**`simpleModeBehavior.ts`** — in `updateSimpleCars`, split the `nearbyPolygons` approach:

- `roadBorders` stays as borders.
- The binary-search window (`lo`..`hi`) collects `{ polygon: state.traffic[j].polygon, speed: state.traffic[j].speed }` into an `otherCars` array instead of pushing to `nearbyPolygons`.
- Pass `otherCars` to `car.update()` when `car.sensor?.sophistication === 'classified'`, else pass `[]`.

**`worldModeBehavior.ts`** — add `otherCars: []` to the `car.update()` call signature (new param after `trafficControls`). Always empty in world mode.

**`raceSimulator.ts`** — same: `otherCars: []`.

`trafficControls` passing stays as-is (gated on `sophistication !== 'basic'` instead of `trafficAwareness`).

### 8. Update UI

**Training init modal template** (`trainingInitModalTemplate.ts:109-114`):

Replace:

```html
<div class="ctrl ctrl-checkbox">
  <label>
    <input type="checkbox" id="tiCarTrafficAwareness" />
    <span class="ctrl-label">Traffic Lights</span>
  </label>
</div>
```

With:

```html
<div class="ctrl">
  <span class="ctrl-label">Sophistication</span>
  <select id="tiCarSophistication">
    <option value="basic">Basic</option>
    <option value="traffic">Traffic</option>
    <option value="classified">Classified</option>
  </select>
</div>
```

**Training panel template** (`trainingPanelTemplate.ts:214-219`) — same replacement, `#carSophistication` instead of `#carTrafficAwareness`.

**`trainingInitModal.ts`:**

- `#fillCarConfig`: `select.value = normalizeSoph(info)`.
- `#buildCarInfo`: `sophistication: (this.querySelector('#tiCarSophistication') as HTMLSelectElement).value as Sophistication`.
- Drop all `#tiCarTrafficAwareness` references.

**`trainingPanel.ts`:**

- Grab `#carSophistication` in constructor (replace `#carTrafficAwarenessInput`).
- `#getCarInfo`: read `.value`.
- `setCarSettings`: set `.value = info.sensor.sophistication ?? 'basic'`.
- Status row: replace `['🚦','Traffic', on/off]` with `['📡','Sensor', sophistication]`.

### 9. Serialization & compatibility

| Scenario                                                      | Load behavior                                              |
| ------------------------------------------------------------- | ---------------------------------------------------------- |
| Pre-A1 `.car` (no `trafficAwareness`, no `sophistication`)    | `sophistication = 'basic'` — identical to original         |
| A1-era `.car` (`trafficAwareness:true`, no `sophistication`)  | Migration → `sophistication = 'traffic'` — identical to A1 |
| A1-era `.car` (`trafficAwareness:false`, no `sophistication`) | `sophistication = 'basic'` — identical to original         |
| New B1 `.car` (`sophistication:'classified'`)                 | Loads directly, no migration needed                        |

`brainsCompatible()` in `poolManager.ts:34` already validates level dimensions — cross-sophistication swaps are automatically rejected because input layer sizes differ. Add a doc comment noting this.

## Performance Safeguards

- **basic cars:** zero overhead. Same code path as today. Simulators don't even collect `otherCars` (gated on `sophistication === 'classified'`).
- **traffic cars:** zero overhead. A1 code path unchanged.
- **classified cars:** one `getTaggedReadings` call (3 sweeps) instead of `getReadings` + `#getTrafficReadings`. Shared `#nearestEdgeOffset` helper avoids code duplication. Car sweep is gated by existing distance-filtered reach check.
- **No new O(n²) loops.** Car obstacle collection reuses the existing traffic-simulator scan and existing simple-mode binary-search window.
- **5000-car training (world mode):** `otherCars: []` — classified cars only sense borders + controls. No regression.
- `relativeSpeed` extraction is `O(1)` per car hit (reads a single scalar from the other car).

## Acceptance Criteria

- [ ] `sophistication` enum replaces `trafficAwareness` in `CarInfo.sensor`; old `.car` files with `trafficAwareness:true` load as `'traffic'` and behave identically to A1
- [ ] `basic` cars have identical sensor + brain behavior to pre-B1
- [ ] `traffic` cars have identical sensor + brain behavior to A1
- [ ] `classified` sensors report `type` = border/car/trafficControl/none per ray
- [ ] `classified` sensors report `relativeSpeed` for car hits (verifiable in traffic simulator + simple-mode training; always 0 in world-mode training + race)
- [ ] Input layer = `rayCount * 5 + 1` for classified; brain builds and trains successfully
- [ ] `brainsCompatible()` rejects brain swaps across sophistication levels (basic↔traffic↔classified)
- [ ] `compareCarInfoParams()` rejects `.car` param mismatches across sophistication levels (after migration)
- [ ] Sensor rays color-coded by type for classified cars (yellow border / red car / green-yellow-red control / faint none)
- [ ] UI: `<select>` with Basic/Traffic/Classified in both init modal and live panel; reads/writes correctly; status row shows current mode
- [ ] No measurable FPS regression with 5000 basic cars in world-mode training
- [ ] No measurable FPS regression in traffic simulator when all cars are `classified` (vs. all `traffic`)

## References

- `ts/car/sensors/sensor.ts` — existing `Sensor`, `SensorTrafficControl`, `TrafficReading`, `encodeTrafficState`
- `ts/car/physics/sensorRaycaster.ts` — `getReadings`, `getReading`
- `ts/car/brain/carBrainAdapter.ts` — `inputLayerSize`, `computeControls`
- `ts/car/car.ts` — `CarInfo`, `load`, `toInfo`, `update`
- `ts/car/loader/carLoader.ts` — `compareCarInfoParams`
- `ts/simulator/training/genetics/poolManager.ts:34` — `brainsCompatible`
- `ts/simulator/traffic/trafficSimulator.ts:354` — `#collectObstacles` (split target)
- `ts/simulator/training/modes/simpleModeBehavior.ts:104` — `nearbyPolygons` (split target)
- `ts/simulator/training/modes/worldModeBehavior.ts:66` — pass `[]` for otherCars
- `ts/simulator/racing/raceSimulator.ts:284` — pass `[]` for otherCars
- `ts/math/trafficControlGrid.ts` — `TrafficControlState`, `TrafficControlHit`
- `ts/simulator/trafficControlUtils.ts` — `queryTrafficControlsNearCar`
- `ts/simulator/training/templates/trainingInitModalTemplate.ts:111` — UI template (replace checkbox)
- `ts/simulator/training/templates/trainingPanelTemplate.ts:216` — UI template (replace checkbox)
- `ts/simulator/training/trainingInitModal.ts:138,306` — UI read/write logic
- `ts/simulator/training/trainingPanel.ts:417,459` — UI read/write + status row
