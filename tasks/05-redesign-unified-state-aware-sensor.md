# Redesign: Unified State-Aware Sensor (Replaces B1 / A1)

**Supersedes:** `04-feature-b1-multi-class-sensor-readings.md` and `02-feature-a1-traffic-light-perception.md`

---

## Motivation

The current 3-level `sophistication` enum (`basic` / `traffic` / `classified`) + legacy `trafficAwareness` boolean is overly complex and has three bugs:

1. **Classified ray rendering** — wall hits behind traffic lights are discarded because `getTaggedReadings` returns only the single closest hit per ray. No yellow continuation ray or wall dot is drawn.
2. **Training modal doesn't sync/disable** — the sophistication `<select>` is not disabled by `#setConfigLocked()` (selector misses `<select>` elements) and may not reflect the loaded car's value.
3. **Traffic simulator car loading** — `Car.load()` doesn't regenerate the polygon after dimension changes, and brain deserialization lacks a try/catch, leaving a stale default brain on failure.

The redesign replaces all three levels with a single `stateAware: boolean` flag and a unified 2-param-per-ray brain input: `[1-distance, state]`.

---

## New Sensor Model

### Brain input per ray

| Mode | Per-ray inputs | Total input layer | Backward compat |
|------|---------------|-------------------|-----------------|
| Legacy (stateAware=false) | `[1-distance]` | `rayCount + 1` | All existing `.car` files |
| New (stateAware=true) | `[1-distance, state]` | `rayCount * 2 + 1` | New brains only |

The `+1` in both cases is the self-speed (`speed / maxSpeed`).

### State encoding

The `state` value encodes "how blocking" the nearest obstacle is:

| Obstacle | state | Brain interpretation |
|----------|-------|---------------------|
| No hit | 0 | Safe — drive on |
| Wall / border | 1 | Stop |
| Other car | 1 | Stop |
| Green light | 0 | Safe — drive through |
| Yellow light | 0.5 | Caution |
| Red light | 1 | Stop |
| Off light | 0 | Safe (treat as no signal) |

The existing `encodeTrafficState()` already returns `red=1, yellow=0.5, green/off=0` — reused for traffic lights. Walls and cars are `1` (blocking). No hit is `0` (safe).

### Drawing

One unified `#drawStateAware()` replaces `#drawBasic`, `#drawTraffic`, and `#drawClassified`:

| Nearest hit type | Ray color | Dot at hit | Continuation to wall | Wall dot |
|-----------------|-----------|------------|---------------------|----------|
| `none` | Faint yellow (full-length) | — | — | — |
| `border` | Yellow | Yellow r=3 | — | — |
| `car` | Red | Red r=3 | Yellow ray behind | Yellow r=3 |
| `trafficControl` | Green/Yellow/Red (by state) | Colored r=4 + white border | Yellow ray behind | Yellow r=3 |

Continuation only drawn when `borderHit.offset > reading.distance` (wall exists behind the nearest obstacle).

### Backward compatibility

- Old `.car` files without `stateAware` → defaults to `false` → legacy `rayCount+1` brain → identical to today
- `brainsCompatible()` in `poolManager.ts` already validates layer dimensions — `rayCount+1` vs `rayCount*2+1` brains are automatically rejected
- No migration from `sophistication` / `trafficAwareness` is needed (no trained traffic or classified cars exist — B1 was never completed)

---

## Files Changed

