# OSM Localized Street Names

**Date:** 2026-07-29
**Slug:** osm-localized-names
**Entry points affected:** `html/world.html` (import + editor). Rendered labels appear in every page that draws a `World` (`simulator.html`, `traffic.html`, `race.html`).
**Save-file impact:** Additive optional `Segment` fields (localized names). Old `.world` saves load fine (new fields `undefined`, same as hand-drawn segments), matching how existing OSM metadata fields behave. `Graph.hash()` must fold the new fields so signage caches invalidate on re-import.
**Backward compat:** Preserved. All new fields optional; default display behaviour is unchanged when no preference is set.

## Goal

OSM ways carry names in several languages (`name:en`, `name:he`, `name:ar`,
`name:ru`, plus `alt_name*`). Today the app stores only `name` (primary) and
`nameEn` (English fallback) on `Segment`, and street labels render
`seg.name ?? seg.nameEn`. This task:

1. Parses and stores the additional localized names on `Segment`.
2. Adds a **display-language preference** so street labels can render a chosen
   language (e.g. English, Hebrew, native), falling back gracefully. The
   language dropdown lives in the **world-editor panel**
   (`<world-editor-panel>`), not the world-layers toolbar (decided — see UI).
3. Lets the user **edit the localized names** (`name`, `name:en`, `name:he`,
   `name:ar`, `name:ru`) of a selected segment via the world-editor panel's
   inspect/brush UI, so hand-drawn or corrected roads can carry localized
   labels.

## Background (read first)

- `ts/math/primitives/segment.ts` — the `Segment` class. It already stores
  `name`, `nameEn`, and other OSM metadata (5th constructor arg, a `metadata`
  object). Read the constructor and the metadata type. Add the new localized
  name fields the same way.
- `ts/math/osm-importer/osm.ts` — `Osm.parseRoads()`. In the way loop it already
  reads `name`, `name:en` (`nameEn`), etc. from `way.tags` and passes them in the
  `metadata` object to `new Segment(...)`. Add the new tags here.
- `ts/math/graph/graph.ts` — `Graph.load()` (restores metadata after endpoint
  reconstruction) and `Graph.hash()` (folds metadata per-char so signage caches
  invalidate). Both must include the new fields — follow the existing `name` /
  `nameEn` handling exactly.
- `ts/world/roadSignage.ts` — `computeStreetLabelPlacements()`. The label text is
  chosen by the local `displayNameOf(seg) = seg.name ?? seg.nameEn` function
  (~line 221). This is the single point where language selection is applied.
- `ts/world/world.ts` — `World.draw()` calls the signage computation and caches
  results keyed by `Graph.hash()`. If the language preference changes at runtime,
  the cache must be invalidated (see Implementation).
- `ts/ui/organisms/worldEditorPanel.ts` + `worldEditorPanelTemplate.ts` — the
  world-editor panel. It owns the road `BrushState` (which already includes
  `name`), a single `#nameInput` (`#wepName`), inspect-mode metadata sync
  (`showSegmentMetadata` / `#notifyBrushChange` → `SegmentMetadata`), and
  collapsible sections. This is where the language dropdown AND the localized
  name inputs go. `styles/organisms/_world-editor-panel.css` holds its CSS
  (class-scoped `.wep-*`, atomic-design tokens only).
- `ts/world/editors/inspectEditor.ts` + `ts/world/worldEditor.ts` — the inspect
  editor reads a clicked segment's metadata into the panel and writes edits back
  onto the `Segment`. Localized name edits flow through the same
  `SegmentMetadata` → segment path.
- `AGENTS.md` § "Segment OSM metadata", § "Road signage placement", and
  § "World editor road panel & inspect mode".
- `docs/Units.md` / `docs/WorldEditor.md` for the metadata/signage docs.
- `tests/unit/math/osm-importer/osm.test.ts` — parser tests.
- `tests/unit/world/` — signage/roadSignage tests if present (search for
  `computeStreetLabelPlacements`).

## OSM tags to support

Store these optional way tags on `Segment` (all strings):

| OSM tag   | Segment field | Notes                           |
| --------- | ------------- | ------------------------------- |
| `name:en` | `nameEn`      | Already stored — no change      |
| `name:he` | `nameHe`      | New                             |
| `name:ar` | `nameAr`      | New                             |
| `name:ru` | `nameRu`      | New                             |
| `name`    | `name`        | Already stored (native/primary) |

`alt_name*` are out of scope (see below).

## Scope

### In scope

