# Split WorldGenerator — Extract OwnerGrid, Chunked Union, Buildings, Trees

**Date:** 2026-08-04
**Slug:** split-world-generator-ts
**Entry points affected:** html/world.html, html/simulator.html, html/traffic.html, html/race.html (any page that generates a `World`)
**Save-file impact:** none
**Backward compat:** preserved (no public API changes visible to callers)

**Audience:** an AI coding agent with **zero prior context** on this
conversation — everything needed is in this file.

## Goal

`ts/world/generation/worldGenerator.ts` (803 lines) is on the architecture
audit's god-object watch-list (see `AGENTS.md` "Anti-Patterns to Flag"). It
already bundles four largely-independent, already-individually-documented
sub-systems (see the four separate AGENTS.md bullets: "Tree placement spatial
index (`OwnerGrid`)", "Grid-accelerated chunked union (`unionGen`)", the
building de-overlap filter, and tree rejection-sampling). Split each into its
own module. `WorldGenerator` itself (the public class with `generateRoads`/
`generateBuildings`/`generateTrees`/`generate`/`generateAsync`/etc.) stays in
`worldGenerator.ts` as the orchestration facade, now importing from the four
new files instead of defining everything inline. No behavior change.

## Context (read first)

- [ts/world/generation/worldGenerator.ts](../ts/world/generation/worldGenerator.ts)
  — read in full. Note the generator-based time-slicing pattern
  (`function*` yielding local `[0,1]` progress, drained by `drainGenerator`
  for the sync path or `runChunkedGenerator` for the async path) — every
  extracted piece must preserve this exactly; see
  [ts/world/generation/generationProgress.ts](../ts/world/generation/generationProgress.ts).
- [tests/unit/world/generation/worldGenerator.test.ts](../tests/unit/world/generation/worldGenerator.test.ts)
  — imports `WorldGenerator`, `laneGuidesForSegment`, and the `WorldGeneratable`
  type, all from `ts/world/generation/worldGenerator.js`. These three exports
  **must remain importable from this same path** after the split (either kept
  in `worldGenerator.ts` directly, or re-exported from there) — do not move
  `laneGuidesForSegment` or the `WorldGeneratable` interface into one of the
  new files without also re-exporting them from `worldGenerator.ts`, or this
  test file's imports will break.
- AGENTS.md § "Tree placement spatial index (`OwnerGrid`)" and § "Grid-indexed
  building footprint filter (perf)" and § "Grid-accelerated chunked union
  (`unionGen`) (perf)" — these three bullets describe the exact behavior
  guarantees (determinism, order-preservation vs. `Polygon.union`) that must
  be preserved verbatim by the extracted code. Re-read them before moving
  anything.
- `docs/Math.md` "Owner Grid — tree placement" section — describes the
  `OwnerGrid` class's role; update the file-path reference there if it
  changes (see "Docs to update" below).

## Scope

- **In scope — four new files, each importing only what it needs:**
  1. `ts/world/generation/ownerGrid.ts` — the `OwnerGrid` class, verbatim.
  2. `ts/world/generation/chunkedUnion.ts` — `unionGen`, `remapGen`,
     `polygonAABB`, `aabbOverlap`, and the `PolyAABB` interface, verbatim
     (imports `OwnerGrid` from the new `ownerGrid.ts`).
  3. `ts/world/generation/buildingGenerator.ts` — `wgGenerateBuildingsGen`,
     `wgGenerateBuildings`, verbatim (imports `OwnerGrid` from `ownerGrid.ts`
     directly for its own de-overlap grid, and `unionGen`/`remapGen` from
     `chunkedUnion.ts` for the footprint-guide union step).
  4. `ts/world/generation/treeGenerator.ts` — `wgGenerateTreesGen`,
     `wgGenerateTrees`, `wgPickTreeType`, verbatim (imports `OwnerGrid` from
     `ownerGrid.ts`).
  - `worldGenerator.ts` keeps: `getSegmentRoadWidth`,
    `getSegmentEnvelopeGeometry`, `laneGuidesForSegment` (exported, unchanged
    signature), `wgGenerateLaneGuides`, `wgGenerateSeparatorBorders`,
    `wgGenerateRoadsGen` (which now imports `unionGen`/`remapGen` from
    `chunkedUnion.ts` for the road-border union step), the `WorldGeneratable`
    interface (exported, unchanged), and the public `WorldGenerator` class —
    now importing `wgGenerateBuildingsGen`/`wgGenerateBuildings` from
    `buildingGenerator.ts` and `wgGenerateTreesGen`/`wgGenerateTrees` from
    `treeGenerator.ts`.
- **Out of scope:**
  - No change to `Polygon.union`/`Polygon.multiBreak` (unrelated, already
    documented as "unchanged" — do not touch `ts/math/primitives/polygon.ts`).
  - No change to the generation progress overlay/UI
    (`ts/ui/molecules/generationProgress.ts`).
  - No change to `World`'s consumption of `WorldGenerator` — `world.ts` only
    calls the public `WorldGenerator.*` static methods, which keep their
    exact signatures.

