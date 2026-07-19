# Test Improvements — All Phases

**Date:** 2026-07-19
**Slug:** test-improvements-all-phases
**Entry points affected:** none (only `tests/unit/` added to)
**Save-file impact:** none
**Backward compat:** preserved

## Goal

Expand test coverage from ~75% to ~94% by adding tests for the 22 untested source directories and strengthening 8 partially-covered directories, plus cross-cutting improvements (integration, fuzz, property-based tests).

## Current coverage

| Phases  | Current % Stmts | Target   | Est. new tests |
| ------- | --------------- | -------- | -------------- |
| P0      | 0%              | 85%+     | ~120           |
| P1      | 0%              | 80%+     | ~80            |
| P2      | 0%              | 75%+     | ~90            |
| P3      | varies          | 90%+     | ~60            |
| **All** | **~75%**        | **~94%** | **~350**       |

## Conventions (read first)

- All test imports use `.js` extension (project convention).
- No canvas/DOM in unit tests — pure logic only. Draw methods deferred to Playwright visual tests.
- Deterministic tests — seed PRNGs, avoid `Math.random` in assertions.
- Mock global browser APIs (`Image`, `HTMLCanvasElement`, `CanvasRenderingContext2D`, `AudioContext`, `localStorage`) via vitest `vi.stubGlobal` / `vi.mock`.
- Use existing test helpers from `tests/helpers/`: `setupImageMock`, `mockCanvas2D`, `makePoint`, `makeCar`, `makeKnownNetwork`.
- Run `npm run fix:all` before any commit.

---

## Phase P0 — High Impact, High Isolatability

**Target modules:** `KeyboardManager`, `world/editors/` (11 files), `storageManager`

### P0-a: `KeyboardManager` — `tests/unit/panels/keyboardManager.test.ts`

**Source:** `ts/panels/keyboardManager.ts` (203 lines)
**New file:** `tests/unit/panels/keyboardManager.test.ts`

Mock `ShortcutsToolbarElement` — verify the manager calls `setShortcuts()`, `flash()`, `setActive()` correctly.

```
describe('KeyboardManager')
  describe('construction')
    ✓ creates instance, registers window keydown/keyup listeners
    ✓ creates instance with empty bindings

  describe('setBindings')
    ✓ replaces root bindings, renders toolbar
    ✓ calls toolbar.setShortcuts with correct defs

  describe('pushBindings / popBindings')
    ✓ push adds bindings to the combined set
    ✓ pop removes pushed bindings, restores root
    ✓ push twice replaces previous pushed set

  describe('momentary key')
    ✓ keydown fires handler
    ✓ keydown flashes toolbar
    ✓ keydown is ignored when typing in INPUT element

  describe('toggle (held/latched) key')
    ✓ keydown activates, keyup deactivates
    ✓ calls onActivate/onDeactivate on state change
    ✓ click-to-latch on toolbar triggers toggleLatch

  describe('toggle (latchOnly) key')
    ✓ keydown toggles latch, keyup is no-op
    ✓ latch persists after key release

  describe('display keys')
    ✓ keydown sets indicator active, keyup sets inactive
    ✓ display keys light up while physical key is held

  describe('setToggleActive')
    ✓ programmatically sets a toggle's active state
    ✓ no-op when toggle is already in desired state

  describe('dispose')
    ✓ removes window event listeners
    ✓ clears toggle state
    ✓ clears toolbar
```

**Acceptance criteria:**

- All above tests pass.
- Every binding type (momentary, toggle, latchOnly, display) is covered.
- `#shouldIgnore` edge cases (INPUT, TEXTAREA, contentEditable).

### P0-b: World Editors — `tests/unit/world/editors/`

**Source files:** 11 files in `ts/world/editors/`
**New files:**

