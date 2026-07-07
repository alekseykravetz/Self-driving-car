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
- **Dual brain input layer:** `CarBrainAdapter.inputLayerSize(rayCount, trafficAwareness)` returns `rayCount*2 + 1` when traffic-aware (distance + light state per ray + self-speed), else legacy `rayCount + 1`. Sensor `trafficAwareness` flag (defaults `false`) is serialized on `CarInfo.sensor` — old `.car` files stay backward compatible. `brainsCompatible()` rejects cross-awareness brain swaps automatically.

## Key gotchas

- **Import paths use `.js` extension** — even though source is `.ts`, write `import { X } from './file.js'`.
- **Car angle:** 0 = facing up, positive = clockwise. **Sensor readings** are `1 - offset` before feeding to network.
- **`Polygon.union()`** is complex — mutations can break road rendering.
- **3D uses Painter's algorithm** (sort by distance, draw back-to-front).
- **Neural network uses binary step activation** (not sigmoid/ReLU).
- **`utils.ts` split** — functions moved to `math/collision.ts` (`polysIntersect`), `math/color.ts` (`getRGBA`, `getRandomColor`), `store/serialization.ts` (`safeJsonParse`, `stripFileExtension`). Old file kept as re-export barrel.
- **Traffic-aware sensors** — `Sensor.update()` and `Car.update()` take an optional `trafficControls` second param; only cars with `sensor.trafficAwareness === true` consume it. Traffic-state encoding: green=1, yellow=0.5, red/off/absent=0. Lights update via `TrafficManager` inside `World.draw()`, so perception reads the previous frame's state (one-frame lag, acceptable). The flag is exposed in the UI via the "Traffic Lights" checkbox in the training init modal (`#tiCarTrafficAwareness`) and the live training panel (`#carTrafficAwareness`); both default to off (legacy behavior).
- **Keys tracking drives rendering** — when the toolbar tracking mode is `keys`, the world/simple mode `draw()` passes `trackingKeys=true` to `drawSimulatorCars(..., keysShowSensor)` so the KEYS car is drawn with `showSensor: true`, and `drawNetworkVisualizer(time, keysCar?.brain ?? bestCar.brain)` shows the KEYS car's brain instead of the best AI car's.

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
