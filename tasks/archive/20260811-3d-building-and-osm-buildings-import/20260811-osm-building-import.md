# OSM Building Import — Real Footprints (with generated fallback)

**Date:** 2026-08-11
**Slug:** osm-building-import
**Entry points affected:** html/world.html (OSM import + Regenerate items)
**Save-file impact:** additive — worlds gain an authored-building source flag;
existing saves keep working (default = generated).
**Backward compat:** preserved — hand-drawn/editor worlds keep the current
auto-generated buildings unchanged.

**Audience:** an AI coding agent with **zero prior context** on this codebase —
everything needed to implement is in this file.

---

## Goal

Today **all** buildings are procedurally generated along the road network by
`wgGenerateBuildings` — regardless of whether the world came from an OSM import
or was hand-drawn in the world editor. When importing from OpenStreetMap we want
the **real building footprints** (OSM `building=*` ways) instead of fake
road-frontage boxes.

**Crucial constraint:** worlds are ALSO created from scratch in the built-in
world editor (hand-drawn roads, no OSM data). Those have no real footprints, so
they must keep using the **existing generated-building system**. So the building
source is per-world:

- **Imported from OSM** → use the real OSM footprints; do NOT generate boxes.
- **Hand-drawn in the editor** → keep the current `wgGenerateBuildings` output.

---

## Background: how the pieces fit today

- **OSM parsing:** `ts/math/osm-importer/osm.ts`. `Osm.parseRoadsChunked(data)`
  is a generator returning `ParsedRoads`:
  `{ points, segments, lights, crossings, stops, yields }`. It converts OSM
  node lat/lon → world-space `Point`s and OSM `highway` ways → `Segment`s. This
  is the **math layer** — it must NOT import world-layer classes (`Building`,
  `Marking`, …). It emits plain math primitives; the caller builds the classes.
- **Import driver:** `ts/world/editors/worldEditorOsmImport.ts`,
  `WorldEditor.parseOsmData()` (async). It runs `parseRoadsChunked` behind the
  `<generation-progress>` overlay, sets `world.graph.points/segments`, builds
  the `Light/Crossing/Stop/Yield` markings from the placement arrays, centres
  the viewport, then calls `world.generateAsync({ roads: true, buildings:
autoRegen, trees: autoRegen, … })`.
- **Building generation:** `ts/world/generation/buildingGenerator.ts`,
  `wgGenerateBuildings` / `wgGenerateBuildingsGen`. Driven by
  `WorldGenerator.generateBuildings` and `World.generate`/`generateAsync`.
- **The building model:** `ts/world/items/building.ts`. `Building` has
  `base: Polygon`, `height` (default 200), a cached `center`/`boundingRadius`,
  and serializes to a compact footprint (`toFootprint`/`loadFootprint`). The
  world stores `World.buildings: Building[]`.
- **Persistence:** v2 worlds save buildings as `decoration.buildings`
  (footprints); `World.load` rebuilds them via `Building.loadFootprint`. Loading
  does NOT re-run generation, so imported footprints already persist across
  save/load once they're in `world.buildings`.
- **Auto-regen:** `ts/world/editors/worldEditor.ts` — the ♻️ Regenerate-items
  action and the "auto-regen" toggle call `#runGeneration({ buildings, trees })`
  on graph change, which re-runs `wgGenerateBuildings` and **replaces**
  `world.buildings`. This is the code that would clobber imported footprints and
  MUST become source-aware.
- **Buildings are decorative only** — cars collide with road borders, never
  buildings (see `World.getCollisionBorders`). So this feature is purely visual;
  no physics/collision changes.

---

## Design

### 1. Parse building footprints from OSM (math layer)

In `ts/math/osm-importer/osm.ts`:

- Add `OsmBuildingFootprint { points: Point[]; height?: number }` (plain math
  primitives — NO `Building` import).
- Extend `ParsedRoads` with `buildings: OsmBuildingFootprint[]`.
- In `parseRoadsChunked`, add a pass over closed ways tagged `building` (any
  value except `no`). Build the footprint polygon from the way's node `Point`s
  (reuse the existing node→Point map). Only keep ways that form a closed ring
  (first node == last node, or ≥3 distinct points). Yield `[0,1]` progress like
  the other passes (this runs behind the overlay).
- Derive `height` (in **world px**, matching `Building.height`) from tags, in
  priority order: `height` (metres → world px via `metersToWorldPixels` from
  `ts/math/worldUnits.ts`), else `building:levels` × a `METRES_PER_LEVEL`
  constant (~3 m) → world px, else leave `undefined` (caller uses the default).