| Test file                                         | Editors tested       |
| ------------------------------------------------- | -------------------- |
| `tests/unit/world/editors/markingEditor.test.ts`  | Base `MarkingEditor` |
| `tests/unit/world/editors/graphEditor.test.ts`    | `GraphEditor`        |
| `tests/unit/world/editors/lightEditor.test.ts`    | `LightEditor`        |
| `tests/unit/world/editors/worldEditor.test.ts`    | `WorldEditor`        |
| `tests/unit/world/editors/corridorEditor.test.ts` | `CorridorEditor`     |
| `tests/unit/world/editors/stopEditor.test.ts`     | `StopEditor`         |
| `tests/unit/world/editors/crossingEditor.test.ts` | `CrossingEditor`     |
| `tests/unit/world/editors/startEditor.test.ts`    | `StartEditor`        |
| `tests/unit/world/editors/parkingEditor.test.ts`  | `ParkingEditor`      |
| `tests/unit/world/editors/targetEditor.test.ts`   | `TargetEditor`       |
| `tests/unit/world/editors/yieldEditor.test.ts`    | `YieldEditor`        |

#### MarkingEditor base (`markingEditor.test.ts`)

```
describe('MarkingEditor')
  describe('construction')
    ✓ creates instance with viewport, world, targetSegments
    ✓ stores reference to world.markings

  describe('enable/disable lifecycle')
    ✓ enable() adds mouse event listeners to canvas
    ✓ disable() removes listeners, clears intent
    ✓ double enable() does not duplicate listeners

  describe('createMarking')
    ✓ creates a base Marking instance
    ✓ returns marking with correct center/direction

  describe('mouse interaction')
    ✓ mouseMove updates mouse position (viewport → world)
    ✓ mouseDown creates new marking when near segment
    ✓ mouseDown on empty space does nothing
    ✓ right-click prevents default context menu
```

#### GraphEditor (`graphEditor.test.ts`)

```
describe('GraphEditor')
  describe('construction')
    ✓ creates editor with viewport + graph
    ✓ buildBindings returns shortcuts

  describe('enable/disable')
    ✓ enable() adds listeners, calls km.pushBindings
    ✓ disable() removes listeners, calls km.popBindings
    ✓ dispose() disables + disposes keyboard manager

  describe('mouse interaction')
    ✓ mouseDown on empty space adds a new point
    ✓ mouseDown near existing point selects it (drag starts)
    ✓ mouseDown near 2 points creates a segment
    ✓ mouseUp releases drag
    ✓ right-click prevents default

  describe('keyboard shortcuts')
    ✓ Escape deselects point
    ✓ Delete removes selected point/segment
    ✓ O toggles one-way mode
    ✓ R toggles reverse heading
    ✓ P toggles separated mode

  describe('display()')
    ✓ draws selected/hovered points and segments
```

#### LightEditor (`lightEditor.test.ts`)

```
describe('LightEditor')
  describe('construction')
    ✓ targets lane guides
    ✓ extends MarkingEditor

  describe('enable/disable')
    ✓ enable() adds light click handler + calls super
    ✓ disable() removes light click handler + calls super

  describe('light click lifecycle')
    ✓ click on existing non-overridden light → cycles to 'off'
    ✓ click cycles off→green→yellow→red
    ✓ click on 'red' releases override
    ✓ click on empty space does nothing (bubbles to MarkingEditor placement)
    ✓ creates new Light marking with correct dimensions
```

#### WorldEditor (`worldEditor.test.ts`)

```
describe('WorldEditor')
  describe('construction')
    ✓ creates editor with canvas, world, viewport
    ✓ loads layer visibility from localStorage

  describe('auto-regen toggle')
    ✓ autoRegen default is false
    ✓ toggling autoRegen on regenerates items
    ✓ toggling autoRegen off sets stale state

  describe('editor mode switching')
    ✓ switching mode disables old editor, enables new
    ✓ mode='graph' activates GraphEditor
    ✓ mode='light' activates LightEditor

  describe('layer visibility')
    ✓ setLayerVisibility updates and persists
    ✓ loadLayerVisibility merges with defaults

  describe('save/load')
    ✓ save serializes world + layer visibility
    ✓ load restores world from serialized data
```

### P0-c: `StorageManager` — `tests/unit/simulator/training/genetics/storageManager.test.ts`

**Source:** `ts/simulator/training/genetics/storageManager.ts` (113 lines)
**New file:** `tests/unit/simulator/training/genetics/storageManager.test.ts`

Mock `localStorage`, `Blob`, `URL.createObjectURL` / `revokeObjectURL`.

