# Human Backpropagation Training — Standalone Mode

**Date:** 2026-07-15
**Slug:** human-backpropagation-training
**Entry points affected:** new `html/human-training.html`; `index.html` (new landing card); shared `ts/` (Car, NeuralNetwork, NetworkVisualizer, SimulatorShell)
**Save-file impact:** new localStorage key `humanTrainedCar` (single `CarInfo`); `.car` download reuses existing format — no schema change
**Backward compat:** preserved — all changes are additive; existing simulators untouched

## Goal

The `backpropogation-training-from-user` branch proved that per-frame straight-through-estimator backprop (`NeuralNetwork.trainStep`) works well, but integrating it into the population/genetics training simulator was the wrong fit. Instead, build a **standalone "Human Backpropagation" mode** — a single human-driven car whose brain learns to imitate the human's keypresses each frame, with a live accuracy readout on the network visualizer, an autopilot toggle to test the trained brain, and save/resume so training can continue across sessions.

It is a **new main-page section** with two sub-modes (Simple Road and Full World, selected via `?mode=simple` like `simulator.html`), deliberately clean of the regular simulator's AI population, gene pool, generations, and training panel.

## Context (read first)

- `AGENTS.md` — architecture rules (layer isolation, `#` private fields, `.js` import extensions, `Brain = unknown` opaque, centralised `KeyboardManager`, config constants in `ts/car/config.ts`).
- `ts/car/car.ts` — the `Car` class, `#processBrain()` (lines 275-322), constructor brain creation (lines 123-134), `load()`/`toInfo()`.
- `ts/neural-network/network.ts` — `NeuralNetwork` class, `feedForward` (line 16), `Level` structure.
- `ts/neural-network/visualizer.ts` — `NetworkVisualizer.draw()` (line 167), `#drawNeurons()` (line 404), output neurons identified by `node.arrow !== null` / `node.rowIndex === layout.rows - 1`, `node.nodeIndex` aligns with output index.
- `ts/simulator/core/simulatorShell.ts` — `SimulatorShell` base class, `drawNetworkVisualizer()` (line 255), constructor requires `SimulatorPageHost` (toolbarPanel, layoutToolbar, animationLoopToolbar; worldLayersToolbar optional/nullable).
- `ts/simulator/views/simulatorPageHost.ts` — host injects toolbar refs via `document.querySelector`.
- `ts/simulator/entry.ts` — example entry point that imports every module to register custom elements, then boots the simulator.
- `ts/simulator/training/trainingSimulator.ts` — reference for `getStartInfo()` (lines 215-235), keyboard-manager wiring (lines 79-145), pause-toggle clicks (lines 70-77).
- `ts/simulator/training/modes/simpleModeBehavior.ts` — reusable helpers: `SIMPLE_MODE_CONFIG`, `SimpleSimState`, `updateSimpleTraffic()`, `updateSimpleCars()`, `generateInitialTraffic` (imported from `./trafficFactory`).
- `ts/simulator/training/modes/worldModeBehavior.ts` — reusable helper: `updateWorldCars()`; reference for world setup (Viewport, MiniMap, Camera, SpatialHashGrid, TrafficControlGrid, road borders).
- `ts/simulator/training/modes/trafficFactory.ts` — `generateInitialTraffic()`, `generateTrafficRow()`.
- `ts/simulator/spatialGridUtils.ts` — `buildRoadBorders(world)`, `queryBordersNearCar(grid, car)`.
- `ts/simulator/trafficControlUtils.ts` — `buildTrafficControls(world)`, `queryTrafficControlsNearCar(grid, car)`.
- `ts/simulator/training/trainingInitModal.ts` — reference for the car-config UI pattern: `#fillCarConfig(c: CarInfo)`, `#readCarConfig(): CarInfo`, `#parseHiddenLayers(value)`, `#setConfigLocked(locked)`, `#num(selector, fallback, isInt)` helpers. The new config modal reuses this exact read/fill/lock pattern.
- `ts/simulator/training/templates/trainingInitModalTemplate.ts` — reference for the car-config grid HTML (`#tiCarConfigGrid` block, lines 62-114): Height, Width, Hidden Layers, Max Speed, Accel, Friction, Rays, Ray Len, Ray Spread, Ray Offset, State Aware checkbox. Reuse the same field IDs/min/max/step where sensible.
- `ts/simulator/training/genetics/poolManager.ts` — `inferHiddenLayers(brain)` helper (used by the init modal to read hidden-layer counts from a deserialized brain).
- `ts/car/config.ts` — `DEFAULT_CAR_CONFIG`, `DEFAULT_HIDDEN_LAYERS`, `NN_OUTPUT_COUNT`.
- `ts/car/brain/carBrainAdapter.ts` — `createBrain`, `serialize`, `deserialize`, `brainsCompatible`, `inputLayerSize`, `computeControls` (returns `BrainControlOutput`).
- `ts/car/controls/controls.ts` — `Controls` self-registers `document` keydown/keyup for `KEYS` type (this is the existing car-input mechanism, separate from `KeyboardManager` which is for toolbar shortcuts).
- `ts/store/storeManager.ts` — `StoreManager.getActiveWorld()`, `StoreManager.getEditorWorld()`.
- `html/simulator.html` and `index.html` — HTML structure conventions.
- `styles/style.css` — `#simulatorLayout`, `#rightPanel`, `#simulatorToolbar`, `.landing-card`, `.card-btn` classes.