- **Scope v1 to simple closed ways.** Multipolygon `relation[building]` with
  inner holes (courtyards) is a documented follow-up — skip relations in v1 and
  note it. Overlapping/duplicate `building:part` ways: keep it simple, import
  each `building` way once.

### 2. Overpass query must fetch buildings

The import only sees what the Overpass query returned. The world-editor OSM
panel builds/opens a query (see `copyOsmFilter` / `openOverpassTurbo` in
`worldEditorOsmImport.ts` and the panel). Update that query to ALSO fetch
building ways, e.g. add `way["building"]` to the union and keep the recursion
that pulls way nodes (`(._;>;); out body;`) so footprint node coords are present
(NOT `out skel;`). Document the exact new filter string in the panel's copy
button. Parsing must tolerate OSM JSON that has **no** building elements (older
exports) — then `buildings` is empty and the generated fallback kicks in.

### 3. Per-world building source flag

Add `World.buildingSource: 'osm' | 'generated'` (default `'generated'`),
serialized in the world save (additive; absent → `'generated'` on load).

- In `parseOsmData`: after parsing, if `result.buildings.length > 0`, set
  `world.buildings = result.buildings.map(b => new Building(new Polygon(b.points),
b.height ?? DEFAULT))` and `world.buildingSource = 'osm'`. Then call
  `generateAsync` with `buildings: false` (roads still true; trees per
  autoRegen) so generation never overwrites the imported footprints. If the OSM
  data had no buildings, keep the current behaviour
  (`world.buildingSource = 'generated'`, generate as today).
- Make **all** building-generation entry points source-aware: `World.generate`,
  `World.generateAsync`, `WorldGenerator.generateBuildings`, and the editor's
  `#runGeneration` / Regenerate-items / auto-regen path must **skip building
  generation when `buildingSource === 'osm'`** (they may still regenerate
  trees/roads). Otherwise editing a road after an OSM import would wipe the real
  buildings.
- Provide an explicit escape hatch: a way for the user to convert back to
  generated buildings (e.g. Regenerate-items with a modifier, or a panel
  control) that sets `buildingSource = 'generated'` and runs the generator. Keep
  this minimal — a single control is fine; document it.

### 4. Height in the renderers

`Building.height` already drives the 2D pseudo-3D roof. The 3D camera currently
uses a FIXED `EXTRUDE_BUILDING_HEIGHT_PX` and ignores per-building height — the
sibling `3d-building-roofs` task switches it to per-building height. If that
task hasn't landed, imported tall buildings will still render at the fixed 3D
height (acceptable interim); the 2D map will already show varied heights.

---

## Constraints

- **Math-layer isolation:** `osm.ts` must not import `Building`/world classes —
  emit `OsmBuildingFootprint` primitives; construct `Building` in
  `parseOsmData`.
- **Chunked/time-sliced:** the new parse pass must yield progress and run behind
  the existing overlay — large city imports must not freeze the tab (AGENTS.md
  "Time-sliced world generation", "Chunked OSM parse").
- **No collision changes** — buildings stay decorative.
- **Determinism & existing tests:** the sync `generate`/`generateBuildings`
  paths must still produce identical output for `generated` worlds (guard tests
  in `tests/unit/world/generation/`).
- Keep Prettier `singleQuote: true`.

---

## Acceptance criteria

- Importing an OSM export that contains `building=*` ways yields buildings whose
  footprints match the real map (visible in both the top-view editor and the 3D
  race camera), and editing roads afterward does NOT replace them.
- Importing an OSM export with **no** buildings (or a hand-drawn editor world)
  still produces the current generated buildings, and Regenerate-items still
  works for those.
- Save → reload preserves imported footprints AND the `buildingSource` flag
  (no regeneration on load).
- `npm run rebuild`, `npm run fix:all`, `npm test` all pass. New unit tests:
  OSM building-way parsing (closed-ring detection, height from
  `height`/`building:levels`, empty when no building tags) and the
  source-aware skip in generation.
- `npm run test:visual` reviewed by the user (world-editor / race baselines may
  change if a test world gains imported buildings; otherwise unchanged).

---

## Follow-ups (explicitly out of v1 scope)

- Multipolygon `relation[building]` with inner-ring holes (courtyards).
- `building:part` / 3D-detailed buildings, roof shapes/colours from tags.
- Importing trees/greenery (`natural=tree`, `leisure=park`).
