# Split World — Extract Rendering Collaborators

**Date:** 2026-08-04
**Slug:** split-world-ts
**Entry points affected:** html/simulator.html, html/traffic.html, html/world.html, html/human-training.html
**Save-file impact:** none
**Backward compat:** preserved (no public API changes visible to callers)

**Audience:** an AI coding agent with **zero prior context** on this
conversation — everything needed is in this file.

## Goal

`ts/world/world.ts` (843 lines) is on the architecture audit's god-object
watch-list (see `AGENTS.md` "Anti-Patterns to Flag"). It already delegates
road-signage rendering to a `WorldSignageRenderer` collaborator (see
AGENTS.md § "Road signage placement") — extend that same established pattern
to two more self-contained rendering concerns currently living as private
methods directly on `World`: lane/parking-lane markings, and bridge
shadows/details. This shrinks `World` to data model + serialization +
generation delegation + top-level `draw()` orchestration, with each rendering
concern living in its own collaborator (mirrors the existing
`WorldSignageRenderer` pattern exactly).

## Context (read first)

- [ts/world/world.ts](../ts/world/world.ts) — read in full.
- [ts/world/worldSignageRenderer.ts](../ts/world/worldSignageRenderer.ts) —
  the existing collaborator pattern to mirror: a class instantiated once by
  `World`, holding its own cache(s) keyed by `Graph.hash()`, exposing
  `draw*(ctx, graph, zoom?)`-style methods called from `World.draw()`.
- `tests/unit/world/world.test.ts` and
  `tests/unit/world/worldSignageRenderer.test.ts` — both import the public
  class only (no private-method testing), so this extraction is safe as long
  as `World`'s public surface (`draw`, `generate`, `generateAsync`, `load`,
  `toJSON`, `getCollisionBorders`, etc.) is unchanged.
- AGENTS.md § "Single `Graph.hash()` per frame (perf)" — the frame hash is
  computed once in `World.draw()` and threaded to every consumer
  (`trafficManager.update(hash)`, `#getDrawOrderedEnvelopes(hash)`,
  `signageRenderer.setFrameHash(hash)`). Any new collaborator that needs the
  hash must receive it the same way — do NOT let it call `Graph.hash()`
  independently, or you reintroduce the exact redundant-hash-pass regression
  this file documents fixing.
- AGENTS.md § "Bridge shadows & lane-markings skip" — describes the exact
  behavior of the methods being moved (single-path-per-frame fill batching for
  shadows/deck overlay, `laneMarkings === false` skip). Preserve this
  precisely; it was a deliberate perf fix, not incidental structure.
- AGENTS.md § "Viewport culling of road rendering (perf)" — the moved methods
  take an optional `screenBounds: VisibleWorldRect` and use
  `#segmentInView`/`#polygonInView`/`#pointInView` for culling. Decide in your
  implementation whether these three culling helpers move alongside (to the
  new collaborators, since they're used by all of them) or stay on `World`
  and get passed in / exported as free functions — the "Implementation"
  section below specifies the exported-free-function approach to avoid
  triplicating the culling logic across three new files.

## Scope

- **In scope:**
  - Extract `#drawLaneMarkings`, `#drawParkingLanes`,
    `#drawSimpleLaneMarkings`, `#drawMultiLaneDividers` into a new
    `WorldRoadMarkingsRenderer` collaborator
    (`ts/world/worldRoadMarkingsRenderer.ts`).
  - Extract `#drawBridgeShadows`, `#drawBridgeDetails` into a new
    `WorldBridgeRenderer` collaborator (`ts/world/worldBridgeRenderer.ts`).
    Both need read access to the tier-sorted envelope list — pass it in as a
    parameter (`envelopes: Envelope[]`) rather than having the collaborator
    call back into `World`.
  - Extract the three culling predicates (`#pointInView`, `#segmentInView`,
    `#polygonInView`) plus `WORLD_CULL_MARGIN_PX` into exported free functions
    in a new pure module `ts/world/worldViewCulling.ts` (no class needed —
    these have no instance state). Both new renderers and `World` itself
    import from there instead of each having a private copy.
  - `World` holds one instance each of `WorldRoadMarkingsRenderer` and
    `WorldBridgeRenderer` (alongside its existing `#signageRenderer`), and
    `draw()` calls into them at the exact same call sites/order as today.
- **Out of scope:**
  - `WorldSignageRenderer` itself — already extracted, do not touch.
  - `#getDrawOrderedEnvelopes` / `#drawOrderCache` — stays on `World` (it's
    the shared tier-sort cache both new renderers consume via the
    `envelopes` parameter, not something they own).
  - `generate`/`generateAsync`/`load`/`toJSON`/serialization — unchanged.
  - No visual/behavioral change of any kind — this is a pure code-motion
    refactor.

## Implementation

### `ts/world/worldViewCulling.ts` (new file)

- Export `WORLD_CULL_MARGIN_PX` (move the constant here).
- Export `pointInView(p, bounds, margin?)`, `segmentInView(seg, bounds, margin?)`,
  `polygonInView(poly, bounds)` as free functions with the exact same bodies
  as today's private methods (parameter order: subject first, then
  `VisibleWorldRect`, then optional margin).

