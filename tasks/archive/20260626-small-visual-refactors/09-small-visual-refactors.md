# Task 09 — Small visual refactors across loaders, toolbars, and training panel

**Effort:** medium · **Priority:** high · **Status:** done · **Branch:** `task-9-small-visual-refactors`

## Problem

Several UI details are inconsistent across world/car loading flows, toolbar variants, and training panel layout:

1. File names are shown with extensions in multiple places, which is noisy for users.
2. The car loader action icon differs from the world loader pattern.
3. Multi-select car summary in world toolbar does not provide a compact aggregate label + full tooltip list.
4. Shortcut toolbar buttons have inconsistent size, and Ctrl width differs between simulator and world editor.
5. Viewport touchpad-mode icon does not match intended semantics.
6. Training panel has dense rows for generation/distance and misses speed information in key places.
7. World editor toolbar button order/labels are not aligned with desired workflow.
8. Documentation may become stale after these changes.

## Goal

Ship a set of small visual refactors to improve consistency and readability without changing core behavior.

## Scope

- Main screen store section
- World toolbar selected section
- World loader popup
- Car loader popup
- Shortcuts toolbar
- World toolbar viewport section
- Training panel and pool table
- Related docs (only where behavior/labels are documented)

## Implementation Steps

### 1. Normalize displayed file names (no extensions)

Apply extension-less display in all relevant UI views for both preloaded and user-loaded assets:

- Main screen store section (world and car entries)
- World toolbar selected section
- World loader popup
- Car loader popup

Rules:

- Keep internal IDs/paths unchanged; only presentation text is changed.
- Strip only the final extension segment from display labels.
- Preserve full original filename in metadata where needed for loading.

### 2. Car loader "load from file" icon parity

- In world toolbar car loader popup, replace the current icon on "load cars from file" with the same regular folder icon style used by world loader popup.
- Keep existing click behavior unchanged.

### 3. Multi-select selected-cars summary + tooltip

In world toolbar selected-cars section:

- If exactly one car is selected: keep existing single-name behavior.
- If multiple cars are selected: show summary text as `N car selected`.
- Tooltip should list all selected car names (extension-less display names).

### 4. Shortcuts toolbar size consistency

- Make all shortcuts toolbar buttons/icons height 32px to match other toolbars.
- Fix Ctrl button width in world editor so it matches simulator visual balance.
- Keep existing hotkey behavior and button ordering unchanged.

### 5. Viewport touchpad mode icon update

- In world toolbar viewport section, replace touchpad mode icon from hand icon to a touchpad icon.
- Keep mode toggle behavior unchanged.

### 6. Training panel layout + speed metrics

- Split `gen` and `dist` into two separate rows (aligned with other metrics rows).
- Add speed of current best car in real units (same unit style used in traffic simulator).
- In pool section table, add `speed` column between `name` and `fitness`.

### 7. World editor toolbar order, storage section, labels, and delete icon

For world toolbar in editor variant, enforce order:

1. World loader
2. Import world from OSM
3. Separator
4. New storage section containing save + delete
5. Remaining existing toolbar sections/buttons

Also:

- Fix incorrect titles/labels for affected toolbar buttons.
- Replace delete-world-from-cache icon with a more compatible icon while keeping action semantics clear.

### 8. Documentation updates

Update docs if they mention any changed UI labels, button order, icons, or panel fields. Candidate docs include:

- `docs/WorldEditor.md`
- `docs/Store.md`
- `docs/Simulators.md`
- `docs/Viewport.md`

Only update sections impacted by actual UI changes.

## Acceptance Criteria

- [x] All world/car file names in listed UI surfaces are shown without extensions.
- [x] Car loader popup uses folder icon consistent with world loader popup.
- [x] Multi-select cars shows `N car selected`; tooltip lists all selected cars.
- [x] All shortcuts toolbar buttons/icons are 32px high.
- [x] Ctrl button width is visually correct in world editor and remains correct in simulator.
- [x] Viewport touchpad mode uses touchpad icon.
- [x] Training panel shows `gen` and `dist` in separate rows.
- [x] Current best car speed is displayed in real units.
- [x] Pool table includes `speed` column between `name` and `fitness`.
- [x] World editor toolbar order matches required sequence.
- [x] Toolbar titles/labels are corrected.
- [x] Delete-world-from-cache icon is updated to a compatible replacement.
- [x] Relevant docs are updated for any changed UI behavior/labels/order.

## Notes

- Keep this task strictly visual/presentation-level unless a minimal data path change is required for speed field wiring.
- Reuse existing helpers/utilities for file name formatting and unit display where available.
- Verify both TS source and generated JS outputs are aligned with project workflow.

## Definition of Done

1. Manual smoke test all updated views (store section, world/car popups, world toolbar, shortcuts toolbar, training panel).
2. Confirm icon parity/order/labels in world editor variant.
3. Confirm multi-select summary and tooltip behavior with 2+ selected cars.
4. Confirm speed values and units match traffic simulator style.
5. Update docs only where actual UI changed.