```
describe('storageManager')
  describe('loadPoolFromStorage')
    ✓ returns parsed pool when 'bestPool' exists
    ✓ migrates legacy 'bestBrain' to unified pool
    ✓ migrates legacy 'bestBrains' to unified pool
    ✓ merges legacy config with brain
    ✓ returns [] when no storage present
    ✓ returns fallbackConfig when no legacy config present

  describe('savePoolToStorage')
    ✓ writes pool to 'bestPool'
    ✓ logs warning when pool is empty

  describe('discardStoredPool')
    ✓ removes all legacy keys

  describe('loadRaceCars / saveRaceCars')
    ✓ saves and loads race cars
    ✓ removes key when saving empty list

  describe('downloadCarFiles')
    ✓ creates Blob and triggers download for each car
    ✓ no-op when selectedCars is empty
```

---

## Phase P1 — Important, Medium Complexity

**Target modules:** `audio/sound.ts`, `simpleModeBehavior.ts`, `worldModeBehavior.ts`, `carState.ts`

### P1-a: `SoundEngine` — `tests/unit/audio/sound.test.ts`

**Source:** `ts/audio/sound.ts` (151 lines)
**New file:** `tests/unit/audio/sound.test.ts`

Mock `AudioContext`, `OscillatorNode`, `GainNode` via `vi.stubGlobal`.

```
describe('SoundEngine')
  describe('construction')
    ✓ creates AudioContext
    ✓ creates oscillator + gain + LFO nodes
    ✓ exposes volume and frequency params

  describe('setVolume')
    ✓ sets gain value within [0, 1]
    ✓ clamps to [0, 1]

  describe('setPitch')
    ✓ maps percent to frequency range 100-300

  describe('stop')
    ✓ fades out and stops oscillator + LFO

describe('beep')
  ✓ creates oscillator with correct frequency/type
  ✓ schedules gain envelope (ramp up, ramp down)

describe('explode')
  ✓ creates 10 oscillators with random frequencies
  ✓ schedules gain envelope for each oscillator

describe('taDaa')
  ✓ calls beep twice with different frequencies
  ✓ uses 'sawtooth' waveform
```

### P1-b: `simpleModeBehavior` — `tests/unit/simulator/training/modes/simpleModeBehavior.test.ts`

**Source:** `ts/simulator/training/modes/simpleModeBehavior.ts` (351 lines)
**New file:** `tests/unit/simulator/training/modes/simpleModeBehavior.test.ts`

Pure functions — no mocking needed beyond `setupImageMock()` for Car creation.

```
describe('SimpleSimState')
  ✓ constructor initialises with defaults
  ✓ reset() clears traffic and resets y

describe('updateSimpleTraffic')
  ✓ generates traffic rows when car exceeds lookahead
  ✓ culls traffic beyond margin
  ✓ respects trafficSpeed config
  ✓ handles edge case: no lanes

describe('generateInitialTraffic')
  ✓ creates traffic cars at starting position
  ✓ positions cars across all lanes

describe('SIMPLE_MODE_CONFIG')
  ✓ exports expected configuration constants
```

### P1-c: `worldModeBehavior` — `tests/unit/simulator/training/modes/worldModeBehavior.test.ts`

**Source:** `ts/simulator/training/modes/worldModeBehavior.ts` (284 lines)
**New file:** `tests/unit/simulator/training/modes/worldModeBehavior.test.ts`

Uses `makeCar()` helper + mock `SpatialHashGrid` and `TrafficControlGrid`.

```
describe('updateWorldCars')
  ✓ updates alive cars
  ✓ skips damaged cars when borderMode != 'collision'
  ✓ counts dead cars
  ✓ freezes idle cars far behind bestCar
  ✓ handles collision mode for damaged cars
  ✓ passes traffic controls to car.update()
  ✓ returns correct aliveCount/deadCount/frozenCount
  ✓ edge case: empty cars array
  ✓ edge case: all cars damaged
  ✓ edge case: all cars frozen
```

### P1-d: `carState.ts` — `tests/unit/car/carState.test.ts`

**Source:** `ts/car/carState.ts` (21 lines — interface-only, already covered by structural tests in `carPhysics.test.ts` and `car.test.ts`)

Verify that the `ControlsState` and `CarState` interfaces are structurally compatible with `CarPhysics` and `Car` usage (covered by existing tests — minimal additional work needed).

---

## Phase P2 — Valuable, Higher Setup Cost

**Target modules:** `SimulatorShell`, panels (8 files), `camera.ts`, remaining rendering