## Scope

- **In scope:**
  - New page `html/human-training.html` with `?mode=simple` URL param (default = full world).
  - New entry point `ts/simulator/humanTraining/entry.ts`.
  - New `HumanBackpropSimulator extends SimulatorShell` — single KEYS car, both simple & world modes, no training panel/genetics/pool.
  - New `<human-training-config-modal>` custom element + template: car-config dialog (physical params + sensor params + hidden layers + state-aware checkbox) shown on entry and via a "Config" button in the panel. Config is locked to the saved brain when one exists (brain topology is fixed); editable when starting fresh.
  - New `<human-training-panel>` custom element + template: autopilot toggle, accuracy % + per-key match dots, learning-rate slider, Config / Download `.car` / Reset brain / Reset car buttons, brain-source status.
  - Port `NeuralNetwork.trainStep` (STE backprop) from the branch into `ts/neural-network/network.ts`.
  - Extend `Car` with `#learningFromHuman`, `#autopilot`, `#learningRate`, `#lastBrainOutput` + setters/getters; wire trainStep into `#processBrain`.
  - Extend `NetworkVisualizer.draw` + `SimulatorShell.drawNetworkVisualizer` with an optional `match` param to ring output neurons green (match) / red (mismatch).
  - New localStorage key `humanTrainedCar` (single `CarInfo`): auto-save throttled + on crash + on `beforeunload`; load on init.
  - New landing card on `index.html`.
  - CSS for the new panel + landing card.
- **Out of scope:**
  - No changes to the existing training simulator, traffic simulator, race, or world editor.
  - No gene pool, generations, crossover, mutation, or population rendering.
  - No car/sensor config UI in the panel (fresh brains use `DEFAULT_CAR_CONFIG`; loaded brains use their saved config). Config is fixed for v1.
  - No world-layers-toolbar / heatmap on the new page (kept clean).
  - No training-init-modal on the new page — replaced by the simpler `<human-training-config-modal>` (car config only, no brain source / training params).

## Implementation

### 1. `ts/neural-network/network.ts` — port `trainStep` from the branch

Add the `static trainStep(network, targets, lr=0.1)` method verbatim from the `backpropogation-training-from-user` branch (the STE backprop). It assumes `feedForward` was just called on the current frame's input so each `level.inputs[]`/`level.outputs[]` holds fresh values. Keep the existing doc comment explaining the bias sign (`z = Σ w·x − bias`, so bias is *decreased* when error is positive). No other changes to this file.

### 2. `ts/car/car.ts` — learning hook, autopilot, accuracy output

Add imports: `import { NeuralNetwork } from '../neural-network/network.js';` (needed to call `trainStep`).

Add private fields (after `#callbacks`):
- `#learningFromHuman: boolean = false` — when true, train the brain each frame to imitate the human's keypresses.
- `#autopilot: boolean = false` — when true, the brain drives the car (controls overwritten by brain output) and learning is paused.
- `#learningRate: number = 0.1` — per-frame STE update rate, adjustable from the panel.
- `#lastBrainOutput: { forward: boolean; left: boolean; right: boolean; reverse: boolean } = { forward: false, left: false, right: false, reverse: false }` — the brain's most recent prediction, exposed for accuracy display.

Rewrite `#processBrain()` so the forward pass **always** runs (so `#lastBrainOutput` is fresh for the visualizer/accuracy even in human mode), then apply brain output only when the brain is driving, then run `trainStep` only in human mode:

```ts
#processBrain(polygons, trafficControls, otherCars): void {
  if (this.sensor && this.brain) {
    this.sensor.update(this.x, this.y, this.angle, polygons, trafficControls, otherCars);
    const output = CarBrainAdapter.computeControls(
      this.sensor.readings, this.speed, this.maxSpeed, this.brain,
      this.sensor.sensorReadings, this.sensor.stateAware,
    );
    this.#lastBrainOutput = output;
    // Brain drives the car when useBrain (AI) OR autopilot (KEYS car in test mode).
    if ((this.useBrain || this.#autopilot) && this.controls instanceof Controls) {
      this.controls.forward = output.forward;
      this.controls.left = output.left;
      this.controls.right = output.right;
      this.controls.reverse = output.reverse;
    }
    // Online imitation learning — human mode only (not autopilot), not damaged,
    // and at least one key pressed (skip idle frames so "release keys" frames
    // don't overwrite lessons via recency bias).
    if (
      this.#learningFromHuman &&
      !this.#autopilot &&
      !this.damaged &&
      this.controls instanceof Controls &&
      (this.controls.forward || this.controls.left ||
       this.controls.right || this.controls.reverse)
    ) {
      NeuralNetwork.trainStep(
        this.brain as NeuralNetwork,
        [
          this.controls.forward ? 1 : 0,
          this.controls.left ? 1 : 0,
          this.controls.right ? 1 : 0,
          this.controls.reverse ? 1 : 0,
        ],
        this.#learningRate,
      );
    }
  } else if (this.sensor) {
    this.sensor.update(this.x, this.y, this.angle, polygons, trafficControls, otherCars);
  }
}
```

