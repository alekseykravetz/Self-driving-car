# World Editor Road Properties Panel

**Date:** 2026-07-24
**Slug:** world-editor-road-panel
**Elicited from:** "Our OSM importer can now create many road types with metadata, but the World Editor panel only provides limited functionality. The shortcuts panel is too crowded. Remove the duplicated shortcuts from the world editor's shortcuts panel and improve the World Editor panel to allow creating all the new road types as well as the old ones from the shortcut panel."

## Core Intent

Replace the world editor's limited editor toolbar and overcrowded shortcuts toolbar with a new organism-level `<world-editor-panel>` that lets users select road types (motorway, trunk, primary, etc.) and set road metadata (lanes, one-way, hard-separation, name, maxSpeed, ref, bridge, laneMarkings) when drawing roads by hand. The panel also absorbs the O/H/T toggle controls from the shortcuts toolbar (moving them out of the shortcuts panel entirely), while the shortcuts toolbar retains only the S/E/C momentary path tools and the Ctrl display key. A new "inspect" editor mode lets users click an existing segment to view and edit its metadata. The shortcuts toolbar is NOT removed from world.html — it stays but is decluttered (O/H/T removed, S/E/C/Ctrl retained).

## Scope

### Entry Points Affected

- `html/world.html` — the world editor page (adds the new panel, keeps a trimmed shortcuts toolbar)
- Shared `ts/` modules (new organism, modified molecules, modified world editor + graph editor)

### Layers Affected