1. Add `nameHe?`, `nameAr?`, `nameRu?` fields to `Segment` (metadata object +
   constructor assignment). `name` and `nameEn` already exist.
2. Parse `name:he` / `name:ar` / `name:ru` in `Osm.parseRoads()` and pass them in
   the segment `metadata`.
3. Fold the new fields into `Graph.hash()` and restore them in `Graph.load()`.
4. Add a **display-language preference** with values
   `native | en | he | ar | ru` (default `native`). A module-level setting is
   fine (e.g. a small exported getter/setter in a new
   `ts/world/signageLanguage.ts`, or reuse an existing preferences pattern).
   Persist it to `localStorage` under a new key (add it to the store-panel
   tracked keys — see `ts/store/storeManager.ts` `SM_TRACKED_LS_KEYS`).
5. Update `displayNameOf` in `roadSignage.ts` to select the name for the chosen
   language, with fallback order: chosen language → `name` → `nameEn` → any
   available. Group segments by the RESOLVED display name (so a street with mixed
   tags still groups correctly).
6. Invalidate the signage cache when the language changes (see Implementation).
7. A **language dropdown** (native / EN / HE / AR / RU) in the **world-editor
   panel** (`<world-editor-panel>`). On change it calls `setSignageLanguage()`,
   persists the choice, and triggers a redraw. This is the pinned location —
   not the world-layers toolbar.
8. **Localized-name editing** in the world-editor panel: add `name:en`,
   `name:he`, `name:ar`, `name:ru` text inputs alongside the existing `Name`
   input, wired into the `BrushState` / `SegmentMetadata` flow so edits apply to
   the selected segment in inspect mode (and stamp onto hand-drawn segments in
   brush mode). See Implementation → "World-editor panel".
9. Tests + docs.

### Out of scope

- `alt_name` / `alt_name:*` (alternate/colloquial names).
- Per-label language mixing or bilingual labels.
- Translating road-shield / exit-sign text (only street-name labels).
- RTL text shaping beyond what the canvas already does.

## Implementation

### `ts/math/primitives/segment.ts`

- Add `nameHe?: string`, `nameAr?: string`, `nameRu?: string` fields; extend the
  `metadata` param type; assign from `metadata` in the constructor (mirror
  `nameEn`).

### `ts/math/osm-importer/osm.ts`

- Read `way.tags['name:he']`, `['name:ar']`, `['name:ru']` and include them in
  the `metadata` object passed to `new Segment(...)`.

### `ts/math/graph/graph.ts`

- `Graph.load()` — restore `nameHe`/`nameAr`/`nameRu` onto reconstructed
  segments (wherever `nameEn` is restored).
- `Graph.hash()` — fold the new fields per-char (wherever `nameEn`/`name` is
  folded) so signage caches invalidate when they change.

### Language preference + `roadSignage.ts`

- New `ts/world/signageLanguage.ts` (or equivalent): `type SignageLanguage`,
  `getSignageLanguage()`, `setSignageLanguage(lang)`, persisted to
  `localStorage` (`sim:signageLanguage`). Add the key to `SM_TRACKED_LS_KEYS` in
  `ts/store/storeManager.ts`.
- In `computeStreetLabelPlacements()`, replace `displayNameOf` with a
  language-aware resolver:
  ```
  const lang = getSignageLanguage();
  const pick = (seg) => ({
    native: seg.name,
    en: seg.nameEn,
    he: seg.nameHe,
    ar: seg.nameAr,
    ru: seg.nameRu,
  }[lang]) ?? seg.name ?? seg.nameEn ?? seg.nameHe ?? seg.nameAr ?? seg.nameRu;
  ```
  Group by the resolved name.

### Cache invalidation

- `World.draw()` caches signage keyed by `Graph.hash()`. The language is NOT in
  the graph, so changing it won't invalidate the cache. Options (pick one and
  document it):
  - Fold the current `getSignageLanguage()` into the signage cache key (simplest
    — append the language to the hash used for `#signageCache`).
  - Or expose a `World.invalidateSignage()` the UI calls on language change.
    The cache-key approach is preferred (no cross-layer call).

### UI — language dropdown (world-editor panel)

