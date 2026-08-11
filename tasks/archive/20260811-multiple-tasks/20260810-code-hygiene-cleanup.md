# Code Hygiene Cleanup — Magic Numbers, Dead Code, TODOs

**Date:** 2026-08-10
**Slug:** code-hygiene-cleanup
**Entry points affected:** none (internal refactor, no behavior change)
**Save-file impact:** none
**Backward compat:** preserved — pure refactor, output must be byte-identical.

**Audience:** an AI coding agent with **zero prior context** — everything
needed is in this file.

---

## Goal

Low-risk hygiene pass over the rendering + world layers. No behavior change:
every render must be pixel-identical (visual tests must pass unchanged). This
task removes dead code, resolves/clarifies stale TODOs, and lifts hardcoded
rendering numbers into named constants following the project's existing
convention (constants centralised in `ts/math/*` and per-module `config.ts`).

---

## Scope (do exactly these, nothing more)

### 1. Camera magic numbers → named constants

File: [ts/camera/camera.ts](ts/camera/camera.ts) and
[ts/camera/extrusion.ts](ts/camera/extrusion.ts).

Hardcoded rendering literals to name (verify exact values/locations while
implementing — grep the file, do not trust these line numbers blindly):

- Building extrusion height `200` → `EXTRUDE_BUILDING_HEIGHT_PX`
- Road-border extrusion height `10` → `EXTRUDE_ROAD_HEIGHT_PX`
- Traffic-car extrusion height factors (`12`, `4`) → named constants
- FOV near-plane distance `20` → `FOV_NEAR_PLANE_DISTANCE_PX`
- Ground-polygon centre offset `0.5` → `FOV_CENTER_OFFSET`
- Road-surface cull margin `300` → reuse existing `WORLD_CULL_MARGIN_PX` if
  identical in meaning, otherwise `ROAD_SURFACE_CULL_MARGIN_PX`

Place the new constants at the top of the module that uses them (or in
`ts/camera/config.ts` if you create one — prefer top-of-file `const` to match
sibling files). Value must be unchanged.

### 2. Building geometry magic numbers

File: [ts/world/items/building.ts](ts/world/items/building.ts).

- Ceiling-height ratio `0.6` → `BUILDING_CEILING_HEIGHT_RATIO`
- Minimum-base-point assumption `4` → `MIN_BUILDING_BASE_POINTS`

### 3. Resolve/clarify TODO comments

- [ts/car/car.ts](ts/car/car.ts) `//todo: fix this` (near `finishTime?` /
  `progress?`): either fix or replace with a concrete comment explaining WHY
  the fields are optional. Do not leave a vague `fix this`.
- [ts/world/editors/graphEditor.ts](ts/world/editors/graphEditor.ts)
  `// todo: change name to draw in all editors`: this is a rename request. If
  the editor method is not `draw()`, decide whether to rename now (low risk) or
  delete the stale TODO. Prefer deleting if the rename is out of scope.
- [ts/world/items/building.ts](ts/world/items/building.ts)
  `// todo: Could potentially draw just the flat ceiling...`: convert to a
  plain clarifying comment (it is a note, not a task) or remove.
- [ts/world/trafficManager.ts](ts/world/trafficManager.ts)
  `// todo: avoid serializing the graph object during save world...`: keep the
  note but reword so it reads as a known-limitation note, not an open TODO — OR
  leave as-is if it tracks real future work. Document the decision in the PR.

### 4. Remove dead / commented-out code

- Commented-out debug `console.warn` in
  [ts/world/trafficManager.ts](ts/world/trafficManager.ts) (the disabled "No
  intersections found" line) — delete it.
- Any other commented-out multi-line drawing/debug blocks found in
  [ts/world/world.ts](ts/world/world.ts) — delete (git history preserves them).

---

## Out of scope

- No method extraction / decomposition (that is the `camera-decomposition` and
  `large-file-decomposition` tasks).
- No type-safety cast changes (that is `type-safety-hardening`).
- No error-handling changes (that is `error-handling-surfacing`).

---

## Acceptance criteria

- `npm run tsc:watch` (or `npm run rebuild`) compiles cleanly.
- `npm run fix:all` passes (format + lint).
- `npm test` passes.
- `npm run test:visual` passes with **no baseline updates** (renders are
  pixel-identical — this is the key guarantee).
- No `todo`/`fixme` left in the four files listed above unless deliberately
  kept with justification.
