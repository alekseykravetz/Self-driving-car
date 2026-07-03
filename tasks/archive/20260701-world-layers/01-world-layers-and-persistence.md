# Task 01 — World Layers panel, lazy generation & lean world persistence

**Effort:** very large · **Priority:** high · **Status:** done · **Branch:** `task-world-layers` · **Archived:** yes

> This task is intentionally exhaustive so a separate agent can implement it end-to-end
> without further design input. Read it fully before writing code. It has three tightly
> related pillars — (A) **World Layers** model + panel, (B) **lazy/decoupled generation**,
> (C) **lean world persistence** (compact trees + derived-data drop) — plus (D) two brand-new
> tree types and (E) migration of the existing store worlds. Implement in the phased order
> given in [Implementation plan](#implementation-plan); each phase compiles and runs on its own.

---

## Problem

Working with medium/large worlds in the editor is slow and produces huge files.

1. **Slow, blocking regeneration on every graph edit.** In
   [ts/world/editors/worldEditor.ts](../../ts/world/editors/worldEditor.ts) `draw()` compares
   `world.graph.hash()` each frame and, on any change, calls `world.generate(this.generateWorld)`
   **synchronously**. Generation runs the expensive parts:

   - `wgGenerateBuildings()` — builds wide envelopes, unions them, then does an **O(n²) collision
     filter** between all candidate building footprints
     ([ts/world/generation/worldGenerator.ts](../../ts/world/generation/worldGenerator.ts)).
   - `wgGenerateTrees()` — rejection sampling with per-candidate polygon distance checks against
     every building/envelope and every already-placed tree.

   So each tiny graph change on a big map re-finds all tree/building placements and re-renders
   hundreds of randomized top-view trees/buildings, freezing the editor. The current mitigation is
   the bottom-bar **“Generate” checkbox** (`#worldGenerationInput`) which turns decoration off
   entirely — a blunt all-or-nothing switch.

2. **World files are enormous and mostly redundant.** Measured on
   `store/world/barnea.world` (≈15.8 MB serialized):

   | Key                      | Share | Regenerable from graph?                                                                                 |
   | ------------------------ | ----- | ------------------------------------------------------------------------------------------------------- |
   | `envelopes`              | 45.3% | ✅ yes (graph + roadWidth + roadRoundness)                                                              |
   | `trees`                  | 38.8% | ✅ yes — each tree stores its **full 32-point canopy polygon**; only `center`+`size`+variant are needed |
   | `buildings`              | 5.8%  | ✅ mostly — footprint polygon **plus a redundant `segments` array**                                     |
   | `laneGuides`             | 4.4%  | ✅ yes (half-width envelope union)                                                                      |
   | `roadBorders`            | 4.0%  | ✅ yes (`Polygon.union` of envelopes)                                                                   |
   | `graph`                  | 1.6%  | ⭐ **the only true must-have**                                                                          |
   | markings/params/viewport | <0.1% | authored / tiny                                                                                         |

   ~98% of every world file is **derived or bloated** data. `envelopes`, `roadBorders`,
   `laneGuides`, and `separatorBorders` are pure functions of the graph and can be dropped and
   rebuilt on load (cheap). Trees store a giant polygon each when they only need a position and a
   variant. `World.load()` deliberately does **not** call `generate()`, so today it depends on all
   that geometry being present in the file.

3. **No fine-grained control of what is shown.** The user wants, in the editor, independent
   visibility control over each part of the world (graph only, roads, markings, item _bases_/place­
   holders, rendered trees, rendered buildings) as emoji toggle buttons — decoupled from whether
   that data is _generated_.

Secondary: `StoreManager.init()` eagerly fetches **every** world in the manifest (including the
multi-MB `barnea`/`ir-hyain`) at startup. Shrinking the files fixes most of this; a lazy-fetch
enhancement is listed as optional.

---

## Goals

1. **World Layers model.** Introduce an explicit, ordered set of world _layers_, each with two
   orthogonal concerns: **visibility** (drawn or not, cheap, per-frame) and **generation** (computed
   & cached, expensive, on demand). The rendering pipeline honors a per-draw visibility mask.
2. **World Layers panel.** A new `<world-layers-panel>` custom element in the world editor with an
   emoji toggle button per layer, giving full control over what is presented. Visibility is a
   **local editor preference** (persisted to `localStorage`), _not_ saved into the world file.
3. **Lazy, decoupled generation.** Graph edits stop triggering automatic full decoration rebuilds.
   Cheap road geometry still refreshes automatically; expensive item placement is rebuilt only on an
   explicit **“Regenerate items”** action (button) — or optionally debounced/off by default.
4. **Lean persistence.** Redesign the `.world` file to store **only must-have data** (graph, params,
   markings, corridors, viewport) plus a **compact decoration block**: a small reproducible **tree
   prototype set** referenced by lightweight **tree instances** (position + variant + scale), and
   compact **building footprints** (no redundant `segments`). Drop `envelopes`, `roadBorders`,
   `laneGuides`, `separatorBorders` from the file and rebuild them on load. Target: barnea drops from
   ~15.8 MB to well under ~1.5 MB.
5. **Two brand-new tree types.** Add two visually distinct tree render styles (not just a reseed of
   the existing round canopy) selectable via the instance’s variant, so worlds look more varied.
6. **Migrate existing store worlds** to the new lean format without losing them, and keep old files
   loadable (back-compat parser).

Non-goal: changing car physics, neural net, traffic-light logic, or corridor semantics.

---

## Current state (what exists today)

- **World data**: `World` ([ts/world/world.ts](../../ts/world/world.ts)) holds `graph`, road params,
  and generated arrays `envelopes`, `roadBorders`, `separatorBorders`, `buildings`, `trees`,
  `laneGuides`, plus `markings`, `corridors`, viewport `zoom`/`offset`.
- **Generation**: `WorldGenerator.generate(world, generateBuildings)`
  ([ts/world/generation/worldGenerator.ts](../../ts/world/generation/worldGenerator.ts)) always
  rebuilds envelopes/roadBorders/laneGuides/separatorBorders; gates buildings/trees behind the flag;
  then re-anchors markings.
- **Load**: `World.load(info)` maps every stored array back into objects and **does not** call
  `generate()` — it trusts the file’s geometry.
- **Draw**: `World.draw(ctx, options: WorldDrawOptions)` draws envelopes → road borders →
  lane/arrow markings → markings → corridors → cars → buildings+trees (distance-sorted).
  `WorldDrawOptions` is in [ts/world/types.ts](../../ts/world/types.ts).
- **Tree**: [ts/world/items/tree.ts](../../ts/world/items/tree.ts) — `center`, `size`, `height`,
  and a 32-point `base` polygon built by `#generateLevel()`; `draw()` stacks 7 canopy levels using a
  pseudo-random radius derived from `angle + center.x`.
- **Building**: [ts/world/items/building.ts](../../ts/world/items/building.ts) — `base` polygon +
  `height`; `Building.load()` reloads the polygon (the polygon serializes its `segments` too, which
  is the redundant bloat).
- **Editor UI**: bottom `#controls` bar in [html/world.html](../../html/world.html) has the “Render /
  Generate” checkbox (`#worldGenerationInput`) + all mode buttons. `WorldEditor.draw()` regenerates
  on graph-hash change; `toggleWorldGeneration()` flips `generateWorld`.
- **Panels pattern**: custom elements live in `ts/panels/` (shared) with a template in
  `templates/…Template.ts`; both compiled scripts are loaded in the page and both symbols registered
  in `eslint.config.mjs` (`allowedUnusedVars` + `myGlobals.globals`). Components must be **`_a`-free**
  (static `readonly template = CONST`; `customElements.define` outside the class; file-scope helpers
  instead of class self-references — see the `_a` notes in the repo memory / storePanel pattern).
- **Camera 3D** ([ts/camera/camera.ts](../../ts/camera/camera.ts) `#getPolygons`) consumes
  `world.buildings` and `world.trees` (via `.base`) for the extruded view. This means the simulator/
  race pages **must** have decoration available — so worlds saved without decoration must be able to
  rebuild it on load.
- **Store**: `store/manifest.json` lists worlds; `StoreManager` fetches them all on init.

---

## Proposed design

### A. World Layers model

Define a fixed, ordered list of layers. Each is a **visibility** flag (draw-time) and maps to a
**generation** stage (compute-time). Put the shared definitions in
[ts/world/types.ts](../../ts/world/types.ts):

```typescript
type WorldLayerId =
  | 'graph' // 🌐 nodes + edges (the source of truth)
  | 'roads' // 🛣️ envelopes + road borders + lane/dash/arrow markings + separators
  | 'markings' // 🚦 stop/yield/light/crossing/parking/start/target markings
  | 'corridors' // 🛤️ authored corridors
  | 'itemBases' // 📍 building footprints + tree base circles (the "placeholders")
  | 'trees' // 🌳 fully rendered 3D trees
  | 'buildings'; // 🏢 fully rendered 3D buildings

type WorldLayerVisibility = Record<WorldLayerId, boolean>;

const DEFAULT_LAYER_VISIBILITY: WorldLayerVisibility = {
  graph: true,
  roads: true,
  markings: true,
  corridors: true,
  itemBases: false,
  trees: true,
  buildings: true,
};
```

- **Visibility** is passed into drawing via a new optional `layers?: Partial<WorldLayerVisibility>`
  on `WorldDrawOptions`. `World.draw()` reads it (merging over `DEFAULT_LAYER_VISIBILITY`) and skips
  the corresponding draw sections. `itemBases` draws the _flat_ footprint polygons / tree base
  circles (cheap outlines) instead of the 3D renders — useful while placing/inspecting on big maps.
- **Generation** stays in `WorldGenerator`, but split so each expensive stage can run independently
  (see pillar B). The panel’s visibility toggles never trigger generation.

> Keep the `graph` layer conceptually always-on for editing (the graph editor still works even if
> the graph render is hidden). Hiding `graph` only hides its _overlay_ draw, not editor interaction.

### B. Lazy / decoupled generation

Refactor `WorldGenerator` into independently callable stages so the editor can rebuild the cheap
stuff continuously and the expensive stuff only on demand:

```typescript
class WorldGenerator {
  // Cheap, deterministic — safe to run on every graph change.
  static generateRoads(world): void; // envelopes, roadBorders, laneGuides, separatorBorders
  // Expensive — run on demand only.
  static generateBuildings(world): void;
  static generateTrees(world): void; // uses the prototype set (pillar C)
  // Convenience used by World ctor / non-editor callers.
  static generate(
    world,
    opts?: { roads?: boolean; buildings?: boolean; trees?: boolean },
  ): void;
  // After any graph change, keep markings attached:
  static reanchorMarkings(world): void;
}
```

Editor behavior change in [worldEditor.ts](../../ts/world/editors/worldEditor.ts):

- On graph-hash change: call `WorldGenerator.generateRoads(world)` + `reanchorMarkings(world)` only
  (fast). **Do not** rebuild buildings/trees automatically.
- Replace the single “Generate” checkbox with the new panel (pillar F). Add an explicit
  **“Regenerate items”** action (button, e.g. ♻️) that runs `generateBuildings` + `generateTrees`.
  Optionally keep an “auto-regenerate items on graph change” checkbox (default **off**) for small
  maps. When items become stale after a graph edit, surface a subtle “items outdated” indicator
  (e.g. tint the regenerate button) rather than silently rebuilding.
- Because regeneration is now user-triggered and can still take a moment on huge maps, wrap the
  heavy call so the UI can show a brief “Generating…” state. A simple synchronous call guarded by a
  `requestAnimationFrame`/`setTimeout(0)` yield (so the button’s busy state paints first) is
  acceptable; a full Web Worker is **out of scope** but note it as a future option.

### C. Lean persistence + tree prototype/instance model

**New `.world` schema (written by the editor):**

```jsonc
{
  "version": 2,                     // schema version marker for the loader
  "graph": { "points": [...], "segments": [...] },   // must-have
  "roadWidth": 100, "roadRoundness": 10,
  "buildingWidth": 150, "buildingMinLength": 150, "spacing": 50, "treeSize": 160,
  "markings": [...],                // authored, must-have
  "corridors": [...],               // authored, must-have
  "zoom": 1, "offset": { "x": 0, "y": 0 },

  // Compact decoration (NO derived geometry, NO per-tree polygons):
  "decoration": {
    "treeSeed": 123456,             // reproduces the prototype SET deterministically
    "treePrototypeCount": 8,        // N canopy prototypes generated from the seed
    // instances: flat, minimal — position + variant + scale (+ optional type/rotation)
    "trees": [ { "x": 5712.6, "y": 3738.9, "p": 3, "s": 1.04, "t": 0 }, ... ],
    "buildings": [ { "poly": [[x,y],[x,y],...], "h": 200 }, ... ]  // footprint only, no segments
  }
}

// Explicitly NOT stored (rebuilt on load): envelopes, roadBorders, laneGuides, separatorBorders.
```

Notes:

- `p` = prototype/variant index into the reproducible prototype set; `t` = tree **type**
  (`0` = classic round canopy, `1`/`2` = the two new types, pillar D); `s` = scale multiplier.
  Keep keys short (`x,y,p,s,t`) to minimize size, or store as fixed-order tuples `[x,y,p,s,t]` for
  even smaller files (document whichever you pick in the loader).
- **Tree prototypes** are the “single reference set” the user described: generate `N` canopy shapes
  once from `treeSeed` (a small seeded RNG — see below) and reuse them for all instances. A prototype
  captures the _shape/noise_; the instance supplies _position + scale + type_. This removes the
  32-point polygon per tree.
- **Buildings**: store just the footprint points + height. Rebuild the `Polygon` (and its internal
  `segments`) on load via `Building.load`. This alone removes the redundant `segments` bloat.
- **Determinism**: add a tiny seeded PRNG helper (e.g. `mulberry32(seed)`), file-scope in the tree
  module or `ts/math/utils.ts`. Use it to build prototypes so `treeSeed`+`treePrototypeCount` fully
  reproduce the set. Instance _positions_ are still stored (placement depends on the graph/buildings,
  which change), so placement need not be deterministic — only the prototype shapes are.

**Load path** (`World.load`, [worldLoader.ts](../../ts/world/loader/worldLoader.ts) /
`parseWorldFileContent`): after reading must-have data,

1. `WorldGenerator.generateRoads(world)` to rebuild envelopes/roadBorders/laneGuides/separators.
2. Reconstruct the tree prototype set from `decoration.treeSeed`/`treePrototypeCount`.
3. Rebuild `world.trees` from `decoration.trees` (each instance → a `Tree` bound to its prototype +
   scale + type), and `world.buildings` from `decoration.buildings`.
4. `reanchorMarkings(world)`.

This keeps the camera/simulator working (they still read `world.buildings`/`world.trees`) while the
file stays tiny.

**Back-compat**: the loader must still accept **v1** files (current format with full `envelopes`,
`trees` polygons, `buildings.segments`). Detect by absence of `version`/`decoration`. For v1, load as
today (verbatim), then optionally normalize into v2 in memory so re-saving emits the lean format.
Keep this branch small and clearly commented; do **not** delete it.

### D. Two new tree types

Extend [ts/world/items/tree.ts](../../ts/world/items/tree.ts) so a `Tree` has a `type` (0/1/2) and a
`prototype` (shape data) instead of always generating the round canopy:

- **Type 0 — Classic** (existing): stacked noisy round canopy levels (keep current look; drive its
  noise from the prototype instead of `center.x` so instances of the same prototype match).
- **Type 1 — Conifer/Pine (new)**: a tall triangular/layered spire — draw 3–4 stacked triangles or
  a narrowing cone with a small trunk; darker green gradient. Distinct silhouette from type 0.
- **Type 2 — Round cluster / broadleaf blob (new)**: a cluster of overlapping circles (2–4 lobes)
  forming a bushy crown; lighter/olive gradient. Also produce a matching **base** polygon for
  collision/`itemBases` drawing and for the camera’s `extrudeTreeShapes`.

Each type must implement:

- a `base: Polygon` (ground footprint) so `WorldGenerator.generateTrees` collision checks, the
  `itemBases` layer, and `camera.ts extrudeTreeShapes(world.trees.map(t => t.base))` keep working;
- a `draw(ctx, { viewPoint })` producing the pseudo-3D look via `getFake3dPoint`.

The generator picks a `type` per instance (e.g. weighted random, or by zone) and a `prototype` index
so the saved instance can reproduce it. Keep `treeSize` as the global scale baseline; `s` scales per
instance (replaces the old `lerp(0.5,1.5)` size randomization — store `s`, don’t bake a polygon).

### E. Editor: World Layers panel

Add a new shared custom element `<world-layers-panel>`:

- Files: `ts/panels/worldLayersPanel.ts` + `ts/panels/templates/worldLayersPanelTemplate.ts`
  (exporting `WORLD_LAYERS_PANEL_TEMPLATE`). Follow the exact pattern of
  [ts/panels/shortcutsToolbar.ts](../../ts/panels/shortcutsToolbar.ts) (static `readonly template`,
  `_a`-free, `customElements.define` outside class, file-scope helpers).
- One toggle button per `WorldLayerId` with the emoji + `title`:
  🌐 Graph · 🛣️ Roads · 🚦 Markings · 🛤️ Corridors · 📍 Item bases · 🌳 Trees · 🏢 Buildings.
  Plus the ♻️ **Regenerate items** action button (and optional “auto” checkbox).
- API: `setVisibility(v: WorldLayerVisibility)`, `getVisibility()`, `setChangeListener(cb)`,
  `setRegenerateListener(cb)`, `setActive(id, on)` (lit/dim button style like the existing toolbars).
- Persist visibility to `localStorage` under a new key `editor:worldLayers` (JSON of
  `WorldLayerVisibility`). Load it on editor init; default to `DEFAULT_LAYER_VISIBILITY`.
- Place it in [html/world.html](../../html/world.html) inside `#simulatorToolbar` (next to
  `<world-toolbar>`/`<shortcuts-toolbar>`) or as its own bottom-bar group — match existing styling in
  [styles/world/styles.css](../../styles/world/styles.css). **Remove** the old
  “Render / Generate” checkbox group from `#controls` and its wiring in `worldEditor.ts`
  (`worldGenerationInput`, `toggleWorldGeneration`, `generateWorld` field) — replaced by the panel +
  regenerate action.
- `worldEditor.draw()` passes `{ viewPoint, layers: this.layerVisibility }` into `world.draw()`.

Register both new globals (`WorldLayersPanelElement`, `WORLD_LAYERS_PANEL_TEMPLATE`) in
`eslint.config.mjs` (both `allowedUnusedVars` and `myGlobals.globals`), and add their `<script>`
tags to `world.html` in the panels section (template before component).

### F. Existing store worlds — migration

Do **not** hand-hack the giant JSON. Provide a **repeatable migration script**:

- Add `scripts/migrate-worlds.mjs` (Node, no deps) that, for each file in `store/world/*.world`
  (and optionally `saves/*.world`): parses v1, rebuilds the lean v2 structure by (a) dropping
  `envelopes`/`roadBorders`/`laneGuides`/`separatorBorders`, (b) converting each v1 tree
  (`center`,`size`) into a compact instance with an assigned `type`/`prototype`/`scale`, choosing a
  single `treeSeed`, (c) converting buildings to footprint-only, and writes v2 in place (back up the
  original alongside, e.g. `*.world.v1.bak`, or to a `store/world/_v1_backup/` dir — **ask before
  overwriting**; keep backups since these are shared assets).
- The script must produce files that load **identically-looking** worlds through the new loader
  (spot-check `circle`, `mirror`, `barnea`). Because v1 tree canopies were fully baked, exact tree
  _shapes_ will differ slightly after migration (they become prototype-based) — that is acceptable
  and expected; positions/counts must be preserved.
- Update `store/manifest.json` only if filenames change (they should **not**).
- Because migrated files are much smaller, the eager `StoreManager.init()` fetch cost drops sharply;
  a lazy per-world fetch is **optional** and can be a follow-up.

> Treat `store/` files as shared/committed assets: create backups and confirm before overwriting.

---

## Data model summary (before → after)

| Aspect                                   | Before (v1)                            | After (v2)                                           |
| ---------------------------------------- | -------------------------------------- | ---------------------------------------------------- |
| envelopes                                | stored (45%)                           | **dropped**, rebuilt on load                         |
| roadBorders                              | stored (4%)                            | **dropped**, rebuilt on load                         |
| laneGuides                               | stored (4.4%)                          | **dropped**, rebuilt on load                         |
| separatorBorders                         | stored                                 | **dropped**, rebuilt on load                         |
| trees                                    | full 32-pt polygon each (39%)          | `{x,y,p,s,t}` instance + shared seeded prototype set |
| buildings                                | polygon **+ redundant segments** (6%)  | footprint points + height only                       |
| graph/params/markings/corridors/viewport | stored                                 | stored (unchanged, must-have)                        |
| generation timing                        | auto full rebuild every graph edit     | roads auto (cheap); items on-demand ♻️               |
| visibility                               | one all-or-nothing “Generate” checkbox | 7-layer panel, persisted locally                     |

Expected file-size impact: barnea ~15.8 MB → **~0.5–1.5 MB**; similar ~10× reductions elsewhere.

---

## Implementation plan

Work in phases; each ends with a green build (`npx tsc --noEmit` → `npx tsc` →
`npx eslint --fix .` → `npx eslint .` clean, and `grep -rlE "^var _a;" js/` empty).

1. **Layer types + draw mask (no behavior change).** Add `WorldLayerId`,
   `WorldLayerVisibility`, `DEFAULT_LAYER_VISIBILITY`, and `WorldDrawOptions.layers` in
   `ts/world/types.ts`. Thread `layers` through `World.draw()` and gate each draw section. Add the
   `itemBases` flat-outline rendering path. Default keeps current visuals.
2. **Split `WorldGenerator`** into `generateRoads` / `generateBuildings` / `generateTrees` /
   `reanchorMarkings` + a `generate(opts)` convenience. Keep `World.generate()` and the ctor working
   (call `generate({ roads:true, buildings:true, trees:true })`). No file-format change yet.
3. **Seeded prototype tree model.** Add `mulberry32` (or similar) seeded PRNG helper. Refactor `Tree`
   to take a `prototype` + `type` + `scale` and derive its canopy/base from them; implement type 0 to
   match today’s look driven by the prototype (not `center.x`). Update `generateTrees` to assign
   seed/prototype/type/scale and to store instances rather than baked polygons on the world (add a
   `world.treeSeed`/`world.treePrototypeCount` or a small `world.decoration` holder as needed).
4. **Two new tree types** (1 & 2) with matching `base` polygons and `draw`.
5. **Lean serialization + v2 loader with v1 back-compat.** Update `World`/`parseWorldFileContent`/
   `World.load` and the editor `save()` to emit/consume the v2 schema; rebuild derived geometry on
   load; keep the v1 branch. Verify camera/simulator/race still render decoration for a loaded v2
   world.
6. **Editor rewire**: remove the old Generate checkbox; add `<world-layers-panel>` (component +
   template + eslint globals + html scripts + CSS); persist visibility to `editor:worldLayers`; wire
   graph-change to `generateRoads`+`reanchorMarkings` only; add ♻️ Regenerate items action with a
   busy state and a stale indicator.
7. **Migration script** `scripts/migrate-worlds.mjs` + backups; migrate `store/world/*` (confirm
   before overwrite). Spot-check load of each migrated world in editor, simulator, race, traffic.
8. **Docs**: update [docs/WorldEditor.md](../../docs/WorldEditor.md) (layers, lazy generation, new
   tree types) and [docs/SaveLoad.md](../../docs/SaveLoad.md) (v2 schema, back-compat, migration).
   Update the repo memory notes (project-overview) with the new layer/generation/persistence facts.

---

## Files likely affected

- `ts/world/types.ts` — layer types, `WorldDrawOptions.layers`.
- `ts/world/world.ts` — `draw()` layer gating; `load()`/serialization for v2 + v1 back-compat;
  decoration fields.
- `ts/world/generation/worldGenerator.ts` — stage split; tree instances via prototypes.
- `ts/world/items/tree.ts` — prototype/type/scale model + two new tree types + seeded PRNG use.
- `ts/world/items/building.ts` — footprint-only load/serialize (drop redundant segments on save).
- `ts/world/loader/worldLoader.ts` / `parseWorldFileContent` (root `ts/utils.ts` or wherever it
  lives) — v2 parse + v1 detection.
- `ts/world/editors/worldEditor.ts` — remove Generate checkbox wiring; layer visibility state;
  regenerate action; cheap-only auto regen; pass `layers` to draw.
- `ts/panels/worldLayersPanel.ts` + `ts/panels/templates/worldLayersPanelTemplate.ts` — **new**.
- `ts/math/utils.ts` (or tree module) — `mulberry32` seeded PRNG (register in eslint if cross-file).
- `ts/camera/camera.ts` — verify `#getPolygons` still works with new `Tree.base`/`Building.base`
  (should need no change if `base` is preserved).
- `html/world.html` — panel scripts + markup; remove Generate checkbox group.
- `styles/world/styles.css` / `styles/style.css` — panel button styling.
- `eslint.config.mjs` — add `WorldLayersPanelElement`, `WORLD_LAYERS_PANEL_TEMPLATE`, `mulberry32`
  (as needed) to both `allowedUnusedVars` and `myGlobals.globals`.
- `scripts/migrate-worlds.mjs` — **new**; `store/world/*.world` migrated (+ backups).
- `docs/WorldEditor.md`, `docs/SaveLoad.md` — documentation.

---

## Testing & verification

- **Build**: `npx tsc --noEmit` clean → `npx tsc` → `npx eslint --fix .` → `npx eslint .` (no
  output) → `grep -rlE "^var _a;" js/` empty (the two new panel/PRNG symbols must not introduce
  `_a`).
- **Editor**: load `barnea` (post-migration); confirm graph edits stay smooth (no full item rebuild);
  each layer toggle shows/hides correctly and persists across reload; ♻️ rebuilds items and shows a
  busy/stale state; `itemBases` shows flat footprints/base circles.
- **Persistence**: save a world; confirm the file is ~10× smaller, contains no `envelopes`/
  `roadBorders`/`laneGuides`/`separatorBorders`, and stores compact `decoration.trees`/`buildings`.
  Reload it and confirm trees/buildings reappear (rebuilt) and the camera 3D view (simulator/race)
  renders decoration.
- **Back-compat**: load an original **v1** file (keep one un-migrated copy) — must still open and,
  on re-save, emit v2.
- **Cross-page**: verify simulator, race, and traffic pages load a migrated world and render
  buildings/trees via the camera (they rely on `world.buildings`/`world.trees`).
- **New trees**: visually confirm types 1 & 2 render distinctly and their `base` collision/`itemBases`
  outlines look correct.

## Risks & mitigations

- **Camera depends on decoration**: dropping baked geometry is safe only because the loader rebuilds
  `trees`/`buildings`. Verify the simulator/race/traffic pages (which call `World.load`) rebuild them
  — add road/tree/building rebuild to the shared load path, not just the editor.
- **Determinism drift**: v1→v2 migration changes exact tree shapes (prototype-based). Acceptable;
  document it. Positions/counts must be preserved.
- **Shared asset loss**: back up `store/world/*` before migrating; confirm before overwrite.
- **`_a` collision**: new panel + PRNG must follow the `_a`-free patterns (file-scope helpers, no
  in-class self-reference). Re-run the `grep` check.
- **Scope creep**: Web Worker generation and lazy per-world store fetching are **out of scope** —
  note them as follow-ups.

## Out of scope (future follow-ups)

- Moving heavy generation into a Web Worker.
- Lazy/on-demand fetching of individual store worlds in `StoreManager`.
- Per-instance tree rotation / more than three tree types / biome zoning.
- Compressing the world file (gzip) — the schema change already achieves the size goal.