| # | File | Change |
|---|------|--------|
| 1 | `ts/car/sensors/sensorReading.ts` | Redefine `SensorReading`: `{ distance, state, type, x, y }`. Remove `Sophistication` type, `relativeSpeed`, `controlState` fields. |
| 2 | `ts/car/sensors/sensor.ts` | Replace `sophistication` with `stateAware: boolean`. Unified `update()` + `draw()`. Add `sensorReadings` array, remove `trafficReadings` / `classifiedReadings`. Remove `TrafficReading` interface, `#drawTraffic`, `#drawClassified`, `#getTrafficReadings`, `#relativeSpeed`. |
| 3 | `ts/car/physics/sensorRaycaster.ts` | `TaggedHit`: remove `carSpeed`. Keep `controlState` for state computation. |
| 4 | `ts/car/brain/carBrainAdapter.ts` | `inputLayerSize(rayCount, stateAware)`. Simplified `computeControls` — two branches (legacy vs state-aware). Remove `Sophistication` / `TrafficReading` imports. |
| 5 | `ts/car/car.ts` | `CarInfo.sensor`: `stateAware` replaces `sophistication` + `trafficAwareness`. `CarOptions.sensor`: same. `load()`: rebuild polygon after dims, try/catch brain deserialize. `toInfo()`: serialize `stateAware`. `update()`: pass `sensor.sensorReadings` + `sensor.stateAware`. |
| 6 | `ts/car/loader/carLoader.ts` | Replace `normalizeSoph` with `normalizeStateAware`. Update `compareCarInfoParams`. |
| 7 | `ts/simulator/traffic/trafficSimulator.ts` | Gate `otherCars` / `trafficControls` on `stateAware`. `#collectCarObstacles` returns `Point[][]` (no `speed`). |
| 8 | `ts/simulator/racing/raceSimulator.ts` | Gate `trafficControls` on `stateAware`. |
| 9 | `ts/simulator/training/modes/worldModeBehavior.ts` | Gate `trafficControls` on `stateAware`. |
| 10 | `ts/simulator/training/modes/simpleModeBehavior.ts` | Gate `otherCars` / `trafficControls` on `stateAware`. Pass `Point[][]` instead of `{ polygon, speed }[]`. |
| 11 | `ts/simulator/training/trainingInitModal.ts` | Checkbox replaces `<select>`. Fix `#setConfigLocked` to disable checkbox too. |
| 12 | `ts/simulator/training/templates/trainingInitModalTemplate.ts` | Checkbox HTML replaces `<select>`. |
| 13 | `ts/simulator/training/trainingPanel.ts` | Checkbox replaces `<select>`. Update `getCarSettings`, `setCarSettings`, `#updateCarConfigSummary`. |
| 14 | `ts/simulator/training/templates/trainingPanelTemplate.ts` | Checkbox HTML replaces `<select>`. |
| 15 | `ts/simulator/training/genetics/poolManager.ts` | Update doc comment to reference `stateAware` instead of `sophistication`. |
| 16 | `AGENTS.md` | Rewrite sensor/brain section for `stateAware`. Remove `sophistication` / `trafficAwareness` references. |
| 17 | `GEMINI.md` | Same. |
| 18 | `docs/Physics.md` | Update `SensorReading` interface, state encoding table, sensor visualization rules. |
| 19 | `docs/NeuralNetwork.md` | Update input layer description. |
| 20 | `docs/SaveLoad.md` | Update `CarInfo.sensor` fields. |
| 21 | `docs/Architecture.md` | Update sensor/brain adapter description. |
| 22 | `docs/Simulators.md` | Update gating logic description. |
| 23 | `docs/WorldEditor.md` | Update traffic light perception description. |

---

## Bugs Fixed

1. **Classified ray rendering** — eliminated entirely. The unified `#drawStateAware()` always draws continuation rays + wall dots behind any non-border hit. The `readings` (border) array is always populated, so wall data is never lost.

2. **Training modal not syncing / not disabling** — the `<select>` is replaced with a checkbox (which `#setConfigLocked` can disable via `input` selector), and explicit `disabled` logic is added in `#setConfigLocked`.

3. **Traffic simulator car loading** — `Car.load()` rebuilds the polygon after dimension changes and wraps brain deserialization in try/catch with fallback to a fresh brain with the correct topology.

---

## Implementation Order

```
Phase 1: Core sensor/brain (files 1–5)
  └─ Run tsc, fix compile errors
  └─ Run npm run fix:all

Phase 2: Loader (file 6)
  └─ Run tsc, fix compile errors
  └─ Run npm run fix:all

Phase 3: Simulators (files 7–10)
  └─ Run tsc, fix compile errors
  └─ Run npm run fix:all

Phase 4: UI (files 11–14)
  └─ Run tsc, fix compile errors
  └─ Run npm run fix:all
  └─ Visual test: open training simulator, verify checkbox works

Phase 5: Pool manager + docs (files 15–23)
  └─ Run npm run fix:all
  └─ Full visual test: training, traffic, race, world editor
```

---

## Key Design Decisions

1. **`stateAware` boolean instead of sophistication enum** — the 3-level system was unused beyond `basic` (no trained traffic or classified cars exist). A boolean is simpler and future extensibility comes from the state encoding (add new obstacle types with state values 0/0.5/1).

2. **`sensorReadings` separate from `readings`** — the border-only `readings` array is still populated for drawing continuation rays and for the legacy brain branch. The new `sensorReadings` contains the unified nearest-hit-per-ray with type + state.

3. **No relative velocity** — removed `carSpeed` from `TaggedHit` and `relativeSpeed` from `SensorReading`. The user explicitly said no velocity needed.

4. **No migration from traffic/classified** — since no trained traffic-aware or classified cars exist, old `sophistication` / `trafficAwareness` fields are simply ignored. Only `stateAware: true` in the JSON triggers the new behavior.
