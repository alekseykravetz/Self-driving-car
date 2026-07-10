# AGENTS.md — Self-Driving Car Simulator

## Build & dev

- **No bundler** — `tsc` compiles `ts/` → `js/` (mirrored structure). Each HTML page loads a single `<script type="module">` entry point.
- **`npm start`** runs three concurrent watchers: `tsc --watch`, `serve -p 9090`, and `watch:fix` (formats+lints on file change).
- **Never edit `js/` directly.** Source of truth is `ts/`.
- **Always run `npm run fix:all` (format + lint) before committing.**

## Architecture rules

- **No runtime dependencies.** Everything (NN, physics, geometry, rendering) is hand-rolled. Don't add npm packages.
- **ES modules with `module: "nodenext"`.** All files use proper `import`/`export`. Import paths use `.js` extensions (TypeScript convention for `nodenext`).
- **Canvas 2D API only** — no WebGL or Three.js.
- **Private members use `#` prefix** (ES2022 private fields).
- **Serialization pattern:** `static load(info)` factory + instance method.
- **Layer isolation:** Car must never import NeuralNetwork, audio, or explode. Bridge through `CarBrainAdapter` and `CarCallbacks`.
- **Sensor decoupled:** Sensor holds no Car reference — receives `(x, y, angle, polygons)` via `update()`.
- **Physics stateless:** `CarPhysics.update(carState, controlsState)` mutates state but knows nothing of Car or control subtypes.
- **Audio via callbacks:** RaceSimulator injects `SoundEngine`/`explode` through `car.setCallbacks({onDamaged, onEngineUpdate})` instead of Car owning a sound engine.
- **`Brain = unknown` opaque type:** Car stores brain as opaque type. Consumers cast `as NeuralNetwork` when they need network API.
- **Traffic-light perception:** `TrafficControlGrid` (`ts/math/trafficControlGrid.ts`) indexes `Light` polygons (150px cells, mirrors `SpatialHashGrid`); rebuilt only when world markings change, light _state_ read live at query time via a `getState` closure. `ts/simulator/trafficControlUtils.ts` exposes `buildTrafficControls(world)` + `queryTrafficControlsNearCar(grid, car)`.
- **Unified state-aware sensor:** `Sensor.stateAware: boolean` replaces the old `sophistication` enum. When `stateAware=true`, each ray produces two brain inputs: `[1-distance, state]` where state encodes how blocking the nearest obstacle is (0=clear, 0.5=caution, 1=stop). Legacy mode (`stateAware=false`) uses `[1-distance]` per ray. Total input layer: `stateAware ? rayCount*2+1 : rayCount+1` (the +1 is self-speed). `brainsCompatible()` validates layer dimensions to reject cross-mode swaps.
- **Traffic control override:** `Light` has `#overridden` flag + `override(state)`/`releaseOverride()` methods. `TrafficManager.update()` skips overridden lights (pauses automatic cycling). Left-click a placed light in the world editor: first click pauses cycling (state='off'), then cycles off→green→yellow→red→release (back to regular cycling). Press `G` in the traffic simulator or training simulator (world mode) to force all lights green / restore normal cycling. Override state is ephemeral (not persisted). `LightEditor` uses `stopImmediatePropagation()` on mousedown to intercept clicks on existing lights before the base `MarkingEditor` places a new one.

## Key gotchas

- **Import paths use `.js` extension** — even though source is `.ts`, write `import { X } from './file.js'`.
- **Car angle:** 0 = facing up, positive = clockwise. **Sensor readings** are `1 - offset` before feeding to network.
- **`Polygon.union()`** is complex — mutations can break road rendering.
- **3D uses Painter's algorithm** (sort by distance, draw back-to-front).
- **Neural network uses binary step activation** (not sigmoid/ReLU).
- **`utils.ts` split** — functions moved to `math/collision.ts` (`polysIntersect`), `math/color.ts` (`getRGBA`, `getRandomColor`), `store/serialization.ts` (`safeJsonParse`, `stripFileExtension`). Old file kept as re-export barrel.
- **Traffic-aware sensors** — `Sensor.update()` and `Car.update()` take an optional `trafficControls` second param; only cars with `sensor.stateAware === true` consume it. Traffic-state encoding: green=1, yellow=0.5, red/off/absent=0. Lights update via `TrafficManager` inside `World.draw()`, so perception reads the previous frame's state (one-frame lag, acceptable). The flag is exposed in the UI via the "State Aware" checkbox in the training init modal (`#tiCarStateAware`) and the live training panel (`#carStateAware`); both default to off (legacy behavior).
- **Keys tracking drives rendering** — when the toolbar tracking mode is `keys`, the world/simple mode `draw()` passes `trackingKeys=true` to `drawSimulatorCars(..., keysShowSensor)` so the KEYS car is drawn with `showSensor: true`, and `drawNetworkVisualizer(time, keysCar?.brain ?? bestCar.brain)` shows the KEYS car's brain instead of the best AI car's.
- **Traffic-state ray rendering** — `Sensor.draw()` renders a single ray from the car to the nearest obstacle `(sr.x, sr.y)`, colored by `sr.type` (yellow for border, red for car, colored by state for traffic control) with a dot at the endpoint. Traffic-control rays use a larger dot (r=4, white 1.5px border). No continuation ray is drawn past the nearest hit — the brain only sees the closest obstacle. See `docs/Physics.md#sensor-visualization`.

## Key commands

| Command                | Purpose                                       |
| ---------------------- | --------------------------------------------- |
| `npm start`            | Full dev: tsc watch + server + lint/format    |
| `npm run tsc:watch`    | Compile TS on save only                       |
| `npm run serve`        | Static server on :9090                        |
| `npm run lint`         | ESLint auto-fix                               |
| `npm run format`       | Prettier (singleQuote: true)                  |
| `npm run fix:all`      | format + lint                                 |
| `npm run publish:site` | Deploy via here.now (scripts/publish-site.sh) |

## Entry points

- `html/simulator.html` — Training (world mode by default, `?mode=simple` for simple road)
- `html/traffic.html` — Live Traffic Jam
- `html/race.html` — Racing (`?mode=camera` or `?mode=phone`)
- `html/world.html` — World editor

## Testing

- No automated tests — validation is visual. Open the relevant HTML page in a browser.
- World files in `saves/` use v2 schema (`version: 2`, `decoration` instead of baked tree/building arrays).

## Persistence

| localStorage key                        | Content                            |
| --------------------------------------- | ---------------------------------- |
| `bestPool`                              | Top-K car configs with brains      |
| `raceCars`                              | Cars loaded via race "Load car(s)" |
| `editorWorld`                           | World saved by editor              |
| `store:activeWorld` / `store:activeCar` | Active store selection             |