### `ts/world/worldRoadMarkingsRenderer.ts` (new file)

- Export class `WorldRoadMarkingsRenderer` with methods `drawLaneMarkings`,
  `drawParkingLanes` — bodies identical to today's `#drawLaneMarkings`/
  `#drawParkingLanes`/`#drawSimpleLaneMarkings`/`#drawMultiLaneDividers`
  (the latter two become private methods on the new class), importing
  `segmentInView` from `worldViewCulling.ts` in place of `this.#segmentInView`.

### `ts/world/worldBridgeRenderer.ts` (new file)

- Export class `WorldBridgeRenderer` with methods `drawShadows`, `drawDetails`
  — bodies identical to today's `#drawBridgeShadows`/`#drawBridgeDetails`,
  taking `envelopes: Envelope[]` as an explicit parameter (the tier-sorted
  list `World` already computed via `#getDrawOrderedEnvelopes()`) instead of
  calling back into `World`. Import `polygonInView` from `worldViewCulling.ts`.

### `ts/world/world.ts`

- Remove the six extracted private methods and the `WORLD_CULL_MARGIN_PX`
  constant.
- Add `#roadMarkingsRenderer = new WorldRoadMarkingsRenderer()` and
  `#bridgeRenderer = new WorldBridgeRenderer()` alongside the existing
  `#signageRenderer` field.
- In `draw()`, replace the removed method calls with:
  `this.#bridgeRenderer.drawShadows(ctx, this.#getDrawOrderedEnvelopes(graphHash), screenBounds)`,
  `this.#roadMarkingsRenderer.drawLaneMarkings(ctx, this.graph.segments, screenBounds)`,
  `this.#roadMarkingsRenderer.drawParkingLanes(ctx, this.graph.segments, screenBounds)`,
  `this.#bridgeRenderer.drawDetails(ctx, this.#getDrawOrderedEnvelopes(graphHash), screenBounds)`
  — at the exact same positions in `draw()`'s existing call order (do not
  reorder relative to road borders, one-way arrows, or signage calls).
- Keep `#pointInView` usage inside `draw()` itself (for the markings loop and
  culling checks) but source it from the new `worldViewCulling.ts` import
  instead of a private method.

## Brain / persistence considerations

None — this task touches no save-file schema, sensor, or brain code. World
serialization (`toJSON`/`load`) is untouched.

## Acceptance criteria

- `tests/unit/world/world.test.ts` and
  `tests/unit/world/worldSignageRenderer.test.ts` pass unmodified.
- Opening `html/simulator.html` (world mode), `html/traffic.html`, and
  `html/world.html` renders lane markings, parking "P" glyphs, one-way
  arrows, and bridge shadows/decks identically to before (visually spot-check;
  the Playwright visual suite masks `<canvas>` so it won't catch pixel
  regressions here — manual check is required).
- `npm run test:visual` still passes (canvas is masked, so this only confirms
  no HTML/CSS chrome regression — expected to be a no-op here).
- `npm run rebuild`, `npm run fix:all`, `npx tsc --noEmit`, `npm test` all
  pass with the same test count as before this change.

## Docs to update

- None required for behavior (no behavior changes). Optional: add one line to
  the AGENTS.md "Road signage placement" bullet noting that lane-markings and
  bridge rendering now also live in their own `World*Renderer` collaborators
  alongside `WorldSignageRenderer` — only add this if you want the convention
  documented; not required for task completion.