Add public API at the end of the class:
- `setLearningFromHuman(enabled: boolean): void`
- `get learningFromHuman(): boolean`
- `setAutopilot(enabled: boolean): void`
- `get autopilot(): boolean`
- `set learningRate(v: number)` / `get learningRate(): number`
- `get lastBrainOutput(): { forward: boolean; left: boolean; right: boolean; reverse: boolean }`

Add a `respawn(startInfo: { x: number; y: number; angle: number }): void` method that resets the car for auto-respawn on crash (keeps the brain):
```ts
respawn(startInfo: { x: number; y: number; angle: number }): void {
  this.x = startInfo.x;
  this.y = startInfo.y;
  this.angle = startInfo.angle;
  this.speed = 0;
  this.damaged = false;
  this.fitness = 0;
  this.polygon = this.physics.createPolygon(this);
}
```

**Architecture note:** `Car` now imports `NeuralNetwork` directly for `trainStep`. This is acceptable — `Car` already bridges to the brain via `CarBrainAdapter` and stores `Brain = unknown`; `trainStep` is a static network operation invoked on the opaque brain cast to `NeuralNetwork`, mirroring how `CarBrainAdapter.computeControls` already casts internally. The `Car → NeuralNetwork` edge already exists transitively through `CarBrainAdapter`; making it direct for the training call is consistent with the branch's approach and keeps the per-frame hot path in `#processBrain`.

### 3. `ts/neural-network/visualizer.ts` — output-neuron match highlighting

Extend `draw()` signature:
```ts
draw(ctx, network, time, stateAware = false, match?: (boolean | null)[]): void
```
Store `match` in a field `#match: (boolean | null)[] | null = null` (set at the top of `draw`, default `null`).

In `#drawNeurons()`, after the existing hovered-neuron highlight ring block (lines ~453-460), add a match ring for **output neurons only**:
```ts
if (this.#match && node.arrow !== null && this.#match[node.nodeIndex] !== null && this.#match[node.nodeIndex] !== undefined) {
  const ok = this.#match[node.nodeIndex];
  ctx.beginPath();
  ctx.lineWidth = 3;
  ctx.arc(node.x, node.y, node.r + 6, 0, Math.PI * 2);
  ctx.strokeStyle = ok ? 'rgba(80,220,120,0.95)' : 'rgba(240,80,80,0.95)';
  ctx.stroke();
}
```
`node.arrow !== null` identifies output-row neurons (only they carry direction arrows); `node.nodeIndex` aligns with the output index (0=forward,1=left,2=right,3=reverse). `null`/`undefined` entries draw no ring (used in autopilot mode where accuracy is not meaningful).

### 4. `ts/simulator/core/simulatorShell.ts` — pass `match` through

Extend `drawNetworkVisualizer`:
```ts
drawNetworkVisualizer(time: number, brain: unknown, stateAware?: boolean, match?: (boolean | null)[]): void {
  if (!this.layoutToolbar.showVisualizer) return;
  this.networkCtx.clearRect(...);
  if (brain) {
    this.networkVisualizer.draw(this.networkCtx, brain as NeuralNetwork, time, stateAware, match);
  }
}
```
No other shell changes.

### 5. `ts/simulator/humanTraining/templates/humanTrainingConfigModalTemplate.ts` — new

Export `HUMAN_TRAINING_CONFIG_MODAL_TEMPLATE` — a dialog (mirror the `.ti-overlay` / `.ti-dialog` structure from `trainingInitModalTemplate.ts`). Contents:

- Header: `<h3 id="htcTitle">Car Configuration</h3>` + `<p id="htcSubtitle">Configure the car you want to train.</p>`.
- A car-config grid (copy the `#tiCarConfigGrid` block from `trainingInitModalTemplate.ts` lines 68-113) but **re-ID** every field with `htc` prefix: `#htcCarHeight`, `#htcCarWidth`, `#htcCarHiddenLayers`, `#htcCarMaxSpeed`, `#htcCarAcceleration`, `#htcCarFriction`, `#htcCarRayCount`, `#htcCarRayLength`, `#htcCarRaySpread`, `#htcCarRayOffset`, `#htcCarStateAware`. Wrap them in `<div class="ti-param-grid" id="htcCarConfigGrid">` (reuse the existing CSS class). Keep the same min/max/step values.
- A config-note span: `<span class="ti-config-note" id="htcConfigNote"></span>` next to the section title (shows "(locked to saved brain)" when a saved brain exists).
- Actions: `<button id="htcCancelBtn" class="btn-lg btn-danger-outline">Cancel</button>` + `<button id="htcStartBtn" class="btn-lg btn-primary">▶️ Start</button>`.

No brain-source radios, no training-params grid — this modal is car-config only.

### 6. `ts/simulator/humanTraining/humanTrainingConfigModal.ts` — new `<human-training-config-modal>`

`class HumanTrainingConfigModalElement extends HTMLElement` — mirror `TrainingInitModalElement` structure but simpler.

