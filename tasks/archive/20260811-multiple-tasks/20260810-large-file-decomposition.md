# Large-File Decomposition — `World.draw()` and God Classes

**Date:** 2026-08-10
**Slug:** large-file-decomposition
**Entry points affected:** all simulator/editor pages (rendering paths)
**Save-file impact:** none
**Backward compat:** preserved — every render must be pixel-identical.

**Audience:** an AI coding agent with **zero prior context** — everything
needed is in this file.

---

## Goal

Several files carry too many responsibilities. Reduce them via the
**collaborator pattern already established in this codebase** (see AGENTS.md:
`WorldSignageRenderer`, `WorldBridgeRenderer`, `WorldRoadMarkingsRenderer` were
all extracted from `World` this way). No behavior change — renders must be
pixel-identical (visual tests pass with no baseline updates).

This is the largest / highest-risk task. Do it **one file at a time**, running
the full test suite (including visual) after each extraction. Ship each file's
refactor as its own commit so regressions are bisectable.

---

## Targets (in priority order — do the first, re-evaluate before the rest)

### 1. `World.draw()` — [ts/world/world.ts](ts/world/world.ts) (553 lines)

The `draw()` method is ~150 lines orchestrating every render pass (asphalt,
bridges, borders, lane markings, parking glyphs, corridors, markings, cars,
buildings, trees, signage). It already delegates SOME passes to collaborators.

- Extract remaining inline passes into the existing collaborator classes (or a
  new one, e.g. `WorldItemsRenderer` for buildings/trees) so `draw()` becomes a
  thin orchestrator that calls collaborators in the same order.
- Preserve the single-`Graph.hash()`-per-frame threading and `screenBounds`
  viewport culling exactly (AGENTS.md documents both as load-bearing perf
  paths — the hash must still be computed once and passed down; culling helpers
  in `ts/world/worldViewCulling.ts` must still be used).

### 2. `WorldEditor` — [ts/world/editors/worldEditor.ts](ts/world/editors/worldEditor.ts) (651 lines)

Owns world state, 11 editor instances, OSM import, toolbar coordination, layer
visibility. Extract cohesive groups:

- Editor-instance creation/wiring → a factory/helper module.
- OSM-import orchestration already partly lives in `worldEditorOsmImport.ts` —
  push more of it there.
- Layer-visibility management → its own small helper if not already isolated.

### 3. Simulator god-files (evaluate, may defer)

- [ts/simulator/humanTraining/humanBackpropSimulator.ts](ts/simulator/humanTraining/humanBackpropSimulator.ts) (753)
- [ts/simulator/traffic/trafficSimulator.ts](ts/simulator/traffic/trafficSimulator.ts) (685)

These are large but cohesive. Only decompose if a clear seam exists (e.g. UI
wiring vs simulation loop vs input handling). Do NOT force-split. If no clean
seam, leave them and note why.

---

## Constraints

- **Pixel-identical renders.** Visual tests are the safety net — run them after
  every extraction, expect no baseline changes.
- Follow the existing collaborator pattern (constructed once by the owner,
  receives explicit params, does not call back into the owner).
- Preserve all documented perf paths: single graph hash per frame, viewport
  culling, draw-order/tier caching, envelope-AABB caching. Re-read the relevant
  AGENTS.md bullets before touching `World.draw()`.
- One file per commit. Full test run between files.

---

## Acceptance criteria

- `npm run rebuild` compiles cleanly.
- `npm run fix:all` and `npm test` pass after each file.
- `npm run test:visual` passes with **no baseline updates** after each file.
- `World.draw()` is a thin orchestrator; `worldEditor.ts` line count materially
  drops; no perf regression (draw-loop hashing/culling unchanged).
- Any file deliberately left un-split has a one-line note explaining why.