## Implementation

### `ts/world/generation/ownerGrid.ts` (new file)

- Move the `OwnerGrid` class verbatim, with its doc comment. Export it.

### `ts/world/generation/chunkedUnion.ts` (new file)

- Move `polygonAABB`, `aabbOverlap`, the `PolyAABB` interface, `remapGen`,
  and `unionGen` verbatim, with their doc comments. Export `unionGen` and
  `remapGen` (the others can stay module-private unless another new file
  needs them — `buildingGenerator.ts` needs `polygonAABB`, so export that
  too).

### `ts/world/generation/buildingGenerator.ts` (new file)

- Move `wgGenerateBuildingsGen` and `wgGenerateBuildings` verbatim. Import
  `Envelope`, `Polygon`, `Segment`, `Point`, `Building`, `add`/`scale` from
  `../../math/utils.js`, `OwnerGrid` from `./ownerGrid.js`, `unionGen`/
  `remapGen`/`polygonAABB` from `./chunkedUnion.js`, and the
  `WorldGeneratable` type — either duplicate the minimal fields it needs in
  a local narrower interface, or import `WorldGeneratable` from
  `./worldGenerator.js` (check for an import cycle: `worldGenerator.ts` will
  import `wgGenerateBuildingsGen` from this file, so importing
  `WorldGeneratable` back from `worldGenerator.ts` would be circular — instead
  define `WorldGeneratable` in a new neutral home, e.g. keep it exported from
  `worldGenerator.ts` only for the test-import requirement above, and have
  `buildingGenerator.ts`/`treeGenerator.ts` accept a narrower structural type
  or the same shape declared locally — TypeScript structural typing means a
  locally-declared equivalent interface is compatible without a runtime
  import). Export `wgGenerateBuildingsGen` and `wgGenerateBuildings`.

### `ts/world/generation/treeGenerator.ts` (new file)

- Move `wgGenerateTreesGen`, `wgGenerateTrees`, `wgPickTreeType` verbatim.
  Same `WorldGeneratable`-type consideration as above. Import `OwnerGrid`
  from `./ownerGrid.js`, `Tree`/`buildTreePrototypes` from `../items/tree.js`,
  `mulberry32`/`lerp`/`distance` from `../../math/utils.js`. Export
  `wgGenerateTreesGen` and `wgGenerateTrees`.

### `ts/world/generation/worldGenerator.ts`

- Remove the four moved sections; add imports from the new files.
- Verify `laneGuidesForSegment` and `WorldGeneratable` are still exported
  from this exact file (required by the existing test import path).
- `WorldGenerator.generateBuildings`/`generateTrees` bodies stay unchanged
  (they already just call `wgGenerateBuildings(world)` /
  `wgGenerateTrees(world)` plus the tree-prototype-rebuild guard) — only the
  import source of those two functions changes.
- `wgGenerateRoadsGen` keeps calling `unionGen`/`remapGen`, now imported from
  `./chunkedUnion.js` instead of being locally defined.

## Brain / persistence considerations

None — this task touches no save-file schema, sensor, or brain code. Road/
building/tree generation determinism (seeded RNG via `mulberry32`) must be
preserved exactly — do not change the order of `Math.random()`/`rand()` calls
within any moved generator, since that would change generated worlds for a
given seed even though nothing about the _API_ changed.

## Acceptance criteria

- `tests/unit/world/generation/worldGenerator.test.ts` passes unmodified,
  including the "parking lane widening" and `laneGuidesForSegment` describe
  blocks, and the determinism/non-overlap invariant tests referenced in
  AGENTS.md § "Grid-indexed building footprint filter (perf)".
- Opening `html/world.html`, importing an OSM dataset (see
  `saves/*.json` sample files) and clicking "Regenerate items" produces
  visually identical roads/buildings/trees to before this change (spot-check;
  for a stronger guarantee, generate a world with a fixed seed before and
  after the change and diff the serialized `decoration.trees`/`.buildings`
  arrays — they must be byte-identical for the same input graph).
- `npm run rebuild`, `npm run fix:all`, `npx tsc --noEmit`, `npm test` all
  pass with the same test count as before this change.

## Docs to update

- `docs/Math.md` "Owner Grid — tree placement" section — update the file
  path reference from `ts/world/generation/worldGenerator.ts` to
  `ts/world/generation/ownerGrid.ts` (and similarly for the "Grid-accelerated
  chunked union" and "Grid-indexed building footprint filter" references, if
  `docs/Math.md` names specific file paths for those).
- AGENTS.md — the four bullets under "Tree placement spatial index
  (`OwnerGrid`)", "Grid-accelerated chunked union (`unionGen`)", and the
  building/tree generation bullets currently say things like "(generation-local,
  `worldGenerator.ts`)" — update those parentheticals to point at the new
  file names (`ownerGrid.ts`, `chunkedUnion.ts`, `buildingGenerator.ts`,
  `treeGenerator.ts`) so the convention notes stay accurate.