```ts
export interface HumanTrainingConfigResult {
  carConfig: CarInfo;
}
export interface HumanTrainingConfigOpenOptions {
  defaults: CarInfo;          // current config to prefill
  lockedToSavedBrain: boolean; // true when a saved brain exists → lock inputs
  onStart: (result: HumanTrainingConfigResult) => void;
  onCancel: () => void;
}
```

Methods (port the helpers from `trainingInitModal.ts`):
- `connectedCallback()`: `this.innerHTML = HUMAN_TRAINING_CONFIG_MODAL_TEMPLATE`; `this.#bindEvents()`.
- `open(options)`: prefill via `#fillCarConfig(options.defaults)`; if `options.lockedToSavedBrain`, call `#setConfigLocked(true)` and set `#htcConfigNote` to "(locked to saved brain)"; else unlock and clear the note. Add `.open` class.
- `#bindEvents()`: `#htcStartBtn` click → `#start()`; `#htcCancelBtn` click → `#cancel()`; backdrop click → cancel; Esc → cancel (guard with `.open` class).
- `#fillCarConfig(c: CarInfo)`: same as `TrainingInitModalElement.#fillCarConfig` but with `htc`-prefixed IDs. Use `inferHiddenLayers(c.brain)` (import from `../genetics/poolManager.js`) as the fallback for `hiddenLayers`.
- `#readCarConfig(): CarInfo`: same as `TrainingInitModalElement.#readCarConfig` but with `htc`-prefixed IDs. Returns a `CarInfo` with **no `brain` field** (the brain is created/loaded separately by the simulator).
- `#setConfigLocked(locked)`: disable all inputs in `#htcCarConfigGrid` + `#htcCarStateAware`.
- `#parseHiddenLayers(value)`, `#setValue(selector, value)`, `#num(selector, fallback, isInt)`: copy verbatim from `trainingInitModal.ts`.
- `#start()`: read config, remove `.open`, clear options, call `onStart({ carConfig })`.
- `#cancel()`: remove `.open`, clear options, call `onCancel()`.

Register: `customElements.define('human-training-config-modal', HumanTrainingConfigModalElement)`.

### 7. `ts/simulator/humanTraining/templates/humanTrainingPanelTemplate.ts` — new

Export `HUMAN_TRAINING_PANEL_TEMPLATE` — a `<aside>`-style panel (mirror the visual conventions of `trainingPanelTemplate.ts` but much smaller). Contents:

- Header: `<h2>Human Backpropagation</h2>` + a `<span id="htMode">` showing "Simple Road" / "World".
- **Autopilot toggle:** `<label><input type="checkbox" id="htAutopilot" /><span>Autopilot — let brain drive (pauses learning)</span></label>`.
- **Accuracy block:** `<div id="htAccuracy">` containing:
  - `<div id="htAccuracyPct">Network accuracy: —</div>`
  - Four key-match indicators: `<span class="ht-key" data-key="forward">↑</span>`, `←`, `→`, `↓` — each gets class `.match` (green) / `.mismatch` (red) / `.idle` (dim) updated each frame.
- **Learning rate:** `<label>Learning rate <input type="range" id="htLearningRate" min="0.01" max="0.5" step="0.01" value="0.1" /><span id="htLearningRateVal">0.10</span></label>`.
- **Buttons:** `<button id="htConfig">⚙️ Config</button>`, `<button id="htDownload">Download .car</button>`, `<button id="htResetBrain">Reset brain</button>`, `<button id="htResetCar">Reset car</button>`.
- **Status:** `<div id="htStatus">Brain: fresh</div>` (shows "loaded from save" when a saved brain was restored).

### 8. `ts/simulator/humanTraining/humanTrainingPanel.ts` — new `<human-training-panel>`

`class HumanTrainingPanelElement extends HTMLElement` with `connectedCallback()` setting `innerHTML = HUMAN_TRAINING_PANEL_TEMPLATE` and wiring DOM refs.

Public API used by the simulator:
- `setMode(mode: 'simple' | 'world'): void` — updates `#htMode` text.
- `setAutopilot(enabled: boolean): void` — checks/unchecks `#htAutopilot` without firing change (programmatic).
- `get autopilotEnabled(): boolean`
- `get learningRate(): number` — reads the slider.
- `setAccuracy(match: (boolean | null)[], pct: number | null): void` — updates `#htAccuracyPct` text (`Network accuracy: 78%` or `—` when `pct` is null, e.g. autopilot) and sets the `.match`/`.mismatch`/`.idle` class on each `.ht-key` element from the `match` array.
- `setStatus(text: string): void` — updates `#htStatus`.
- Event wiring (in `connectedCallback`):
  - `#htAutopilot` `change` → call `this.#onAutopilotChange?.(checked)`.
  - `#htLearningRate` `input` → update `#htLearningRateVal` text + call `this.#onLearningRateChange?.(value)`.
  - `#htConfig` `click` → `this.#onConfig?.()`.
  - `#htDownload` `click` → `this.#onDownload?.()`.
  - `#htResetBrain` `click` → `this.#onResetBrain?.()`.
  - `#htResetCar` `click` → `this.#onResetCar?.()`.