### P2-a: `SimulatorShell` — `tests/unit/simulator/core/simulatorShell.test.ts`

**Source:** `ts/simulator/core/simulatorShell.ts` (309 lines, abstract base class)
**New file:** `tests/unit/simulator/core/simulatorShell.test.ts`

Create a concrete subclass for testing, mocking `HTMLCanvasElement`, `CanvasRenderingContext2D`, `Viewport`, `MiniMap`, `Camera`.

```
describe('SimulatorShell')
  describe('layer visibility')
    ✓ loadSimLayerVisibility reads from localStorage
    ✓ saveSimLayerVisibility persists to localStorage
    ✓ load merges stored partial over defaults

  describe('canvas initialization')
    ✓ creates game, camera, network, minimap canvases
    ✓ creates 2D contexts for all canvases

  describe('animate loop')
    ✓ calls update() and draw() on each frame
    ✓ throttles draw() based on renderInterval

  describe('resize')
    ✓ resizeSimulatorLayout updates all panel sizes

  describe('setLayers')
    ✓ updates layer visibility and persists
```

### P2-b: Panels — `tests/unit/panels/`

**Source files:** `shortcutsToolbar.ts`, `worldToolbar.ts`, `editorToolbar.ts`, `modeControls.ts`, `assetSelectors.ts`, `worldLayersToolbar.ts`
**New test files:**

| Test file                                      | Source tested               |
| ---------------------------------------------- | --------------------------- |
| `tests/unit/panels/shortcutsToolbar.test.ts`   | `ShortcutsToolbarElement`   |
| `tests/unit/panels/worldToolbar.test.ts`       | `WorldToolbarElement`       |
| `tests/unit/panels/editorToolbar.test.ts`      | `EditorToolbarElement`      |
| `tests/unit/panels/modeControls.test.ts`       | `ToolbarModeControls`       |
| `tests/unit/panels/assetSelectors.test.ts`     | `ToolbarAssetSelectors`     |
| `tests/unit/panels/worldLayersToolbar.test.ts` | `WorldLayersToolbarElement` |

```
describe('ShortcutsToolbarElement')
  ✓ setShortcuts renders grouped indicators
  ✓ flash(id) temporarily highlights indicator
  ✓ setActive(id, true/false) toggles active class
  ✓ setToggleHandler wires click-to-latch
  ✓ creates group separators between different groups

describe('ToolbarModeControls')
  ✓ borderMode defaults to 'damage'
  ✓ trackingMode defaults to 'best'
  ✓ viewportMode defaults to 'mouse'
  ✓ setBorderMode fires onChange callback
  ✓ setTrackingMode fires callback + updates button UI
  ✓ setViewportMode fires callback
  ✓ listeners are optional (no crash when null)

describe('WorldToolbarElement')
  ✓ constructed with modeControls + assetSelectors
  ✓ delegates borderMode/trackingMode/viewportMode
  ✓ showCameraDebug defaults to false
  ✓ hideCameraDebug hides debug groups

describe('EditorToolbarElement')
  ✓ connectedCallback renders buttons + wires clicks
  ✓ setMode updates active button class
  ✓ setModeChangeListener fires on click

describe('WorldLayersToolbarElement')
  ✓ renders layer toggles from WorldLayerVisibility
  ✓ toggle sets/unsets active
  ✓ auto-regen toggle reflects internal state
```

### P2-c: `Camera` — `tests/unit/camera/camera.test.ts`

**Source:** `ts/camera/camera.ts` (318 lines)
**New file:** `tests/unit/camera/camera.test.ts`

```
describe('Camera')
  describe('construction')
    ✓ initializes at given position/angle
    ✓ default range is 1000, distanceBehind is 100

  describe('move')
    ✓ interpolates position towards target
    ✓ updates frustum points

  describe('simpleMove')
    ✓ directly sets position without interpolation

  describe('project')
    ✓ projects 3D point to 2D screen coordinates
    ✓ returns null for points outside range

  describe('extrusion helpers')
    ✓ extrudePolygons returns correct shape
    ✓ extrudeTreeShapes returns correct shape
    ✓ extrudeCarShape returns correct shape
```

### P2-d: Remaining rendering — `tests/unit/rendering/envelopeRenderer.test.ts`, `tests/unit/rendering/heatmapRenderer.test.ts`

