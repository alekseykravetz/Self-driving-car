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
   language (e.g. English, Hebrew, native), falling back gracefully.

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
- `AGENTS.md` § "Segment OSM metadata" and § "Road signage placement".
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
7. A minimal UI control to change the language (a dropdown in the world-layers
   or world-editor toolbar; keep it small and optional). If a full UI is too
   large, expose the setter and default to `native`, and document the setting —
   but a dropdown is strongly preferred so the feature is usable.
8. Tests + docs.

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

### UI

- Add a small `<select>` (native / EN / HE / AR / RU) to an existing toolbar
  (e.g. `ts/ui/molecules/worldLayersToolbar.ts` or the world-editor panel). On
  change, call `setSignageLanguage()` and trigger a redraw. Keep it behind the
  existing toolbar styling conventions (atomic-design CSS tokens, no raw px/hex).

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

## Acceptance criteria

- `npm run rebuild` succeeds with no TypeScript errors.
- `npm run fix:all` passes (format + lint).
- `npm test` passes — existing tests plus the new ones.
- Importing an OSM JSON with `name:en`/`name:he` and switching the language
  dropdown re-labels the streets in the chosen language and persists the choice
  across reload.
- Worlds without localized tags fall back to the native `name` (no regression).
- The new `localStorage` key appears in the landing-page store panel.

## Docs to update

- `docs/Units.md` / `docs/WorldEditor.md` — document the new `Segment` localized
  name fields and the display-language preference.
- `AGENTS.md` — extend "Segment OSM metadata" with the new `nameHe`/`nameAr`/
  `nameRu` fields and note the signage language preference + its `localStorage`
  key and cache-key handling.
- Persistence table in `AGENTS.md` (localStorage keys) — add `sim:signageLanguage`.