- Add a `<select id="wepSignageLang">` with options native / EN / HE / AR / RU
  to `worldEditorPanelTemplate.ts` (its own `.wep-field`, e.g. in a small
  "Labels" row or the Properties section header — keep it above the per-segment
  fields since it's a global display preference, not segment metadata).
- In `worldEditorPanel.ts`: cache it in `#cacheDom`, initialise its value from
  `getSignageLanguage()` in `connectedCallback`, and on `change` call
  `setSignageLanguage(select.value)` then fire a new panel callback
  (`setOnSignageLanguageChange(cb)`) that `WorldEditor` wires to a redraw /
  cache-invalidation. Do NOT route this through `BrushState`/`SegmentMetadata`
  — it's global, not per-segment.
- Style via `styles/organisms/_world-editor-panel.css` using atomic-design
  tokens only (no raw px/hex).

### UI — localized name editing (world-editor panel)

- Extend `BrushState` and `SegmentMetadata` in `worldEditorPanel.ts` with
  `nameEn`, `nameHe`, `nameAr`, `nameRu` (strings in `BrushState`, optional
  strings in `SegmentMetadata`), mirroring the existing `name` field exactly.
- In `worldEditorPanelTemplate.ts`, add four text inputs
  (`#wepNameEn`/`#wepNameHe`/`#wepNameAr`/`#wepNameRu`) next to the existing
  `#wepName` (`Name`) input. Group them under the `Name` label (e.g. a small
  collapsible "Localized names" block) so the panel stays compact.
- In `worldEditorPanel.ts`:
  - Cache the four inputs in `#cacheDom`.
  - Wire `input` listeners that set the matching `#brushState.name*` field and
    call `#notifyBrushChange()` (same pattern as `#nameInput`).
  - Mirror them in `#syncBrushState`, `showSegmentMetadata`,
    `resetToDefaults`, and the `#notifyBrushChange` → `SegmentMetadata` object
    (`nameEn: this.#brushState.nameEn || undefined`, etc.).
- `GraphEditor.setBrushState()` and the inspect-editor write-back path must
  carry the new fields onto the `Segment` metadata (5th constructor arg /
  metadata assignment). Verify `Osm.parseRoads` and `Graph.load` already
  populate them so inspect mode shows imported values.
- Keep it behind the existing panel styling conventions (`.wep-*` classes,
  atomic-design tokens, no raw px/hex).

## Testing

### `tests/unit/math/osm-importer/osm.test.ts`

- `name:he` / `name:ar` / `name:ru` tags → stored on the segment as
  `nameHe`/`nameAr`/`nameRu`.

### `tests/unit/math/graph/graph.test.ts` (or wherever `Graph.hash` is tested)

- Two graphs differing only in `nameHe` produce different `hash()` values.
- `Graph.load()` round-trips the new fields.

### signage tests

- With language `en`, a segment having `nameEn` labels in English; with `native`
  it labels using `name`; fallback chain works when the chosen language tag is
  absent.

### world-editor panel tests (`tests/unit/ui/` if panel tests exist)

- `BrushState` / `SegmentMetadata` include `nameEn`/`nameHe`/`nameAr`/`nameRu`
  and round-trip through `showSegmentMetadata` → `#notifyBrushChange`.
- Editing a localized-name input fires the metadata-change callback with the
  updated field (others preserved from the selected segment).
- If the panel is not unit-testable in the JSDOM/Node harness (custom-element +
  template), cover the pure `BrushState`/`SegmentMetadata` mapping only and note
  the DOM-dependent parts as verified via the visual/manual path.

## Acceptance criteria

- `npm run rebuild` succeeds with no TypeScript errors.
- `npm run fix:all` passes (format + lint).
- `npm test` passes — existing tests plus the new ones.
- Importing an OSM JSON with `name:en`/`name:he` and switching the world-editor
  panel's language dropdown re-labels the streets in the chosen language and
  persists the choice across reload.
- Worlds without localized tags fall back to the native `name` (no regression).
- The new `localStorage` key appears in the landing-page store panel.
- Selecting a segment in inspect mode shows its localized names in the panel;
  editing any of them (native / EN / HE / AR / RU) updates the segment and the
  rendered label (in the matching display language). Hand-drawing a road with
  localized names set in the brush stamps them onto the new segment.

## Docs to update

- `docs/Units.md` / `docs/WorldEditor.md` — document the new `Segment` localized
  name fields, the display-language preference, the world-editor panel language
  dropdown, and the new localized-name inputs in the panel's inspect/brush UI.
- `AGENTS.md` — extend "Segment OSM metadata" with the new `nameHe`/`nameAr`/
  `nameRu` fields and note the signage language preference + its `localStorage`
  key and cache-key handling. Extend "World editor road panel & inspect mode"
  with the language dropdown and the localized-name inputs (and their
  `BrushState`/`SegmentMetadata` fields).
- Persistence table in `AGENTS.md` (localStorage keys) — add `sim:signageLanguage`.