```
describe('drawEnvelope')
  ✓ calls drawPolygon with envelope.polygon

describe('drawHeatmap')
  ✓ renders heatmap grid cells with correct colors
  ✓ handles empty grid
```

### P2-e: Remaining partially-tested modules

- `ts/car/sensors/sensorReading.ts` (if it contains logic beyond types)
- `ts/panels/assetSelectors.ts` (if mockable without full DOM)
- `ts/simulator/training/modes/trafficFactory.ts`

---

## Phase P3 — Cross-Cutting Improvements

### P3-a: Integration Tests — `tests/unit/integration/`

**New files:**

| File                                | What it tests                                                      |
| ----------------------------------- | ------------------------------------------------------------------ |
| `car-physics-sensor-brain.test.ts`  | End-to-end: AI car running 100 frames, fitness increases, no crash |
| `keyboard-manager-controls.test.ts` | KeyboardManager + Controls frozen flag integration                 |
| `traffic-control-chain.test.ts`     | TrafficManager → TrafficControlGrid → Sensor stateAware            |
| `human-backprop-pipeline.test.ts`   | Car replay buffer → trainStep → brain mutation                     |

```
describe('AI car pipeline integration')
  ✓ car with AI brain processes inputs each frame
  ✓ car drives forward without immediate border collision
  ✓ car fitness increases over 100 frames
  ✓ stateAware sensor reads traffic light state

describe('KeyboardManager + Controls integration')
  ✓ key press is swallowed when Controls.frozen = true
  ✓ key press reaches car when Controls.frozen = false
```

### P3-b: Property-Based Tests — `tests/unit/property/`

Use `vitest` with manual random sequences (or integrate `fast-check` if project allows).

```
describe('Car invariants')
  ✓ speed never exceeds maxSpeed (random control sequences)
  ✓ speed never goes below -maxSpeed/2 (reverse limit)
  ✓ fitness is monotonic (never decreases)
  ✓ polygon always contains car center point

describe('Sensor invariants')
  ✓ readings.length === rayCount after update
  ✓ each reading offset is in [0, 1]
  ✓ stateAware doubles input per ray

describe('Graph invariants')
  ✓ after removing a point, no segment references it
  ✓ graph hash changes when graph changes
  ✓ graph hash is deterministic for same graph

describe('NeuralNetwork invariants')
  ✓ feedForward output length === output layer size
  ✓ all output values are 0 or 1 (binary step)
  ✓ trainStep preserves weight range [-1, 1]
```

### P3-c: Fuzz Tests — `tests/unit/fuzz/`

```
describe('Physics fuzz')
  ✓ NaN/Infinity inputs do not crash CarPhysics.update()
  ✓ extremely large acceleration values are clamped

describe('Collision fuzz')
  ✓ empty polygon array does not crash polysIntersect
  ✓ single-point polygon does not crash containsPoint
  ✓ degenerate segment (zero length) does not crash nearestEdgeOffset

describe('Sensor fuzz')
  ✓ negative rayCount defaults to 0
  ✓ rayLength = 0 returns no readings
  ✓ empty borders array does not crash update()
```

### P3-d: Edge Case Expansion

Extend existing test files with edge cases:

```
Existing test file           New edge-case tests
─────────────────────────────────────────────────
car/car.test.ts              ✓ update with null brain
                             ✓ load with malformed CarInfo
                             ✓ respawn while damaged
                             ✓ setAutopilot(false) resets controls
                             ✓ multiple setCallbacks calls

world/markings/marking.test.ts  ✓ reanchor with same anchor (no-op)
                                ✓ rebuildGeometry after polygon modified

world/trafficManager.test.ts    ✓ cycle with no lights
                                ✓ override all lights then release all

math/primitives/polygon.test.ts ✓ union of disjoint polygons
                                ✓ containsPoint on polygon edge
                                ✓ containsPoint on polygon vertex

math/graph/graph.test.ts        ✓ load with duplicate points
                                ✓ tryAddSegment with existing segment
                                ✓ removeSegment that doesn't exist

neural-network/network.test.ts  ✓ feedForward with all-zero weights
                                ✓ trainStep with NaN learning rate
                                ✓ trainStep with empty targets array

simulator/poolManager.test.ts   ✓ applyPoolToCars with fewer pool entries than cars
                                ✓ brainsCompatible with null brain
```