- Setters to register callbacks: `set onAutopilotChange(cb)`, `set onLearningRateChange(cb)`, `set onConfig(cb)`, `set onDownload(cb)`, `set onResetBrain(cb)`, `set onResetCar(cb)`.

### 9. `ts/simulator/humanTraining/humanBackpropSimulator.ts` — new

`class HumanBackpropSimulator extends SimulatorShell`. Constructor takes the same 5 args as `TrainingSimulator` (gameCanvas, networkCanvas, miniMapCanvas, cameraCanvas, host). 

Fields:
- `#mode: 'simple' | 'world'` (from `?mode=simple` URL param).
- `#panel: HumanTrainingPanelElement` (`document.querySelector('human-training-panel')`).
- `#configModal: HumanTrainingConfigModalElement` (`document.querySelector('human-training-config-modal')`).
- `#carConfig: CarInfo` — the active car config (from the config modal or the saved brain).
- `#car: Car | null = null` — the single human car.
- `world: IWorld | null = null`, `roadBorders: Point[][] | null = null` (public, like TrainingSimulator).
- `#borderGrid: SpatialHashGrid = new SpatialHashGrid(150)`, `#trafficGrid: TrafficControlGrid = new TrafficControlGrid(150)` (world mode only).
- `#simpleState: SimpleSimState = new SimpleSimState()` (simple mode only).
- `#keyboardManager: KeyboardManager | null = null`.
- Accuracy tracking: `#matchFrames = 0`, `#matchTotal = 0` (running counts for the percentage).
- Auto-save: `#autoSaveFrameCounter = 0`, `#AUTO_SAVE_INTERVAL = 60`.

