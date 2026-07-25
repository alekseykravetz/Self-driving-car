# World Editor Road Properties Panel

**Date:** 2026-07-24
**Slug:** world-editor-road-panel
**Entry points affected:** `html/world.html`
**Save-file impact:** none — road metadata already serialized on `Segment` via enumerable optional properties
**Backward compat:** preserved — old `.world` files without metadata load and work exactly as before; hand-drawn segments without a selected road type default to 2-lane residential behavior

## Goal

Replace the world editor's limited editor toolbar and overcrowded shortcuts toolbar with a new organism-level `<world-editor-panel>` that lets users select road types (motorway, trunk, primary, etc.) and set road metadata (lanes, one-way, hard-separation, name, maxSpeed, ref, bridge, laneMarkings) when drawing roads by hand. The panel absorbs the O/H/T toggle controls from the shortcuts toolbar (moving them out entirely), while the shortcuts toolbar retains only S/E/C momentary path tools and the Ctrl display key. A new "inspect" editor mode lets users click an existing segment to view and edit its metadata. The intent badge in the graph editor shows the selected road type.

## Context (read first)

Read these files before writing any code:

- `/Users/alex/Code/Self-driving-car/AGENTS.md` — § UI Architecture (Atomic Design), § Centralised keyboard manager, § Editors use push/pop lifecycle, § Segment OSM metadata, § Domain types isolation, § Config constants centralised, § Math-layer type isolation
- `/Users/alex/Code/Self-driving-car/ts/simulator/types.ts` — `EditorType` union (add `'inspect'`)
- `/Users/alex/Code/Self-driving-car/ts/ui/molecules/editorToolbar.ts` + `editorToolbarTemplate.ts` — existing editor mode buttons (add inspect button)
- `/Users/alex/Code/Self-driving-car/ts/ui/molecules/shortcutsToolbar.ts` + `shortcutsToolbarTemplate.ts` — shortcuts toolbar (O/H/T removed from world editor's binding set)
- `/Users/alex/Code/Self-driving-car/ts/ui/organisms/trainingPanel.ts` (lines 1-120) + `trainingPanelTemplate.ts` (lines 1-80) — reference organism for the new panel's structure (collapsible sections, custom element pattern)
- `/Users/alex/Code/Self-driving-car/ts/world/editors/worldEditor.ts` — master coordinator (wires panel, adds inspect editor, manages brush state)
- `/Users/alex/Code/Self-driving-car/ts/world/editors/graphEditor.ts` — graph editor (consume brush state, pass metadata to Segment, enhance intent badge). Note the `#selectPoint` method at line 245 creates `new Segment(this.#selected, point, this.#isOneWay, this.#isSeparated)` — this is where metadata must be injected.
- `/Users/alex/Code/Self-driving-car/ts/world/editors/corridorEditor.ts` — corridor editor (T toggle moves to panel; reference for push/pop binding pattern)
- `/Users/alex/Code/Self-driving-car/ts/world/editors/markingEditor.ts` — base class for marking editors (reference for the new inspect editor's structure)
- `/Users/alex/Code/Self-driving-car/ts/math/primitives/segment.ts` — Segment class (already supports metadata 5th arg; constructor signature at line 32)
- `/Users/alex/Code/Self-driving-car/ts/math/osm-importer/osm.ts` (lines 95-133) — `defaultLaneCount` function (to be extracted to shared module)
- `/Users/alex/Code/Self-driving-car/ts/world/roadTiers.ts` — `HIGHWAY_TIER_RANK` mapping (reference for highway-type list)
- `/Users/alex/Code/Self-driving-car/ts/world/world.ts` (lines 80-107) — `getRoadFillColor` function (to be extracted to shared module)
- `/Users/alex/Code/Self-driving-car/ts/input/keyboardManager.ts` — KeyboardManager (ToolbarUpdater interface, ShortcutBinding, push/pop bindings, `#rebuild` at line 130)
- `/Users/alex/Code/Self-driving-car/ts/ui/atoms/latchedToggle.ts` — LatchedToggle (for O/H/T toggle state in the panel)
- `/Users/alex/Code/Self-driving-car/ts/math/graph/graph.ts` (lines 58-80) — `Graph.hash()` already folds `highwayType`/`lanes`/`name`/`maxSpeed`/`ref`/`bridge`/`layer`/`laneMarkings` into the hash, so metadata changes trigger road regeneration on the next draw frame
- `/Users/alex/Code/Self-driving-car/ts/world/entry.ts` — world editor entry point (import new panel module)
- `/Users/alex/Code/Self-driving-car/html/world.html` — world editor HTML (add `<world-editor-panel>`, keep trimmed `<shortcuts-toolbar>`)
- `/Users/alex/Code/Self-driving-car/styles/index.css` — register the new organism CSS (line 38, after `_world-layers.css`)
- `/Users/alex/Code/Self-driving-car/styles/templates/_world-editor.css` — world editor layout (panel positioning)
- `/Users/alex/Code/Self-driving-car/styles/organisms/_training-panel.css` (lines 1-60) — reference organism CSS
- `/Users/alex/Code/Self-driving-car/styles/molecules/_collapsible.css` — collapsible section styles to reuse
- `/Users/alex/Code/Self-driving-car/styles/molecules/_toggle-row.css` — toggle row styles to reuse
- `/Users/alex/Code/Self-driving-car/styles/molecules/_num-input-row.css` — number input row styles to reuse
- `/Users/alex/Code/Self-driving-car/tests/unit/panels/editorToolbar.test.ts` — existing editor toolbar tests (reference for DOM test pattern)
- `/Users/alex/Code/Self-driving-car/tests/unit/world/editors/worldEditor.test.ts` — existing world editor tests (update for inspect mode)

## Scope

### In scope

- Extract `defaultLaneCount` + `getRoadFillColor` + highway-type list to a shared pure-data module `ts/math/roadTypes.ts`
- New organism `<world-editor-panel>` custom element (`ts/ui/organisms/worldEditorPanel.ts` + `worldEditorPanelTemplate.ts`) with collapsible sections: Road Type (dropdown), Properties (lanes, oneWay, separated, name, maxSpeed, ref, bridge, laneMarkings), Path Tools (O/H/T toggles)
- New `InspectEditor` class (`ts/world/editors/inspectEditor.ts`) for selecting and editing existing segment metadata
- Add `'inspect'` to `EditorType` union in `ts/simulator/types.ts`
- Add inspect button to `editorToolbarTemplate.ts`
- Modify `GraphEditor` to consume brush state (road metadata) from the panel and pass it to the `Segment` constructor; enhance intent badge to show road type
- Move O/H/T toggle bindings from `GraphEditor`/`CorridorEditor` into the panel; remove them from the shortcuts toolbar in the world editor
- Wire the panel into `WorldEditor` (brush state callback, inspect editor instantiation, O/H/T toggle state)
- Add `<world-editor-panel>` to `html/world.html`
- New CSS file `styles/organisms/_world-editor-panel.css`, registered in `styles/index.css`
- Panel positioning in `styles/templates/_world-editor.css`
- New unit tests for brush state logic, road-type default mapping, and the panel custom element
- Update existing `worldEditor.test.ts` for inspect mode
- Update visual regression baselines

### Out of scope

- Mobile-specific panel treatment (desktop only)
- Persisting panel state to localStorage (resets to defaults each session)
- "Show segment by single selected point" feature (deferred — adds complexity, not essential)
- Changes to `Segment` class itself (already supports metadata)
- Changes to `KeyboardManager` itself (existing toggle binding callbacks are sufficient)
- Changes to `Graph.hash()` (already folds metadata)

## Implementation

### Phase 1 — Extract shared road-type data module

#### `ts/math/roadTypes.ts` (new file)

- Create a pure-data module with no imports from `car/`, `rendering/`, or `neural-network/` (AGENTS.md § Math-layer type isolation).
- Export `ROAD_TYPES` — an array of highway-type strings suitable for the dropdown: `['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'residential', 'service', 'living_street', 'unclassified', 'track']`. Do NOT include `_link` variants in the dropdown (those are OSM-import only).
- Export `defaultLaneCount(highwayType: string | undefined, oneWay: boolean): number` — move the function body from `osm.ts` lines 95-133 verbatim. The OSM importer's `parseRoads` method should import from this new module instead of defining it locally.
- Export `getRoadFillColor(highwayType: string | undefined): string` — move the function body from `world.ts` lines 81-107. `World` should import from this new module instead of defining it locally.
- Export `ROAD_TYPE_LABELS: Record<string, string>` — human-readable labels for the dropdown: `{ motorway: 'Motorway', trunk: 'Trunk', primary: 'Primary', secondary: 'Secondary', tertiary: 'Tertiary', residential: 'Residential', service: 'Service', living_street: 'Living Street', unclassified: 'Unclassified', track: 'Track' }`.
- Export `applyRoadTypeDefaults(highwayType: string | undefined): { lanes: number; oneWay: boolean }` — returns the auto-set values for a given road type: motorway → `{ lanes: 4, oneWay: true }`, trunk → `{ lanes: 4, oneWay: false }`, service → `{ lanes: 1, oneWay: false }`, living_street → `{ lanes: 1, oneWay: false }`, track → `{ lanes: 1, oneWay: false }`, others → `{ lanes: 2, oneWay: false }`. This is the "auto-set with override" behavior.

#### `ts/math/osm-importer/osm.ts` (modify)

- Remove the local `defaultLaneCount` function definition (lines 95-133).
- Add `import { defaultLaneCount } from '../roadTypes.js';` at the top.
- No other changes — the function signature and behavior are identical.

#### `ts/world/world.ts` (modify)

- Remove the local `getRoadFillColor` function (lines 81-107).
- Add `import { getRoadFillColor } from '../math/roadTypes.js';` at the top.
- Replace the call site (line 82 area, inside `#drawRoadFills` or wherever it's called) to use the imported function. The function currently takes a `Segment` and switches on `seg.highwayType`; the extracted version takes `highwayType: string | undefined` directly, so update the call site to pass `seg.highwayType`.

### Phase 2 — Add 'inspect' to EditorType

#### `ts/simulator/types.ts` (modify)

- Add `'inspect'` to the `EditorType` union (after `'yield'`):
  ```typescript
  export type EditorType =
    | 'graph'
    | 'marking'
    | 'stop'
    | 'crossing'
    | 'start'
    | 'parking'
    | 'light'
    | 'target'
    | 'corridor'
    | 'yield'
    | 'inspect';
  ```

### Phase 3 — New InspectEditor

#### `ts/world/editors/inspectEditor.ts` (new file)

- Follow the push/pop binding lifecycle (AGENTS.md § Editors use push/pop lifecycle).
- Structure mirrors `MarkingEditor` but does NOT extend it (different interaction model — selects segments, not markings).
- Imports: `Viewport`, `World`, `Point`, `Segment`, `getNearestSegment` from `../math/utils.js`, `KeyboardManager`/`ShortcutBinding` from `../../input/keyboardManager.js`, `drawSegment` from `../../rendering/segmentRenderer.js`.
- Class `InspectEditor`:
  - `#viewport: Viewport`, `#world: World`, `#canvas: HTMLCanvasElement`, `#ctx: CanvasRenderingContext2D`
  - `#mouse: Point | null = null`, `#selectedSegment: Segment | null = null`, `#hoveredSegment: Segment | null = null`
  - `#onSegmentSelected: ((segment: Segment | null) => void) | null = null` — callback to notify the panel when a segment is selected/deselected
  - `#keyboardManager: KeyboardManager | null = null`
  - Bound event handlers for mousedown, mousemove, contextmenu (same pattern as `MarkingEditor`)
  - `#bindings: ShortcutBinding[]` — empty or minimal (no keyboard shortcuts needed for inspect mode; could have Escape to deselect)
  - Constructor takes `(viewport: Viewport, world: World)`.
  - `bindKeyboard(km: KeyboardManager): void` — stores the km reference.
  - `enable(): void` — adds event listeners, pushes bindings (if any).
  - `disable(): void` — removes event listeners, pops bindings, clears `#selectedSegment`, `#hoveredSegment`, calls `#onSegmentSelected(null)`.
  - `setOnSegmentSelected(cb: (segment: Segment | null) => void): void` — stores the callback.
  - `#handleMouseMove(e: MouseEvent): void` — updates `#mouse`, finds nearest segment within `10 * viewport.zoom` threshold using `getNearestSegment`, stores in `#hoveredSegment`.
  - `#handleMouseDown(e: MouseEvent): void`:
    - Left-click: if `#hoveredSegment` exists, set `#selectedSegment = #hoveredSegment`, call `#onSegmentSelected(#selectedSegment)`. If no hovered segment, deselect: `#selectedSegment = null`, call `#onSegmentSelected(null)`.
    - Right-click: prevent default, deselect if something is selected.
  - `display(): void` — if `#hoveredSegment`, draw it highlighted (e.g. `drawSegment(ctx, seg, { color: 'yellow', width: 4 })`). If `#selectedSegment`, draw it with a stronger highlight (e.g. `color: 'orange', width: 6`).
  - `getSelectedSegment(): Segment | null` — returns `#selectedSegment`.

### Phase 4 — World Editor Panel organism

#### `ts/ui/organisms/worldEditorPanelTemplate.ts` (new file)

- Export `WORLD_EDITOR_PANEL_TEMPLATE` — a static HTML string with three collapsible sections:
  1. **Road Type** section: a `<select id="wepRoadType">` populated with `<option>` elements for each road type (value = highway-type string, text = label from `ROAD_TYPE_LABELS`). Include a default `<option value="">Default (Residential)</option>`. Add an auto-set indicator `<span id="wepAutoSetHint" class="wep-auto-hint">Auto-set: —</span>`.
  2. **Properties** section: use existing molecule CSS classes (`toggle-row`, `num-input-row`, `checkbox-label`):
     - Lanes: `<div class="num-input-row num-input-row-sm">` with `<input type="number" id="wepLanes" value="2" min="1" max="8" step="1">` and +/- buttons.
     - One Way: `<label class="checkbox-label"><input type="checkbox" id="wepOneWay"> One-way</label>`
     - Separated: `<label class="checkbox-label"><input type="checkbox" id="wepSeparated"> Hard separation</label>`
     - Name: `<input type="text" id="wepName" placeholder="Street name">`
     - Max Speed: `<div class="num-input-row num-input-row-sm">` with `<input type="number" id="wepMaxSpeed" min="0" step="5">` and +/- buttons.
     - Ref: `<input type="text" id="wepRef" placeholder="Road ref (e.g. A1)">`
     - Bridge: `<label class="checkbox-label"><input type="checkbox" id="wepBridge"> Bridge</label>`
     - Lane Markings: `<label class="checkbox-label"><input type="checkbox" id="wepLaneMarkings" checked> Lane markings</label>`
  3. **Path Tools** section (O/H/T toggles): three toggle indicators styled like the shortcuts toolbar key indicators:
     - `<span class="key-indicator clickable" id="wepKeyO" data-tooltip="O — One-way road mode">O</span>`
     - `<span class="key-indicator clickable" id="wepKeyH" data-tooltip="H — Hard-separation road mode">H</span>`
     - `<span class="key-indicator clickable" id="wepKeyT" data-tooltip="T — Tunnel (open-ended) corridor mode">T</span>`
- Each section uses the collapsible pattern: `<div class="panel-section wep-section collapsed" id="wepRoadTypeSection">` with a `<div class="section-title section-title-toggle" id="wepRoadTypeToggle">` header containing a `<span class="collapse-caret">▼</span>`. The Road Type section should NOT be collapsed by default (remove `collapsed` class from it). Properties and Path Tools start collapsed.
- The panel root: `<div id="worldEditorPanel" class="wep-panel">`.

#### `ts/ui/organisms/worldEditorPanel.ts` (new file)

- Import `WORLD_EDITOR_PANEL_TEMPLATE` from `./worldEditorPanelTemplate.js`.
- Import `ROAD_TYPES`, `ROAD_TYPE_LABELS`, `applyRoadTypeDefaults` from `../../math/roadTypes.js`.
- Import `LatchedToggle` from `../atoms/latchedToggle.js`.
- Import `Segment` from `../../math/primitives/segment.js` (for the inspect mode — reading segment metadata).

- Define the `BrushState` interface (exported):

  ```typescript
  export interface BrushState {
    highwayType: string | undefined;
    lanes: number;
    oneWay: boolean;
    separated: boolean;
    name: string;
    maxSpeed: number | undefined;
    ref: string;
    bridge: boolean;
    laneMarkings: boolean;
  }
  ```

- Define the `SegmentMetadata` interface (exported) — the metadata read from a selected segment in inspect mode:

  ```typescript
  export interface SegmentMetadata {
    highwayType: string | undefined;
    lanes: number | undefined;
    oneWay: boolean;
    separated: boolean;
    name: string | undefined;
    maxSpeed: number | undefined;
    ref: string | undefined;
    bridge: boolean | undefined;
    laneMarkings: boolean | undefined;
  }
  ```

- Class `WorldEditorPanelElement extends HTMLElement`:

  - `#brushState: BrushState` — defaults: `{ highwayType: undefined, lanes: 2, oneWay: false, separated: false, name: '', maxSpeed: undefined, ref: '', bridge: false, laneMarkings: true }`
  - `#onBrushChange: ((state: BrushState) => void) | null = null`
  - `#onToggleO: ((active: boolean) => void) | null = null`
  - `#onToggleH: ((active: boolean) => void) | null = null`
  - `#onToggleT: ((active: boolean) => void) | null = null`
  - `#toggleO: LatchedToggle`, `#toggleH: LatchedToggle`, `#toggleT: LatchedToggle`
  - `#inspectMode: boolean = false` — when true, the panel shows segment metadata instead of brush state
  - DOM element references (all `| null = null`): `#roadTypeSelect`, `#autoSetHint`, `#lanesInput`, `#oneWayCheck`, `#separatedCheck`, `#nameInput`, `#maxSpeedInput`, `#refInput`, `#bridgeCheck`, `#laneMarkingsCheck`, `#keyO`, `#keyH`, `#keyT`
  - Constructor: `super()`, `this.id = 'worldEditorPanel'`.
  - `connectedCallback(): void` — set `this.innerHTML = WORLD_EDITOR_PANEL_TEMPLATE`, call `#cacheDom()`, `#populateRoadTypeDropdown()`, `#wireEvents()`, `#initToggles()`, `#syncBrushState()`.
  - `#cacheDom(): void` — query all elements by ID, store in fields.
  - `#populateRoadTypeDropdown(): void` — for each type in `ROAD_TYPES`, create an `<option value="${type}">${ROAD_TYPE_LABELS[type]}</option>` and append to `#roadTypeSelect`.
  - `#wireEvents(): void`:
    - `#roadTypeSelect` `change` event → read value, set `#brushState.highwayType` (empty string → `undefined`), call `#applyAutoSet()`, `#syncBrushState()`, `#notifyBrushChange()`.
    - `#lanesInput` `input` event → `#brushState.lanes = parseInt(value, 10) || 2`, `#notifyBrushChange()`.
    - `#oneWayCheck` `change` event → `#brushState.oneWay = checked`, `#notifyBrushChange()`.
    - `#separatedCheck` `change` event → `#brushState.separated = checked`, `#notifyBrushChange()`.
    - `#nameInput` `input` event → `#brushState.name = value`, `#notifyBrushChange()`.
    - `#maxSpeedInput` `input` event → `#brushState.maxSpeed = value ? parseInt(value, 10) : undefined`, `#notifyBrushChange()`.
    - `#refInput` `input` event → `#brushState.ref = value`, `#notifyBrushChange()`.
    - `#bridgeCheck` `change` event → `#brushState.bridge = checked`, `#notifyBrushChange()`.
    - `#laneMarkingsCheck` `change` event → `#brushState.laneMarkings = checked`, `#notifyBrushChange()`.
    - Collapsible section toggles: for each section toggle element (`#wepRoadTypeToggle`, `#wepPropertiesToggle`, `#wepPathToolsToggle`), add `click` listener that toggles the `collapsed` class on the parent `.wep-section`.
  - `#initToggles(): void` — create `LatchedToggle` instances for O, H, T. Wire `setOnChange` to update the `.active` class on the corresponding key indicator and call the respective `#onToggle*` callback. Wire click handlers on `#keyO`, `#keyH`, `#keyT` to call `toggleLatch()` on the corresponding toggle.
  - `#applyAutoSet(): void` — when `#brushState.highwayType` changes, call `applyRoadTypeDefaults(highwayType)`, update `#brushState.lanes` and `#brushState.oneWay` to the defaults, update the DOM inputs (`#lanesInput.value`, `#oneWayCheck.checked`), update `#autoSetHint` text to show the auto-set values (e.g. "Auto-set: 4 lanes, one-way"). Update `#toggleO` to match the auto-set oneWay value via `setToggleActive`-like behavior (set the latch state directly, call `#onToggleO`).
  - `#syncBrushState(): void` — update all DOM inputs from `#brushState` (lanes, oneWay, separated, name, maxSpeed, ref, bridge, laneMarkings).
  - `#notifyBrushChange(): void` — call `#onBrushChange?.(#brushState)`.
  - `getBrushState(): BrushState` — returns a copy of `#brushState`.
  - `setBrushChangeListener(cb: (state: BrushState) => void): void` — stores `#onBrushChange`.
  - `setToggleOListener(cb: (active: boolean) => void): void` — stores `#onToggleO`.
  - `setToggleHListener(cb: (active: boolean) => void): void` — stores `#onToggleH`.
  - `setToggleTListener(cb: (active: boolean) => void): void` — stores `#onToggleT`.
  - `getToggleO(): LatchedToggle` — returns `#toggleO` (for KeyboardManager wiring).
  - `getToggleH(): LatchedToggle` — returns `#toggleH`.
  - `getToggleT(): LatchedToggle` — returns `#toggleT`.
  - `setToggleOActive(active: boolean): void` — programmatically set the O toggle state (used by KeyboardManager binding's `onActivate`/`onDeactivate`).
  - `setToggleHActive(active: boolean): void` — same for H.
  - `setToggleTActive(active: boolean): void` — same for T.
  - `showSegmentMetadata(meta: SegmentMetadata | null): void` — when in inspect mode, populate the panel fields from a selected segment's metadata. If `meta` is null, clear fields and return to brush mode. Set `#inspectMode = meta !== null`. When showing segment metadata, the fields should be editable and changes should write back to the segment (via a separate callback).
  - `setOnMetadataChange(cb: (meta: Partial<SegmentMetadata>) => void): void` — stores a callback fired when the user edits a field while in inspect mode. The callback writes the change back to the selected segment.
  - `resetToDefaults(): void` — resets `#brushState` to defaults, clears all inputs, resets toggles. Called when switching away from inspect mode or starting a new session.
  - `static readonly template = WORLD_EDITOR_PANEL_TEMPLATE`.

- Register: `customElements.define('world-editor-panel', WorldEditorPanelElement);`

### Phase 5 — Modify GraphEditor to consume brush state

#### `ts/world/editors/graphEditor.ts` (modify)

- Add `#brushState: BrushState | null = null` field.
- Add `#onBrushChange: ((state: BrushState) => void) | null = null` — not needed; the editor receives brush state, doesn't emit it.
- Add `setBrushState(state: BrushState): void` — stores `#brushState`. Called by `WorldEditor` when the panel's brush state changes.
- Modify `#selectPoint` (line 245): when creating a new `Segment`, pass the metadata from `#brushState` as the 5th constructor arg:
  ```typescript
  const metadata = this.#brushState
    ? {
        highwayType: this.#brushState.highwayType,
        name: this.#brushState.name || undefined,
        lanes: this.#brushState.lanes,
        maxSpeed: this.#brushState.maxSpeed,
        ref: this.#brushState.ref || undefined,
        bridge: this.#brushState.bridge || undefined,
        laneMarkings: this.#brushState.laneMarkings ? undefined : false,
      }
    : undefined;
  this.#graph.tryAddSegment(
    new Segment(
      this.#selected,
      point,
      this.#isOneWay,
      this.#isSeparated,
      metadata,
    ),
  );
  ```
  Note: `oneWay` and `separated` are still passed as the 3rd/4th args (they're not metadata fields). The panel's O/H toggles drive `#isOneWay` and `#isSeparated` via the existing toggle binding callbacks.
- Remove the `keyO` and `keyH` bindings from `#buildBindings()` (lines 147-181). These are now managed by the panel. The `#isOneWay` and `#isSeparated` fields are now set by `WorldEditor` wiring the panel's toggle callbacks to `graphEditor.setOneWay(active)` / `graphEditor.setSeparated(active)`.
- Add `setOneWay(value: boolean): void` — sets `#isOneWay = value`.
- Add `setSeparated(value: boolean): void` — sets `#isSeparated = value`.
- Keep the S/E/C momentary bindings (lines 103-146) — these stay in the shortcuts toolbar.
- Enhance `#drawIntentMeasurements` (line 305): include the road type in the label. If `#brushState?.highwayType` is set, prepend the road type label: `${ROAD_TYPE_LABELS[highwayType] ?? highwayType} · ${lanes} lanes · ${formatMetersFromWorldPixels(lengthPx)} · ${formatDegrees(angle)}`. If no highway type, keep the existing label format. Import `ROAD_TYPE_LABELS` from `../../math/roadTypes.js`.

### Phase 6 — Modify CorridorEditor to consume panel toggle

#### `ts/world/editors/corridorEditor.ts` (modify)

- Remove the `keyT` binding from `#buildBindings()` (lines 82-102). The T toggle is now managed by the panel.
- Add `setOpen(value: boolean): void` — sets `#isOpen = value`. Called by `WorldEditor` wiring the panel's T toggle callback.
- The `bindKeyboard` method stays (for potential future bindings), but `#bindings` becomes an empty array `[]`.

### Phase 7 — Wire panel into WorldEditor

#### `ts/world/editors/worldEditor.ts` (modify)

- Import `WorldEditorPanelElement` from `../../ui/organisms/worldEditorPanel.js`.
- Import `InspectEditor` from `./inspectEditor.js`.
- Import `BrushState` type from `../../ui/organisms/worldEditorPanel.js`.
- Add `#worldEditorPanel: WorldEditorPanelElement` field.
- Add `#inspectEditor: InspectEditor` field.
- In `#assignElementReferences()`: add `this.#worldEditorPanel = document.querySelector('world-editor-panel') as WorldEditorPanelElement;`
- In `#addEventListeners()`:
  - Wire the panel's brush change listener: `this.#worldEditorPanel.setBrushChangeListener((state) => { this.#editors.graph.setBrushState(state); });`
  - Wire the panel's O toggle: `this.#worldEditorPanel.setToggleOListener((active) => { (this.#editors.graph as GraphEditor).setOneWay(active); });`
  - Wire the panel's H toggle: `this.#worldEditorPanel.setToggleHListener((active) => { (this.#editors.graph as GraphEditor).setSeparated(active); });`
  - Wire the panel's T toggle: `this.#worldEditorPanel.setToggleTListener((active) => { (this.#editors.corridor as CorridorEditor).setOpen(active); });`
  - Wire the panel's metadata change callback for inspect mode: `this.#worldEditorPanel.setOnMetadataChange((meta) => { this.#applyMetadataToSelectedSegment(meta); });`
- In `initializeEditors()`:
  - Create the inspect editor: `const inspectEditor = new InspectEditor(viewport, world); inspectEditor.bindKeyboard(this.#keyboardManager);`
  - Add `inspect: inspectEditor` to the `tools` object.
  - Wire the inspect editor's segment-selected callback: `inspectEditor.setOnSegmentSelected((segment) => { if (segment) { this.#worldEditorPanel.showSegmentMetadata({ highwayType: segment.highwayType, lanes: segment.lanes, oneWay: segment.oneWay, separated: segment.separated, name: segment.name, maxSpeed: segment.maxSpeed, ref: segment.ref, bridge: segment.bridge, laneMarkings: segment.laneMarkings }); } else { this.#worldEditorPanel.showSegmentMetadata(null); } });`
- Add `#applyMetadataToSelectedSegment(meta: Partial<SegmentMetadata>): void` — gets the selected segment from `#inspectEditor.getSelectedSegment()`, applies the metadata fields to the segment, and lets the next draw frame's hash check trigger regeneration. Only called when in inspect mode.
- In `setMode(mode)`: when switching to 'inspect', the panel enters inspect mode (showSegmentMetadata with the current selection or null). When switching away from 'inspect', call `this.#worldEditorPanel.resetToDefaults()` to return to brush mode.
- The KeyboardManager's root bindings (line 208) stay the same (Ctrl display key only). The O/H/T bindings are no longer pushed by the graph/corridor editors — they're managed by the panel's own `LatchedToggle` instances. The panel needs to receive keyboard events for O/H/T. Two approaches:

  - **Approach A (preferred):** The `WorldEditor` creates O/H/T `ShortcutBinding`s with `kind: 'toggle'` and `toggle: { onActivate: () => this.#worldEditorPanel.setToggleOActive(true), onDeactivate: () => this.#worldEditorPanel.setToggleOActive(false) }`, and pushes them via `km.pushBindings()` when the graph editor is enabled, pops when disabled. But this would show them in the shortcuts toolbar again.
  - **Approach B (chosen):** The `WorldEditor` adds O/H/T as root bindings to the KeyboardManager (so they're always active in the world editor), but the shortcuts toolbar only renders bindings that are passed to `setShortcuts()`. Since the km's `#rebuild()` calls `this.#toolbar.setShortcuts(defs)` with ALL bindings, O/H/T would appear in the shortcuts toolbar. To prevent this, add a `hidden: boolean` field to `ShortcutBinding` (optional, default `false`). When `hidden: true`, the binding is active (key events routed) but NOT included in the `defs` array passed to `setShortcuts()`. This is a minimal addition to `KeyboardManager`.
  - **Approach C (simplest, chosen instead):** Don't route O/H/T through the KeyboardManager at all. The panel creates its own `LatchedToggle` instances and listens for keydown/keyup on `window` directly for O/H/T keys. This violates the "no raw window listeners" convention. NOT acceptable.
  - **Approach D (chosen — cleanest):** Add a `hidden?: boolean` field to `ShortcutBinding` in `keyboardManager.ts`. In `#rebuild()`, filter out hidden bindings from the `defs` array passed to `setShortcuts()`, but still create `LatchedToggle` instances for them and still route key events. The O/H/T bindings are pushed by the graph/corridor editors as before (via `pushBindings`), but with `hidden: true`. The panel's toggle state is synced via the binding's `onActivate`/`onDeactivate` callbacks, which call `panel.setToggleOActive(true/false)` etc. The panel's click-to-latch UI calls `km.setToggleActive('keyO', true)` to latch the toggle programmatically.

  **Final decision: Approach D.** This is the cleanest — it reuses the existing KeyboardManager infrastructure, respects the "no raw listeners" convention, and only adds a `hidden` field to the binding interface.

#### `ts/input/keyboardManager.ts` (modify)

- Add `hidden?: boolean` to the `ShortcutBinding` interface (after `latchOnly?`):
  ```typescript
  /**
   * When true, the binding is active (key events routed, toggle state managed)
   * but NOT rendered in the shortcuts toolbar. Used by the world editor panel
   * to move O/H/T toggles out of the shortcuts toolbar into the panel.
   */
  hidden?: boolean;
  ```
- In `#rebuild()` (line 130), when building the `defs` array, filter out hidden bindings:
  ```typescript
  const defs: ShortcutDef[] = this.#allBindings
    .filter((b) => !b.hidden)
    .map((b) => ({ ... }));
  ```
  The `LatchedToggle` creation loop (line 147) should NOT filter — hidden toggle bindings still get toggles. The key event routing in `#handleKeyDown`/`#handleKeyUp` should NOT filter — hidden bindings still receive events.

#### `ts/world/editors/graphEditor.ts` (modify — updated for Approach D)

- Keep the `keyO` and `keyH` bindings in `#buildBindings()`, but add `hidden: true` to each:
  ```typescript
  {
    id: 'keyO',
    key: 'o',
    // ...
    kind: 'toggle',
    hidden: true,
    toggle: {
      onActivate: () => { this.#isOneWay = true; this.#onToggleChange?.('O', true); },
      onDeactivate: () => { this.#isOneWay = false; this.#onToggleChange?.('O', false); },
    },
  },
  ```
- Add `#onToggleChange: ((key: string, active: boolean) => void) | null = null` field.
- Add `setOnToggleChange(cb: (key: string, active: boolean) => void): void` — stores the callback. `WorldEditor` wires this to `panel.setToggleOActive(active)` / `panel.setToggleHActive(active)`.
- The panel's click-to-latch calls `km.setToggleActive('keyO', true)` which latches the toggle, firing `onActivate`, which sets `#isOneWay = true` and calls `#onToggleChange('O', true)`, which calls `panel.setToggleOActive(true)` to update the panel's visual state. This creates a circular update — to prevent it, `setToggleOActive` should check if the toggle is already in the desired state before setting (the `LatchedToggle` already does this — `setPhysicalHold` and `toggleLatch` both check for no-op).

#### `ts/world/editors/corridorEditor.ts` (modify — updated for Approach D)

- Keep the `keyT` binding, add `hidden: true`.
- Add `#onToggleChange` callback, same pattern as graph editor.
- The `onActivate`/`onDeactivate` callbacks call `#onToggleChange('T', active)`.

#### `ts/world/editors/worldEditor.ts` (modify — wiring)

- After creating the graph editor in `initializeEditors()`:
  ```typescript
  graphEditor.setOnToggleChange((key, active) => {
    if (key === 'O') this.#worldEditorPanel.setToggleOActive(active);
    if (key === 'H') this.#worldEditorPanel.setToggleHActive(active);
  });
  ```
- After creating the corridor editor:
  ```typescript
  corridorEditor.setOnToggleChange((key, active) => {
    if (key === 'T') this.#worldEditorPanel.setToggleTActive(active);
  });
  ```
- The panel's O/H/T click-to-latch handlers need to call `km.setToggleActive('keyO'/'keyH'/'keyT', true/false)`. So the panel needs a reference to the KeyboardManager. Add `setKeyboardManager(km: KeyboardManager): void` to `WorldEditorPanelElement`. The panel stores it and uses it in the click handlers. Alternatively, `WorldEditor` wires the panel's toggle listeners to call `km.setToggleActive`:

  ```typescript
  this.#worldEditorPanel.setToggleOListener((active) => {
    this.#keyboardManager.setToggleActive('keyO', active);
  });
  ```

  This is cleaner — the panel doesn't need to know about the km. The panel's `LatchedToggle` handles the visual state, and the listener notifies the km to sync the binding's toggle state. But wait — the km's `setToggleActive` calls `toggle.toggleLatch()` which fires `onChange` which calls `onActivate`/`onDeactivate` which calls `graphEditor.setOnToggleChange` callback which calls `panel.setToggleOActive` which... could loop. The `LatchedToggle.toggleLatch()` checks `if (this.#latched === !this.#latched)` — no, it doesn't, it just flips. But `setToggleActive` checks `if (toggle.active !== active)` before calling `toggleLatch()`. So if the panel's toggle is already active and the km tries to set it active, it's a no-op. The panel's `setToggleOActive` should also be a no-op if already in that state. So the loop is broken by the no-op checks on both sides.

  **Simplified wiring:**

  - Panel click on O → panel's `LatchedToggle.toggleLatch()` → `onChange(true)` → `#onToggleO(true)` → `km.setToggleActive('keyO', true)` → km's `LatchedToggle.toggleLatch()` → `onChange(true)` → `onActivate()` → `graphEditor.#isOneWay = true` + `#onToggleChange('O', true)` → `panel.setToggleOActive(true)` → panel's `LatchedToggle` is already active → no-op. Loop broken.
  - Key press O → km's `LatchedToggle.setPhysicalHold(true)` or `toggleLatch()` → `onChange(true)` → `onActivate()` → `graphEditor.#isOneWay = true` + `#onToggleChange('O', true)` → `panel.setToggleOActive(true)` → panel's `LatchedToggle` sets to active. No loop back to km because `setToggleOActive` only updates the panel's own toggle, doesn't call `km.setToggleActive`.

  So the panel's `setToggleOActive` should directly set the panel's `LatchedToggle` state (not call `km.setToggleActive`). And the panel's click handler should call `km.setToggleActive` (via the listener). This breaks the loop.

  **Final wiring in WorldEditor:**

  ```typescript
  // Panel toggle → km sync
  this.#worldEditorPanel.setToggleOListener((active) =>
    this.#keyboardManager.setToggleActive('keyO', active),
  );
  this.#worldEditorPanel.setToggleHListener((active) =>
    this.#keyboardManager.setToggleActive('keyH', active),
  );
  this.#worldEditorPanel.setToggleTListener((active) =>
    this.#keyboardManager.setToggleActive('keyT', active),
  );

  // Editor toggle change → panel visual sync
  graphEditor.setOnToggleChange((key, active) => {
    if (key === 'O') this.#worldEditorPanel.setToggleOActive(active);
    if (key === 'H') this.#worldEditorPanel.setToggleHActive(active);
  });
  corridorEditor.setOnToggleChange((key, active) => {
    if (key === 'T') this.#worldEditorPanel.setToggleTActive(active);
  });
  ```

### Phase 8 — HTML and CSS

#### `html/world.html` (modify)

- Add `<world-editor-panel></world-editor-panel>` inside the `#simulatorToolbar` div, after `<world-layers-toolbar>`:
  ```html
  <div id="simulatorToolbar">
    <world-toolbar></world-toolbar>
    <shortcuts-toolbar></shortcuts-toolbar>
    <world-layers-toolbar></world-layers-toolbar>
    <world-editor-panel></world-editor-panel>
  </div>
  ```

#### `ts/world/entry.ts` (modify)

- Add import for the new panel: `import '../ui/organisms/worldEditorPanelTemplate.js';` and `import '../ui/organisms/worldEditorPanel.js';` (after the `editorToolbar.js` import, line 59).

#### `styles/organisms/_world-editor-panel.css` (new file)

- Style the panel shell using design tokens (AGENTS.md § No raw hex/rgba, § No raw px):
  - `#worldEditorPanel` / `.wep-panel`: `display: flex; flex-direction: column; background: var(--color-bg-surface); border-radius: var(--radius-md); min-width: 180px; max-width: 220px; width: 200px; flex-shrink: 0; max-height: 80vh; overflow-y: auto;` — positioned by the template CSS.
  - `.wep-section`: `padding: var(--space-2\.5); border-bottom: 1px solid var(--color-border-subtle);`
  - `.wep-section:last-child`: `border-bottom: none;`
  - `.wep-section.collapsed .wep-section-content`: `display: none;` (same pattern as `_collapsible.css`).
  - `.wep-section.collapsed .collapse-caret`: `transform: rotate(0deg);` (collapsed = caret pointing right).
  - `.wep-section:not(.collapsed) .collapse-caret`: `transform: rotate(90deg);` (expanded = caret pointing down).
  - `#wepRoadTypeSelect`: styled native `<select>` with tokens: `width: 100%; padding: var(--space-1) var(--space-1\.5); background: var(--color-bg-input); border: 1px solid var(--color-border-input); border-radius: var(--radius-sm); color: var(--color-text-primary); font-family: var(--font-ui); font-size: var(--text-sm);`
  - `.wep-auto-hint`: `font-size: var(--text-xs); color: var(--color-text-muted); margin-top: var(--space-1);`
  - `.wep-field`: `display: flex; flex-direction: column; gap: var(--space-0\.5); margin-bottom: var(--space-1\.5);`
  - `.wep-field-label`: `font-size: var(--text-xs); color: var(--color-text-dim); text-transform: uppercase; letter-spacing: var(--tracking-wide);`
  - `.wep-text-input`: `width: 100%; padding: var(--space-0\.5) var(--space-1); background: var(--color-bg-input); border: 1px solid var(--color-border-input); border-radius: var(--radius-sm); color: var(--color-text-primary); font-family: var(--font-ui); font-size: var(--text-sm);`
  - `.wep-key-indicators`: `display: flex; gap: var(--space-1);` — reuse `.key-indicator` from `_key-indicator.css`.

#### `styles/index.css` (modify)

- Add `@import './organisms/_world-editor-panel.css';` after line 38 (`@import './organisms/_world-layers.css';`).

#### `styles/templates/_world-editor.css` (modify)

- Add positioning for `world-editor-panel`:
  ```css
  world-editor-panel {
    position: absolute;
    left: var(--space-3);
    top: 50%;
    transform: translateY(-50%);
    z-index: 10;
    max-height: 80vh;
  }
  ```
  This places the panel on the left side of the screen, vertically centered, below the `#simulatorToolbar` (which is at the top). The panel should not overlap the `editor-toolbar` (bottom center) or the minimap (bottom right).

### Phase 9 — Tests

#### `tests/unit/math/roadTypes.test.ts` (new file)

- Test `defaultLaneCount` for all highway types (motorway → 4, trunk → 4, primary → 2, service → 1, etc.).
- Test `getRoadFillColor` for all highway types (motorway → '#888', trunk → '#998877', etc.).
- Test `applyRoadTypeDefaults` for motorway (→ `{ lanes: 4, oneWay: true }`), trunk (→ `{ lanes: 4, oneWay: false }`), service (→ `{ lanes: 1, oneWay: false }`), undefined (→ `{ lanes: 2, oneWay: false }`).
- Test `ROAD_TYPES` array contains expected types and no `_link` variants.
- Test `ROAD_TYPE_LABELS` has a label for every type in `ROAD_TYPES`.

#### `tests/unit/panels/worldEditorPanel.test.ts` (new file)

- `// @vitest-environment jsdom`
- Test `connectedCallback` renders template (panel sections exist).
- Test road type dropdown is populated with all `ROAD_TYPES`.
- Test `getBrushState()` returns defaults after construction.
- Test changing the road type dropdown fires `setBrushChangeListener` with updated `highwayType`.
- Test selecting 'motorway' auto-sets `lanes=4` and `oneWay=true`.
- Test toggling O/H/T indicators fires the respective listeners.
- Test `showSegmentMetadata` populates fields from a metadata object.
- Test `showSegmentMetadata(null)` resets to brush mode.
- Test `resetToDefaults()` clears all fields.

#### `tests/unit/world/editors/inspectEditor.test.ts` (new file)

- Test construction does not throw.
- Test `enable`/`disable` lifecycle (mock canvas events).
- Test `setOnSegmentSelected` callback fires with `null` on disable.
- (Drawing tests are deferred — canvas-dependent, covered by visual tests.)

#### `tests/unit/panels/editorToolbar.test.ts` (modify)

- Add test: the inspect button is rendered with `data-mode="inspect"`.
- Add test: clicking the inspect button fires the mode change listener with `'inspect'`.

#### `tests/unit/world/editors/worldEditor.test.ts` (modify)

- Add `'inspect'` to the `modes` array in the "each editor type can be activated" test (line 547).
- Add `'inspect'` to the `expected` array in the "returns editors object with all required keys" test (line 619).
- Add a mock for `InspectEditor` in the module mocks section (same pattern as the other editor mocks).
- Add a mock for `WorldEditorPanelElement` in the toolbar mocks / querySelectors.

#### `tests/visual/world.spec.ts` (modify)

- Run `npm run test:visual:update` after implementation to update baselines.

## Brain / persistence considerations

None. This is purely a world-editor UI feature. No brain input dimensions change, no localStorage keys are added, no save-file schema changes. Road metadata is already serialized on `Segment` via enumerable optional properties.

## Acceptance criteria

- [ ] Opening `html/world.html` shows the new `<world-editor-panel>` on the left side with three collapsible sections (Road Type, Properties, Path Tools).
- [ ] Selecting a road type from the dropdown auto-sets lanes and one-way defaults (motorway → 4 lanes, one-way) and updates the auto-set hint text.
- [ ] Drawing a road segment in graph mode with a road type selected creates a segment with the correct `highwayType`, `lanes`, and other metadata — the road renders with the correct fill color and width on the next draw frame.
- [ ] The intent badge in graph mode shows the road type (e.g. "Motorway · 4 lanes · 145m · 32°").
- [ ] The O/H/T key indicators in the panel light up when the corresponding keys are pressed or clicked, and the graph/corridor editors respond to the toggle state.
- [ ] The shortcuts toolbar in the world editor shows only S/E/C and Ctrl — O/H/T are no longer rendered there.
- [ ] Switching to inspect mode (clicking the inspect button in the editor toolbar) lets the user click an existing segment to select it; the panel populates with the segment's metadata.
- [ ] Editing metadata fields in inspect mode updates the selected segment, and the road re-renders on the next draw frame.
- [ ] Switching away from inspect mode resets the panel to brush mode (defaults).
- [ ] Old `.world` files without metadata load and work correctly (no regression).
- [ ] `npm run rebuild` succeeds with no TypeScript errors.
- [ ] `npm run fix:all` passes (format + lint).
- [ ] `npm test` passes (all existing + new unit tests).
- [ ] Visual regression baselines are updated via `npm run test:visual:update`.

## Docs to update

- `docs/WorldEditor.md` — document the new panel, inspect mode, road-type selection, brush state pattern, and the O/H/T toggle migration
- `docs/Keyboard.md` — document O/H/T moving from the shortcuts toolbar to the panel, and the new `hidden` binding field
- `docs/DesignSystem.md` — add `_world-editor-panel.css` to the organisms table
- `AGENTS.md` — add conventions for: the new `<world-editor-panel>` organism, the `InspectEditor` push/pop pattern, the `hidden` binding field on `ShortcutBinding`, the `ts/math/roadTypes.ts` shared module, and the brush state data flow pattern