- `ts/ui/organisms/` — new `<world-editor-panel>` custom element
- `ts/ui/molecules/` — modified `editorToolbar` (add inspect mode button), modified `shortcutsToolbar` (O/H/T removed from world editor's binding set)
- `ts/world/editors/` — modified `worldEditor.ts` (wire panel, add inspect editor), modified `graphEditor.ts` (consume brush state, pass metadata to Segment constructor, enhanced intent badge)
- `ts/world/editors/` — new `inspectEditor.ts` (segment selection + metadata editing)
- `ts/simulator/types.ts` — add `'inspect'` to `EditorType` union
- `ts/math/primitives/segment.ts` — no change (already supports metadata 5th arg)
- `ts/input/keyboardManager.ts` — no change to the manager itself; O/H/T bindings stay but their toggle visual state is driven by the new panel instead of the shortcuts toolbar
- `styles/organisms/` — new `_world-editor-panel.css`
- `styles/index.css` — register the new organism CSS
- `styles/templates/_world-editor.css` — layout for the new panel position
- `tests/unit/` — new test files for panel logic + inspect editor
- `tests/visual/baselines/` — updated world editor baseline screenshots

### Change Type

- **Both** — Visual: new panel UI with collapsible sections, dropdowns, toggles, number inputs. Behavioral: graph editor can now set highwayType/lanes/etc. on hand-drawn segments; new inspect mode for editing existing segment metadata.

### Backward Compatibility

- **Fully preserved.** Old `.world` files (without metadata) load and work exactly as before. New metadata is optional on Segment (all fields are `undefined` by default). Hand-drawn segments without a selected road type default to the original 2-lane residential behavior. No localStorage schema change.

### Persistence

- **Nothing new.** Road metadata (highwayType, lanes, etc.) is already serialized on `Segment` via `JSON.stringify` (enumerable optional properties). No new localStorage key needed — the panel resets to defaults each session.

## User's Answers (Raw)

### Pass 1 — Core Intent

| Question             | Answer                                                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| One-sentence summary | Expand editor panel + remove shortcuts (the duplicated O/H/T shortcuts from the shortcuts panel; move them into the new editor panel) |
| Entry points         | world.html + shared ts/                                                                                                               |
| Layers               | "I don't know" — planner to determine from codebase analysis                                                                          |
| Behavioral/visual    | Both                                                                                                                                  |
| Persistence          | Nothing new (road metadata already serialized on Segment)                                                                             |
| Backward compat      | Yes, fully preserved                                                                                                                  |
| Brain scope          | No — purely a world-editor UI feature                                                                                                 |

### Pass 2 — Deep Dive

| Question                    | Answer                                                                                                                                                                                                                                                           |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Settable metadata fields    | Core + signage fields: highwayType, lanes, oneWay, separated, name, maxSpeed, ref, bridge, laneMarkings                                                                                                                                                          |
| Edit existing segments      | New + edit existing — can click an existing segment to select it and change its metadata via the panel                                                                                                                                                           |
| Shortcut integration        | S/E/C are one-touch momentary shortcuts that work on whatever the mouse is hovering — keep those in the shortcuts panel. Move O/H/T out of the shortcuts panel into the new editor panel. Just remove the duplicated shortcuts (O/H/T) from the shortcuts panel. |
| KeyboardManager integration | O/H/T will no longer live in the shortcuts panel — they move to the new panel                                                                                                                                                                                    |
| Panel architecture          | New organism panel (like trainingPanel)                                                                                                                                                                                                                          |
| Road type implications      | Auto-set with override — selecting 'motorway' auto-enables one-way and sets lanes=4, but user can override afterward                                                                                                                                             |
| Panel state memory          | Reset to defaults each session — no persistence needed                                                                                                                                                                                                           |

### Pass 3 — Edge Cases & Forgotten Dimensions

| Question                  | Answer                                                                                                                                                                                                            |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Segment selection UX      | New "inspect" mode (new EditorType). Also: maybe show the segment by single selected point (from p1 to p2) — when a point is selected, the panel could show/edit the metadata of segments connected to that point |
| Intent badge enhancement  | Yes, show road type in the intent badge (e.g. 'Motorway · 4 lanes · 145m · 32°')                                                                                                                                  |
| Immediate visual feedback | Immediate (on next draw frame) — but only if it doesn't break the current implementation or is very hard to implement. Flag as preferred-but-flexible.                                                            |
| Dropdown implementation   | Native `<select>` element styled with tokens                                                                                                                                                                      |
| Panel collapsibility      | Collapsible sections (Road Type, Properties, Path Tools groups can be folded)                                                                                                                                     |
| Mobile support            | Desktop only — no special mobile treatment needed                                                                                                                                                                 |
| Visual test baselines     | Yes, update baselines — expected and acceptable                                                                                                                                                                   |

### Pass 3b — Codebase-Specific Gotchas

| Question               | Answer                                                                                                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CSS architecture       | Reuse existing molecule styles (toggle-row, num-input-row, collapsible, btn-group) + new organism CSS file for the panel shell                                       |
| Panel→editor data flow | Callback/listener pattern — panel exposes brush state via a listener; WorldEditor wires it to the graph editor                                                       |
| Inspect mode type      | New EditorType 'inspect' — add to the union, gets its own editor button and editor class                                                                             |
| KeyboardManager wiring | Remove O/H/T completely from the shortcuts panel and move them to the new panel. (Panel manages O/H/T toggle state; KeyboardManager routes key events via bindings.) |
| Test scope             | Pure logic + DOM tests — unit test brush state and road-type default mapping (pure logic) plus DOM-level tests for the custom element                                |

## Constraints & Architecture Rules

- **Atomic Design** (AGENTS.md § UI Architecture): The new panel is an organism in `ts/ui/organisms/` with CSS in `styles/organisms/_world-editor-panel.css`, registered in `styles/index.css`. It composes existing molecule styles (toggle-row, num-input-row, collapsible, btn-group) for inner controls.
- **No raw hex/rgba** (AGENTS.md § UI Architecture): Use `var(--color-*)` tokens from `tokens.css` for all colors in the new panel.
- **No raw px for spacing/fonts/radii** (AGENTS.md § UI Architecture): Use `var(--space-*)`, `var(--text-*)`, `var(--radius-*)` tokens.
- **KeyboardManager** (AGENTS.md § Centralised keyboard manager): No `window.addEventListener`. O/H/T bindings stay in KeyboardManager but their visual state is driven by the new panel, not the shortcuts toolbar. The shortcuts toolbar remains the km's ToolbarUpdater target for S/E/C/Ctrl.
- **Editors use push/pop lifecycle** (AGENTS.md § Editors use push/pop lifecycle): The new inspect editor must follow the same `km.pushBindings()`/`km.popBindings()` pattern as GraphEditor and CorridorEditor.
- **Import paths use `.js` extensions** (AGENTS.md § Key gotchas): All imports use `.js` extensions even though source is `.ts`.
- **Private members use `#` prefix** (AGENTS.md § Architecture rules): The new panel and inspect editor use `#` private fields.
- **Config constants centralised** (AGENTS.md § Architecture rules): Road-type default lane counts and the highway-type → default mapping already exist in `ts/math/osm-importer/osm.ts` (`defaultLaneCount`). The panel should reuse or extract this mapping rather than duplicating it. Consider extracting to a shared constants module if the OSM importer's `defaultLaneCount` is not importable without pulling OSM parsing code.
- **Domain types isolation** (AGENTS.md § Domain types isolation): `EditorType` is defined in `ts/simulator/types.ts`. Adding `'inspect'` here is correct — do not define it in a UI file.
- **No runtime dependencies** (AGENTS.md § Architecture rules): No npm packages. Native `<select>` element, hand-rolled panel.
- **Segment metadata** (AGENTS.md § Segment OSM metadata): `Segment` already accepts a metadata object as its 5th constructor arg. All fields are optional. `Graph.hash()` folds metadata into its hash so metadata changes trigger road regeneration.
- **Layer isolation** (AGENTS.md § Math-layer type isolation): The road-type default mapping is pure data — if extracted, it must not import from `car/`, `rendering/`, or `neural-network/`.
- **Visual regression tests** (AGENTS.md § Testing): Update `tests/visual/baselines/` for the world editor after implementation via `npm run test:visual:update`.

## Codebase References

### Key files the planner must read

- `ts/ui/molecules/editorToolbar.ts` + `ts/ui/molecules/editorToolbarTemplate.ts` — existing editor mode buttons (needs inspect button added)
- `ts/ui/molecules/shortcutsToolbar.ts` + `ts/ui/molecules/shortcutsToolbarTemplate.ts` — shortcuts toolbar (O/H/T bindings removed from world editor's set)
- `ts/ui/organisms/trainingPanel.ts` — reference organism for the new panel's structure (collapsible sections, custom element pattern)
- `ts/world/editors/worldEditor.ts` — master coordinator (wires panel, adds inspect editor, manages brush state)
- `ts/world/editors/graphEditor.ts` — graph editor (consume brush state, pass metadata to Segment, enhance intent badge)
- `ts/world/editors/corridorEditor.ts` — corridor editor (T toggle moves to panel; reference for push/pop binding pattern)
- `ts/world/editors/markingEditor.ts` — base class for marking editors (reference for the new inspect editor's structure)
- `ts/math/primitives/segment.ts` — Segment class (already supports metadata 5th arg)
- `ts/math/osm-importer/osm.ts` — OSM importer (contains `defaultLaneCount` highway-type → lanes mapping and highway-type list; reference for the dropdown options)
- `ts/simulator/types.ts` — `EditorType` union (add `'inspect'`)
- `ts/input/keyboardManager.ts` — KeyboardManager (ToolbarUpdater interface, ShortcutBinding, push/pop bindings)
- `ts/ui/atoms/latchedToggle.ts` — LatchedToggle (for O/H/T toggle state in the panel)
- `html/world.html` — world editor HTML (add `<world-editor-panel>`, keep trimmed `<shortcuts-toolbar>`)
- `ts/world/entry.ts` — world editor entry point (import new panel module)
- `styles/organisms/_training-panel.css` — reference organism CSS for the new panel
- `styles/molecules/_collapsible.css` — collapsible section styles to reuse
- `styles/molecules/_toggle-row.css` — toggle row styles to reuse
- `styles/molecules/_num-input-row.css` — number input row styles to reuse
- `styles/tokens.css` — design tokens (colors, spacing, typography, radii)
- `styles/index.css` — register the new organism CSS here
- `styles/templates/_world-editor.css` — world editor layout (panel positioning)
- `styles/world.css` — world editor page entry CSS

### Test files

- `tests/unit/panels/editorToolbar.test.ts` — existing editor toolbar tests (reference for DOM test pattern)
- `tests/unit/world/editors/worldEditor.test.ts` — existing world editor tests (update for inspect mode)
- `tests/visual/world.spec.ts` — visual regression spec (update baselines)
- `tests/helpers/` — shared test utilities

### Docs to update (docs-sync step)

- `docs/WorldEditor.md` — document the new panel, inspect mode, road-type selection, brush state
- `docs/Keyboard.md` — document O/H/T moving from shortcuts toolbar to the panel
- `docs/DesignSystem.md` — add the new organism CSS file to the organisms table
- `AGENTS.md` — add conventions for the new panel, inspect mode, brush state pattern

## Open Questions (if any)

1. **Immediate rendering feasibility**: The user wants road type to render immediately (on next draw frame) when drawing by hand, but only if it doesn't break the current implementation. The planner should assess: does `WorldGenerator.generateRoads` already run on every graph hash change in the editor's draw loop? (Yes — `worldEditor.draw()` checks `currentGraphHash !== this.#oldGraphHash` and calls `WorldGenerator.generateRoads`.) Since `Graph.hash()` folds `highwayType`/`lanes` into the hash, setting metadata on a new segment will change the hash and trigger regeneration on the next frame. This should work without extra effort. The planner should verify.

2. **KeyboardManager ToolbarUpdater for O/H/T**: The user said "remove completely O/H/T from shortcuts panel and move to new panel." The cleanest approach: the panel creates its own `LatchedToggle` instances for O/H/T and the KeyboardManager routes key events via the existing `ShortcutBinding` toggle callbacks (`onActivate`/`onDeactivate`). The panel updates its own UI from these callbacks. The shortcuts toolbar remains the km's ToolbarUpdater for S/E/C/Ctrl only. The planner should confirm this doesn't require changes to KeyboardManager itself (it shouldn't — the km already supports toggle bindings with onActivate/onDeactivate callbacks; the ToolbarUpdater is only for visual flash/setActive, which the panel can do internally).

3. **"Show segment by single selected point"**: The user mentioned "maybe we can show the segment by single selected point (from p1 to p2)." This likely means: when a point is selected in graph mode, the panel could show the metadata of segments connected to that point. The planner should decide whether this is part of the inspect mode or an additional feature. If it adds complexity, it can be deferred.

4. **Road-type default mapping location**: The `defaultLaneCount` function in `osm.ts` maps highway types to default lane counts. The panel needs this mapping for auto-set behavior. The planner should decide whether to extract it to a shared module (e.g. `ts/math/roadTypes.ts`) or import it from `osm.ts`. Extracting is cleaner but adds a new file; importing from osm.ts pulls the OSM parsing code into the editor's dependency graph. Recommendation: extract the mapping + highway-type list + fill-color mapping to a shared `ts/math/roadTypes.ts` pure-data module.

## Possible Implementation Approaches

### User-stated preferences

- **Panel as a new organism** (`<world-editor-panel>`), not an expansion of the editor toolbar molecule.
- **Native `<select>`** for the highway-type dropdown (styled with design tokens).
- **Collapsible sections** within the panel (Road Type, Properties, Path Tools groups).
- **Callback/listener pattern** for panel→graph-editor data flow (panel exposes brush state via a listener; WorldEditor wires it).
- **New `EditorType` 'inspect'** for editing existing segments (not a sub-mode of graph).
- **Auto-set with override** for road-type implications (motorway → oneWay=true, lanes=4; user can override).
- **Reset to defaults** each session (no localStorage persistence for panel state).
- **Desktop only** (no mobile-specific treatment).
- **Intent badge shows road type** (e.g. 'Motorway · 4 lanes · 145m · 32°').
- **Immediate rendering** preferred but flexible if it breaks current implementation.
- **O/H/T completely removed from shortcuts toolbar** in world editor; moved to the new panel. S/E/C/Ctrl stay in the shortcuts toolbar.

### Suggested component structure (for planner reference — not prescriptive)

```
ts/ui/organisms/worldEditorPanel.ts          ← <world-editor-panel> custom element
ts/ui/organisms/worldEditorPanelTemplate.ts  ← static HTML template
ts/world/editors/inspectEditor.ts            ← new inspect editor (segment selection)
ts/math/roadTypes.ts                         ← extracted highway-type → lanes/defaults/color mapping (pure data)
styles/organisms/_world-editor-panel.css     ← panel shell + layout
```

### Suggested panel layout (collapsible sections)

1. **Road Type** section: `<select>` dropdown (motorway, trunk, primary, secondary, tertiary, residential, service, living_street, unclassified, track) + auto-set indicator
2. **Properties** section: lanes (number input), oneWay (toggle), separated (toggle), name (text input), maxSpeed (number input), ref (text input), bridge (toggle), laneMarkings (toggle)
3. **Path Tools** section: S/E/C momentary indicators (if these move to the panel too — user said keep S/E/C in shortcuts panel, so this section may not be needed; O/H/T toggles live here instead)

Note: The user said S/E/C stay in the shortcuts panel and O/H/T move to the new panel. So the panel's toggle section would contain O (one-way), H (hard-separation), T (tunnel/corridor) toggles, not S/E/C.