### P3-e: Benchmark / Performance Regression

```
describe('NeuralNetwork benchmark')
  ✓ feedForward 10k iterations < 50ms
  ✓ trainStep 1k iterations < 200ms

describe('Sensor benchmark')
  ✓ update with 1000 borders < 5ms

describe('Graph hash benchmark')
  ✓ hash 1000-node graph < 10ms
```

---

## Architecture rules for tests

1. **No canvas/DOM** — pure logic only. Draw methods tested via Playwright visual tests.
2. **Deterministic** — seed PRNGs, avoid `Math.random` in assertions.
3. **Import with `.js` extension** — project convention.
4. **Mocking browser APIs** — use `vi.stubGlobal` for `Image`, `AudioContext`, `HTMLCanvasElement`, `CanvasRenderingContext2D`, `localStorage`. Use `setupImageMock()` from test helpers.
5. **`viewer` pattern** — For DOM-heavy modules (custom elements, `SimulatorShell`, editors), extract pure logic into testable functions or inject mocks.
6. **Marking editors** — Test `WorldEditor` and editor lifecycle using mocked `Viewport` + injected `World`.

---

## Implementation order

Each phase is self-contained and can be implemented independently. Recommended order:

```
Phase P0-a: KeyboardManager test
Phase P0-b: World editors tests (11 files)
Phase P0-c: StorageManager test
────────────────────────────────────
Phase P1-a: SoundEngine + audio tests
Phase P1-b: simpleModeBehavior tests
Phase P1-c: worldModeBehavior tests
Phase P1-d: carState (verify covered)
────────────────────────────────────
Phase P2-a: SimulatorShell test
Phase P2-b: Panel tests (6 files)
Phase P2-c: Camera test
Phase P2-d: Remaining rendering tests
Phase P2-e: Partially-tested module expansion
────────────────────────────────────
Phase P3-a: Integration tests
Phase P3-b: Property-based tests
Phase P3-c: Fuzz tests
Phase P3-d: Edge case expansion
Phase P3-e: Benchmark tests
```

## Acceptance criteria (global)

- `npm test` passes with all ~350 new tests green.
- `npm run format:check` and `npm run lint` pass.
- Coverage >= 85% for all P0-P2 targeted modules.
- No canvas/DOM leaks into unit tests.
- All new tests are deterministic (no flaky assertions).

## Gotchas

- **`KeyboardManager`** — Must mock `ShortcutsToolbarElement` (a custom element). Create minimal mock with `setShortcuts`, `flash`, `setActive`, `setToggleHandler` methods. Do NOT use `window` event listener removal in `afterEach` (test isolation via fresh `KeyboardManager` instance per test).
- **`GraphEditor`** — Requires mock `Viewport` with `getMouse`/`getOffset` methods returning `Point`. Test via dispatched `MouseEvent` on the canvas or by directly exercising `#handleMouseDown`/`#handleMouseMove` via object introspection.
- **`WorldEditor`** — Complex initialization (6+ editors, 7+ toolbar elements). Test in isolation with factory helpers.
- **`storageManager`** — `downloadCarFiles` creates DOM elements (`<a>`), `Blob`, `URL.createObjectURL`. Mock these with `vi.stubGlobal`.
- **`SoundEngine`** — Mock `AudioContext` classes including `OscillatorNode`, `GainNode`, `AudioDestinationNode`. Verify method calls, not real audio.
- **`SimulatorShell`** — Abstract class; create `class TestShell extends SimulatorShell { update() {} draw() {} }` for testing.
- **`updateWorldCars`** — Uses `SpatialHashGrid` and `TrafficControlGrid`. Create test grids with known values for predictable results.
- **Property-based tests** — Avoid `fast-check` dependency (no npm packages). Use hand-written loops with `mulberry32` seeded PRNG instead.
- **Edge case expansion** — Extend existing test files, do NOT create new files for edge cases.
- **Benchmark tests** — Use `vitest` `{ retry: 0 }` config for accurate timing. Time assertions use generous thresholds (CI may be slower).

## Docs to update

- `AGENTS.md` — If new testing patterns are established (property-based, fuzz, benchmark test categories).
