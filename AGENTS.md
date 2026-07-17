# AGENTS.md — Self-Driving Car Simulator

## Graphify

- **Graphify** knowledge graph lives in `graphify-out/` (2048 nodes, 5940 edges).
- Rebuild after code changes: `graphify update .` (or `graphify . --code-only` for full rebuild).
- The `graphify` CLI is at `~/Library/Python/3.14/bin/graphify` — add to PATH or use `python3 -m graphify`.
- To include docs/images in the graph, set `GOOGLE_API_KEY` (or another supported LLM key) and drop `--code-only`.

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
- **Renderer decoupled:** `CarRenderer.draw(ctx, data, options)` receives `CarDrawData` (plain shape with polygon/color/sensor ref) instead of a `Car` instance. `Car` has `toDrawData(): CarDrawData` to bridge the gap. No circular coupling between car and renderer.
- **`Brain = unknown` opaque type:** Car stores brain as opaque type. Consumers cast `as NeuralNetwork` when they need network API.
- **Config constants centralised:** `ts/car/config.ts` holds `NN_OUTPUT_COUNT` (4), `DEFAULT_HIDDEN_LAYERS` ([6]), and `DEFAULT_CAR_CONFIG`. Magic numbers in sensor/physics files use named constants (e.g. `TRAFFIC_STATE_RED_THRESHOLD`, `BASIC_RAY_DOT_RADIUS`).
- **Math-layer type isolation:** `ts/math/heatmapGrid.ts` defines a local `VehiclePosition` interface instead of importing the `Car` type. Pure-math files must not import from `car/`, `rendering/`, or `neural-network/`.
- **`Car.update()` decomposed:** Steering, physics, brain inference, and engine-sync are split into `#applySteering()`, `this.physics.update()`, `#processBrain(polygons, trafficControls, otherCars)`, and `#syncEngine()` — no constructor calls `this.update()`.
- **Brain desync guard in `load()`:** After deserialization, `Car.load()` checks `brainsCompatible(brain, rayCount, stateAware)` and clears the brain if dimensions don't match the current sensor config.
- **Traffic-light perception:** `TrafficControlGrid` (`ts/math/trafficControlGrid.ts`) indexes `Light` polygons (150px cells, mirrors `SpatialHashGrid`); rebuilt only when world markings change, light _state_ read live at query time via a `getState` closure. `ts/simulator/trafficControlUtils.ts` exposes `buildTrafficControls(world)` + `queryTrafficControlsNearCar(grid, car)`.
- **Unified state-aware sensor:** `Sensor.stateAware: boolean` replaces the old `sophistication` enum. When `stateAware=true`, each ray produces two brain inputs: `[1-distance, state]` where state encodes how blocking the nearest obstacle is (0=clear, 0.5=caution, 1=stop). Legacy mode (`stateAware=false`) uses `[1-distance]` per ray. Total input layer: `stateAware ? rayCount*2+1 : rayCount+1` (the +1 is self-speed). `brainsCompatible()` validates layer dimensions to reject cross-mode swaps.
- **Traffic control override:** `Light` has `#overridden` flag + `override(state)`/`releaseOverride()` methods. `TrafficManager.update()` skips overridden lights (pauses automatic cycling). Left-click a placed light in the world editor: first click pauses cycling (state='off'), then cycles off→green→yellow→red→release (back to regular cycling). Press `G` in the traffic simulator or training simulator (world mode) to force all lights green / restore normal cycling. Override state is ephemeral (not persisted). `LightEditor` uses `stopImmediatePropagation()` on mousedown to intercept clicks on existing lights before the base `MarkingEditor` places a new one.
- **Human Backpropagation mode:** `html/human-training.html` is a standalone single-car simulator (`HumanBackpropSimulator extends SimulatorShell`) with no AI population/gene pool. The KEYS car's brain is trained online each frame via `NeuralNetwork.trainStep(network, inputs, targets, lr)` (sigmoid-relaxation backprop, returns `boolean` indicating weight changes) to imitate human keypresses; `Car.#autopilot` toggles brain-driven driving (pauses learning, sets `Controls.frozen = true` so keyboard listeners can't overwrite brain controls; disengaging resets all controls to `false` so the car stops immediately); `Car.#lastBrainOutput` exposes the brain's prediction for accuracy display; `Car.#brainChangedThisFrame` exposes whether weights changed for the panel's brain-activity dot. Learning is ON by default; press **L** to toggle learning on/off (wired via `KeyboardManager` toggle binding with `latchOnly: true` for press-to-toggle behavior + `KeyboardManager.setToggleActive` for initial state). The network visualizer draws green/red match rings on output neurons via the optional `match` parameter to `NetworkVisualizer.draw()` / `SimulatorShell.drawNetworkVisualizer()`. Accuracy uses a rolling 120-frame window with per-channel % (not cumulative). The panel includes a brain inspector showing live weights/biases per layer. Brain persists to localStorage key `humanTrainedCar`. Car config is set via `<human-training-config-modal>` (locked to saved brain topology when a save exists).
- **Centralised keyboard manager:** `KeyboardManager` (`ts/panels/keyboardManager.ts`) owns ALL key routing. No module registers `window` keydown/keyup directly — they call `km.setBindings()`, `km.pushBindings()`, or `km.popBindings()` instead. The manager auto-syncs `ShortcutsToolbarElement` (flash for momentary, setActive for toggle/display). Display keys (Ctrl, arrows) have `kind: 'display'` + `keys[]`; the manager lights the indicator while the physical key is held. Toggle bindings support `latchOnly: true` for press-to-toggle (keydown calls `toggleLatch()`, keyup is a no-op); default is held/latched (keydown sets physical hold, keyup releases).
- **`trainStep` per-output LR:** `NeuralNetwork.trainStep` accepts `lr: number | number[]`. When an array `[f, l, r, rev]`, per-neuron LR applies **only to the last (output) level** — hidden levels always use `lr[0]` as a single scalar to avoid out-of-bounds `undefined` → `NaN`.
- **`trainStep` safety guards:** All weight/bias updates have `!isFinite(delta)` and `!isFinite(effectiveLR)` guards to skip corrupted values, and every updated weight/bias is clamped to `[-1, 1]` (the genetic cars' range) so backprop brains stay scale-consistent with evolved ones — the visualizer/inspector need no special handling.
- **Experience replay in `Car`:** `Car` owns a ring buffer `#replayBuffer` (max 4096 entries) storing `{inputs, targets, isTurn}` for human-backprop training. `#trainBatch(lr)` samples a **balanced** 50/50 batch of turn vs straight entries (size `#batchSize = 16`). `#prevControlState` tracks previous frame's keys for decision-point detection — when control state changes, the frame is trained 3 extra iterations.
- **`CarBrainAdapter.buildInput()` extracted:** A static method returning the raw input vector (offsets array) without running inference. Used by the replay buffer to store inputs. `computeControls()` delegates to it internally.
- **Held/latched toggle extracted:** `LatchedToggle` (`ts/panels/latchedToggle.ts`) replaces 4 copies of the held/latched state machine. Toggle bindings in `KeyboardManager` create a `LatchedToggle` internally; the binding's `toggle.onActivate`/`onDeactivate` fire when the effective state changes. Click-to-latch on the toolbar is wired automatically. `latchOnly` bindings call `toggleLatch()` on keydown only (no physical hold).
- **Editors use push/pop lifecycle:** `GraphEditor` and `CorridorEditor` call `km.pushBindings(bindings)` in `enable()` and `km.popBindings()` in `disable()`. World sets root bindings (Ctrl display) via `km.setBindings()` — editor shortcuts are registered only while active. No raw `window.addEventListener` anywhere.

## Key gotchas

- **Import paths use `.js` extension** — even though source is `.ts`, write `import { X } from './file.js'`.
- **Car angle:** 0 = facing up, positive = clockwise. **Sensor readings** are `1 - offset` before feeding to network.
- **`Polygon.union()`** is complex — mutations can break road rendering.
- **3D uses Painter's algorithm** (sort by distance, draw back-to-front).
- **Neural network uses binary step activation** (not sigmoid/ReLU) for inference. `NeuralNetwork.trainStep` (human-backprop only) trains a **sigmoid relaxation** of the same network — the logistic shares the step's decision boundary (`σ(z) > 0.5 ⟺ z > 0 ⟺ sum > bias`), giving real graded gradients and multi-layer credit assignment, while inference stays binary-step (compatible with the genetic/AI cars). It runs its own forward pass from the passed `inputs` and does not read the binary `level.outputs` left by `feedForward`. To keep weights in the genetic `[-1, 1]` range while still learning sharp decisions, training uses a **sigmoid gain** (`σ(GAIN·z)`, GAIN=2), **label smoothing** (targets 0.1/0.9 — prevents cross-entropy from driving weights unbounded), and **L2 weight decay**, then clamps to `[-1, 1]`.
- **`utils.ts` split** — functions moved to `math/collision.ts` (`polysIntersect`, `nearestEdgeOffset`), `math/worldUnits.ts` (world-unit conversions like `WORLD_PIXELS_PER_METER`, `pxPerFrameToKmh`, `formatElapsedTime`), `math/color.ts` (`getRGBA`, `getRandomColor`), `store/serialization.ts` (`safeJsonParse`, `stripFileExtension`). Old file kept as re-export barrel. `nearestEdgeOffset` is the shared ray-edge intersection utility used by both `sensorRaycaster.ts` and `sensor.ts` (no duplicate logic).
- **Traffic-aware sensors** — `Sensor.update()` and `Car.update()` take an optional `trafficControls` second param; only cars with `sensor.stateAware === true` consume it. Traffic-state encoding: green=1, yellow=0.5, red/off/absent=0. Lights update via `TrafficManager` inside `World.draw()`, so perception reads the previous frame's state (one-frame lag, acceptable). The flag is exposed in the UI via the "State Aware" checkbox in the training init modal (`#tiCarStateAware`) and the live training panel (`#carStateAware`); both default to off (legacy behavior).
- **Keys tracking drives rendering** — when the toolbar tracking mode is `keys`, the world/simple mode `draw()` passes `trackingKeys=true` to `drawSimulatorCars(..., keysShowSensor)` so the KEYS car is drawn with `showSensor: true`, and `drawNetworkVisualizer(time, keysCar?.brain ?? bestCar.brain)` shows the KEYS car's brain instead of the best AI car's.
- **Traffic-state ray rendering** — `Sensor.draw()` renders a single ray from the car to the nearest obstacle `(sr.x, sr.y)`, colored by `sr.type` (yellow for border, red for car, colored by state for traffic control) with a dot at the endpoint. Traffic-control rays use a larger dot (r=4, white 1.5px border). No continuation ray is drawn past the nearest hit — the brain only sees the closest obstacle. See `docs/Physics.md#sensor-visualization`.
- **Auto-regen items toggle** — The ♻️ button in `<world-layers-toolbar>` is a toggle, not a momentary action. When ON (`.active`), buildings/trees regenerate automatically on every graph change (synchronously in the draw loop, only when the graph hash changes). When OFF, graph edits trigger the orange `.stale` pulse animation. `setStale(true)` is suppressed when auto-regen is ON; `setStale(false)` always works so that toggling ON mid-edit clears the stale indicator. The state is `#autoRegen: boolean` in both `WorldLayersToolbarElement` and `WorldEditor`, stored as an editor-only runtime preference (not persisted).
- **Controls frozen flag** — `Controls.frozen: boolean` (default `false`) makes the `document` keydown/keyup listeners no-op when `true`. Used by `Car.setAutopilot(true)` to prevent human keypresses from overwriting the brain's controls between frames in Human Backpropagation autopilot mode. Disengaging autopilot resets all controls to `false` so the car stops immediately. Existing KEYS cars are unaffected (frozen defaults to `false`).
- **`latchOnly` toggle bindings** — `ShortcutBinding.latchOnly?: boolean` (default `false`) controls press-to-toggle vs held/latched behavior. When `true`, keydown calls `toggleLatch()` and keyup is a no-op (state persists after key release — used by the L learning toggle in Human Backpropagation). When `false` (default), keydown sets physical hold and keyup releases it (used by graph editor one-way/reverse, traffic G toggle).

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
- `html/human-training.html` — Human Backpropagation training (`?mode=simple` for simple road)

## Testing

- No automated tests — validation is visual. Open the relevant HTML page in a browser.
- World files in `saves/` use v2 schema (`version: 2`, `decoration` instead of baked tree/building arrays).

## Persistence

| localStorage key                        | Content                                       |
| --------------------------------------- | --------------------------------------------- |
| `bestPool`                              | Top-K car configs with brains                 |
| `raceCars`                              | Cars loaded via race "Load car(s)"            |
| `editorWorld`                           | World saved by editor                         |
| `humanTrainedCar`                       | Human-backprop trained brain (single CarInfo) |
| `store:activeWorld` / `store:activeCar` | Active store selection                        |