Constructor body:
1. `super(...)` (sets up canvases, toolbars, visualizer interactivity).
2. Read URL param: `new URLSearchParams(window.location.search).get('mode') === 'simple'` → `#mode`.
3. `this.#panel = document.querySelector('human-training-panel')`.
4. `this.#configModal = document.querySelector('human-training-config-modal')`.
5. `this.#panel.setMode(this.#mode)`.
6. `this.#initMode()` — sets up world/viewport/minimap/camera/road-borders (simple or world). Does **not** create the car yet — the car is created after the config modal closes.
7. Wire panel callbacks (`this.#wirePanel()`).
8. `this.#initPauseToggleClicks()` (mirror TrainingSimulator — click game/camera canvas toggles pause).
9. `this.#initKeyboardManager()` (mirror TrainingSimulator's display-key bindings for arrows/WASD + Ctrl; no G/traffic toggle needed, keep it minimal — just the 4 drive display keys + Ctrl zoom display).
10. `this.#openConfigModal('entry')` — show the config modal on entry; the car is created in the `onStart` callback.
11. `this.animate(0)`.

`#initMode()`:
- **World mode:** `this.toolbarPanel.configureSelectors({ carMode: 'single', onWorldSelected: (entry) => this.#initWorld(entry?.data as World | null) })`. Load `StoreManager.getActiveWorld() ?? StoreManager.getEditorWorld()` → `#initWorld(world)`.
- **Simple mode:** `this.toolbarPanel.hideGroups('world', 'borders', 'borders-sep')`; `this.toolbarPanel.configureSelectors({ carMode: 'single' })`; `this.toolbarPanel.hideCameraDebug()`; `this.layoutToolbar.setDefaultLayoutMode('camera-big')`. Create `SimpleWorld(canvas.width/2, SIMPLE_MODE_CONFIG.simpleRoadWidth)`, set `this.world`, viewport (`new Viewport(canvas, 1, new Point(-simpleWorld.getCenter(), -100))`), minimap, camera. Generate initial traffic. Build road borders.
- Both modes then call `this.#snapCameraToStart()` (no car created yet).

`#openConfigModal(context: 'entry' | 'config')`:
- Read saved `CarInfo` from `localStorage.getItem('humanTrainedCar')` via `safeJsonParse<CarInfo>`.
- Determine defaults: if a saved info exists, use it as the config defaults (so the user sees the saved car's params); else build a `CarInfo` from `DEFAULT_CAR_CONFIG` + `DEFAULT_HIDDEN_LAYERS` + `stateAware: false` (no brain field).
- `lockedToSavedBrain = savedInfo !== null` — when a saved brain exists, the config is locked (brain topology is fixed by the saved sensor/hidden-layer dims).
- `this.#configModal.open({ defaults, lockedToSavedBrain, onStart: (result) => this.#applyConfigAndCreateCar(result.carConfig, savedInfo), onCancel: () => this.#onConfigCancel(context) })`.

`#applyConfigAndCreateCar(carConfig: CarInfo, savedInfo: CarInfo | null)`:
- `this.#carConfig = carConfig`.
- Build `CarOptions` from `carConfig` + start position (`this.getStartInfo()`), `controlType: 'KEYS'`, `hiddenLayers: carConfig.hiddenLayers`, `sensor: { rayCount, raySpread, rayLength, rayOffset, stateAware }`.
- If `savedInfo` exists: `this.#car = Car.fromInfo(opts, savedInfo)`; `this.#panel.setStatus('Brain: loaded from save')`.
- Else: `this.#car = new Car(opts)` (fresh brain); `this.#panel.setStatus('Brain: fresh')`.
- `this.#car.setLearningFromHuman(true)` (learning on by default).
- `this.#car.setLearningRate(this.#panel.learningRate)`.
- Set callbacks: `this.#car.setCallbacks({ onDamaged: () => this.#onCrash() })`.
- `this.#snapCameraToStart()`.
- `this.animationLoopToolbar.setPaused(false)`.

`#onConfigCancel(context)`:
- If `context === 'entry'` and no car exists yet, create one with `DEFAULT_CAR_CONFIG` defaults (so the page isn't empty): `this.#applyConfigAndCreateCar(this.#defaultCarInfo(), null)`. If a car already exists (context === 'config'), just close the modal — keep the current car.

`#defaultCarInfo(): CarInfo` — build from `DEFAULT_CAR_CONFIG` + `DEFAULT_HIDDEN_LAYERS` + `stateAware: false`, no brain field.

`#initWorld(worldInfo)` — mirror `WorldTrainingStrategy.initializeSimulator`: `this.world = worldInfo ? World.load(worldInfo) : new World(new Graph())`; create Viewport/MiniMap/Camera; `this.updateRoadBorders()`; rebuild grids.

`getStartInfo()` — mirror `TrainingSimulator.getStartInfo()` (find `Start` markings in world, else fall back to `Point(100,100)` / angle 0). For simple mode the world has no markings so it returns the fallback; that matches the existing simple-mode behaviour.

`updateRoadBorders()` — mirror `TrainingSimulator.updateRoadBorders()`: if world has a `Target` marking and a best car, generate a corridor; else `this.roadBorders = buildRoadBorders(this.world)`. (For simple mode, `buildRoadBorders` returns the simple road borders.)

`#rebuildGrid()` (world mode only): `this.#borderGrid.build(this.roadBorders as GridSegment[])`; `this.#trafficGrid.rebuild(buildTrafficControls(this.world))`.

`update()` (called every animation frame):
- Guard: if no car / world / viewport / roadBorders, return.
- **Simple mode:** `updateSimpleTraffic(this.#simpleState, this.#car, this.world as SimpleWorld, this.roadBorders, this.getStartInfo())`; then `updateSimpleCars([this.#car], this.#simpleState, this.roadBorders, false, this.#car, 0)` (single-element array; idle disabled).
- **World mode:** query borders near car (`queryBordersNearCar(this.#borderGrid, this.#car)`); query traffic controls if `car.sensor?.stateAware` (`queryTrafficControlsNearCar(this.#trafficGrid, this.#car)`); `this.#car.update(borders, trafficControls, [])`.
- After update: track viewport to car (`viewport.offset.x = -car.x; .y = -car.y` for world; for simple `viewport.offset.x = -simpleWorld.getCenter(); .y = -car.y`); `this.camera?.move(car)`.
- Accuracy: `this.#updateAccuracy()`.
- Auto-save: increment `#autoSaveFrameCounter`; when `>= #AUTO_SAVE_INTERVAL`, call `this.#saveCar()` and reset counter.

`#updateAccuracy()`:
- If `this.#panel.autopilotEnabled` or `this.#car.damaged`: call `this.#panel.setAccuracy([null,null,null,null], null)` (no accuracy in autopilot/crashed); reset running counters so the % restarts cleanly when switching back.
- Else: read human keys from `this.#car.controls` (cast `as Controls`) and brain output from `this.#car.lastBrainOutput`. Build `match = [brain.forward===human.forward, brain.left===human.left, brain.right===human.right, brain.reverse===human.reverse]`. Update running counts: for each of the 4 channels, `#matchTotal++` and `#matchFrames++` when matched. Compute `pct = round(100 * #matchFrames / #matchTotal)`. Call `this.#panel.setAccuracy(match, pct)`.

`draw(time)`:
- Guard as in `update()`.
- `this.resizeLayout()`; `this.viewport.reset()`.
- **World mode:** `this.world.draw(this.gameCtx, { viewPoint, showStartMarkings: false, layers: this.worldLayers })`; `this.viewport.drawScaleIndicator(this.gameCtx)`.
- **Simple mode:** `simpleWorld.draw(this.gameCtx, { viewPoint: new Point(0,0) })`; `this.viewport.drawScaleIndicator(...)`; draw visible traffic cars (iterate `#simpleState.traffic`, cull by viewport y-bounds, `car.draw(ctx, {})`).
- Draw the single car: `this.#car.draw(this.gameCtx, { showSensor: true, showMask: true })`.
- Build the `match` array for the visualizer: in human mode (not autopilot, not damaged) the same `match` computed in `#updateAccuracy`; in autopilot `[null,null,null,null]`. Cache it on the instance in `#updateAccuracy` so `draw` reuses it (avoid recomputing).
- `this.drawNetworkVisualizer(time, this.#car.brain, this.#car.sensor?.stateAware, this.#currentMatch)`.
- Draw minimap (mirror simple/world strategy — floating when miniMap shown without visualizer).
- `this.renderCameraView()` — render camera view with the single car as keyCar (no traffic in world mode; pass `traffic: #simpleState.traffic` in simple mode). Since there's no `renderCameraView` helper on the shell, inline: `if (this.layoutToolbar.showCameraView && this.camera) this.camera.render(this.cameraCtx, this.world, { keyCar: this.#car, bestCar: this.#car, cars: [this.#car], showTrees: this.worldLayers.trees, showBuildings: this.worldLayers.buildings, traffic: simpleMode ? this.#simpleState.traffic : undefined })`.

`#onCrash()` — auto-respawn keeping the brain:
- `this.#saveCar()` (persist the latest brain before respawn).
- `this.#car.respawn(this.getStartInfo())`.
- Reset accuracy counters (`#matchFrames = 0; #matchTotal = 0`).

`#saveCar()` — `localStorage.setItem('humanTrainedCar', JSON.stringify(this.#car.toInfo()))`.

`#wirePanel()`:
- `panel.onAutopilotChange = (enabled) => { this.#car?.setAutopilot(enabled); this.#matchFrames = 0; this.#matchTotal = 0; }`.
- `panel.onLearningRateChange = (v) => { this.#car?.setLearningRate(v); }`.
- `panel.onConfig = () => { this.#openConfigModal('config'); }`.
- `panel.onDownload = () => { if (this.#car) downloadCarFiles([{ car: this.#car, poolPosition: 0 }]); }`.
- `panel.onResetBrain = () => { this.#resetBrain(); }`.
- `panel.onResetCar = () => { this.#car?.respawn(this.getStartInfo()); this.#matchFrames = 0; this.#matchTotal = 0; }`.

`#resetBrain()`:
- `localStorage.removeItem('humanTrainedCar')`.
- If `this.#car` and `this.#car.sensor`: `this.#car.brain = CarBrainAdapter.createBrain([CarBrainAdapter.inputLayerSize(this.#car.sensor.rayCount, this.#car.sensor.stateAware), ...this.#car.hiddenLayers, NN_OUTPUT_COUNT])`.
- `this.#car?.respawn(this.getStartInfo())`.
- `this.#panel.setStatus('Brain: fresh')`.
- Reset accuracy counters.

**Note on config changes mid-session:** When the user opens the config modal via the "Config" button and a saved brain exists, the config is locked — they cannot change sensor/hidden-layer dims without resetting the brain. If they want a different config, they click "Reset brain" first (clears the save), then "Config" to set new params, which creates a fresh car with a fresh brain. The `#applyConfigAndCreateCar` method always replaces `this.#car` entirely (new `Car` instance), so changing config mid-session is a full car reset. When no saved brain exists and the user edits config in the modal, `#applyConfigAndCreateCar` creates a fresh car with the new config and a fresh random brain.

`#initPauseToggleClicks()` and `#initKeyboardManager()` — mirror `TrainingSimulator` (lines 70-145). For keyboard manager, register only the 4 drive display keys (↑/W, ↓/S, ←/A, →/D) and the Ctrl zoom display key. No G traffic toggle (no traffic-light override in this mode).

`onPausedRender()` — `this.#updateAccuracy()` is not needed while paused; just keep the last visualizer frame (no-op or redraw). Implement as no-op.

Add a `beforeunload` listener in the constructor: `window.addEventListener('beforeunload', () => this.#saveCar())` so the brain persists on page close.

`protected update()` / `protected draw(time)` / `protected onPausedRender()` — delegate to the methods above (the shell calls these abstract methods).

### 10. `ts/simulator/humanTraining/entry.ts` — new

Mirror `ts/simulator/entry.ts`: import every module that registers custom elements / side effects (copy the import block from `simulator/entry.ts`), **replace** the training-specific imports (`trainingPanelTemplate`, `trainingInitModalTemplate`, `trainingPanel`, `trainingInitModal`, `trainingSimulator`, `simulatorPageHost` stays) with the new human-training imports (`humanTrainingConfigModalTemplate`, `humanTrainingPanelTemplate`, `humanTrainingConfigModal`, `humanTrainingPanel`, `humanBackpropSimulator`). Keep `simulatorPageHost` import. Then:

```ts
(async () => {
  await StoreManager.init();
  const host = new SimulatorPageHost();
  new HumanBackpropSimulator(gameCanvas, networkCanvas, miniMapCanvas, cameraCanvas, host);
})();
```

Keep the `declare const gameCanvas` etc. declarations. Do **not** import `worldLayersToolbar`-only features; the page omits that element so `host.worldLayersToolbar` is `null` (the shell handles null).

### 11. `html/human-training.html` — new

Mirror `html/simulator.html` structure but replace `<training-panel>` with `<human-training-panel>`, remove `<training-init-modal>`, and add `<human-training-config-modal>`. Keep `#simulatorLayout` with the 4 canvases + `#rightPanel`, and `#simulatorToolbar` with `world-toolbar`, `layout-toolbar`, `animation-loop-toolbar`, `shortcuts-toolbar` (drop `world-layers-toolbar`). Script: `<script type="module" src="/js/simulator/humanTraining/entry.js"></script>`. Title: "Self-driving car — Human Backpropagation".

### 12. `index.html` — new landing card

Add a new `<section class="landing-card">` (place it after the "AI Training Simulators" card, before "Live Traffic Jam"). Icon `🎓`, title "Human Backpropagation", description: "Teach a neural network by driving. The car learns from your keypresses in real time via backpropagation — watch the network match your driving, then let it take the wheel." Two `card-btn` links:
- `html/human-training.html?mode=simple` — "Simple Road" / "3-lane road, learn to dodge traffic"
- `html/human-training.html` — "Full World" / "Custom maps, learn to navigate roads & lights"

### 13. `styles/style.css` — new panel + landing card styles

Add styles for `<human-training-panel>`:
- Layout it like the existing training panel sidebar (flex column, padding, gap). Reuse the existing `#rightPanel` / panel color variables (dark translucent background, rounded).
- `.ht-key` — inline-block, monospace, padding, border-radius; `.ht-key.match` green border/text; `.ht-key.mismatch` red; `.ht-key.idle` dim grey.
- `#htAccuracyPct` — bold, larger font.
- Buttons reuse existing button styles (match `.card-btn` or the training-panel button conventions — inspect `styles/style.css` training-panel button rules and reuse the same class names where possible).
- Range slider styling — reuse any existing range styles; if none, minimal styling (accent-color).

No new landing-card CSS needed — the existing `.landing-card` / `.card-btn` classes apply automatically.

## Brain / persistence considerations

- New localStorage key `humanTrainedCar` stores a single `CarInfo` JSON (brain + physical config + sensor config + hiddenLayers). This is the same `CarInfo` shape used by `bestPool` / `.car` files — no schema change.
- On init, `Car.fromInfo(opts, info)` deserializes the brain; `Car.load()` already calls `brainsCompatible()` and clears the brain if dimensions don't match the sensor config — so a saved brain is safely rejected if the sensor config somehow drifts.
- `downloadCarFiles` produces a standard `.car` file the user can re-import via the store later.
- Auto-save is throttled (every 60 frames ≈ 1s), on crash, and on `beforeunload` — never blocks the animation loop.
- Reset brain clears `humanTrainedCar` and creates a fresh random brain with the current sensor/hidden-layer config.

## Acceptance criteria

- `npm run fix:all` passes (format + lint) and `tsc --noEmit` compiles clean.
- Opening `index.html` shows a new "Human Backpropagation" landing card with two links (Simple Road / Full World).
- Opening `html/human-training.html` (world mode) shows the car-config modal first; after clicking "Start", the page loads the active/editor world, shows a single car at the start marking with the chosen config, the network visualizer, and the `<human-training-panel>`. No AI population, no gene pool, no generations UI.
- Opening `html/human-training.html?mode=simple` shows the config modal first; after "Start", the 3-lane road with traffic and the single car appear.
- The config modal exposes all car params (height, width, hidden layers, max speed, accel, friction, ray count/length/spread/offset, state-aware checkbox). When a saved brain exists, the config inputs are locked (note: "locked to saved brain"); when fresh, they are editable.
- Clicking "Config" in the panel reopens the config modal; applying a new config recreates the car (fresh brain if no save, or locked to the saved brain's topology).
- Driving with arrow keys / WASD: the car moves; the network visualizer output neurons show green rings when the brain's output matches the pressed key and red rings when it disagrees; the accuracy % climbs over time as the brain learns.
- Toggling "Autopilot" in the panel: the brain takes over driving (human keys ignored), learning pauses, accuracy display shows `—`, and the match rings disappear. Toggling off resumes human driving + learning.
- Adjusting the learning-rate slider changes the learning speed visibly (faster convergence at higher values).
- Crashing the car: it auto-respawns at the start position with the **same trained brain**; training continues. The `humanTrainedCar` localStorage key is updated.
- Reloading the page: the previously trained brain is restored (status shows "loaded from save") and training resumes from where it left off.
- "Download .car" downloads a `.car` file containing the trained brain.
- "Reset brain" clears the saved brain, creates a fresh random network, and respawns the car (status "fresh").
- "Reset car" respawns the car at the start without touching the brain.
- The existing `simulator.html`, `traffic.html`, `race.html`, and `world.html` pages are unchanged and still work.

## Docs to update

- `docs/Physics.md` — add a subsection under the Neural Network section documenting `NeuralNetwork.trainStep` (STE backprop, bias-sign convention) and the human-backpropagation mode (single-car online imitation learning, autopilot toggle, accuracy display, `humanTrainedCar` persistence). Reference the existing `trainStep` doc from the branch's `04-feature-d1` plan but update it for the standalone mode.
- `AGENTS.md` — append a new convention bullet under "Architecture rules": "Human Backpropagation mode (`html/human-training.html`) is a standalone single-car simulator (`HumanBackpropSimulator extends SimulatorShell`) with no AI population/gene pool. The KEYS car's brain is trained online each frame via `NeuralNetwork.trainStep` (STE backprop) to imitate human keypresses; `Car.#autopilot` toggles brain-driven driving (pauses learning); `Car.#lastBrainOutput` exposes the brain's prediction for accuracy display. Brain persists to localStorage key `humanTrainedCar`." Also add `humanTrainedCar` to the persistence table.
- No new `docs/*.md` file warranted — the change is one cohesive feature covered by the `docs/Physics.md` subsection.
