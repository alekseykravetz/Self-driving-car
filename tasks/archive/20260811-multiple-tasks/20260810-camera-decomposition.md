# Camera Decomposition — Break Up `#getPolygons()`

**Date:** 2026-08-10
**Slug:** camera-decomposition
**Entry points affected:** html/race.html (`?mode=camera`) — 3D view only
**Save-file impact:** none
**Backward compat:** preserved — the 3D render must be pixel-identical.

**Audience:** an AI coding agent with **zero prior context** — everything
needed is in this file.

---

## Goal

[ts/camera/camera.ts](ts/camera/camera.ts) is 628 lines. Its private
`#getPolygons()` method is ~180 lines and builds 10+ distinct geometry types
(ground, road surfaces, road borders, buildings, trees, key car, traffic cars,
best car, car shadows, lane markings, road text) inline. It also **duplicates**
the "build Polygon from a car → frustum-filter → apply fill/stroke style"
block ~4× for different car categories.

Decompose it into focused private helpers with **zero behavior change**. The
3D view is covered by visual tests — they must pass without baseline updates.

---

## Approach

1. Read the whole file first. Map every geometry type produced by
   `#getPolygons()` and the exact order it is appended (painter's algorithm
   depends on order — see AGENTS.md "3D uses Painter's algorithm").

2. Extract one private helper per cohesive geometry group, e.g.:

   - `#buildGroundPolygons()`
   - `#buildRoadSurfacePolygons()`
   - `#buildRoadBorderPolygons()`
   - `#buildBuildingPolygons()`
   - `#buildTreePolygons()`
   - `#buildCarPolygons()` — parameterised so the 4 duplicated car blocks
     (keys car, traffic cars, best car, shadows) call ONE helper with different
     inputs/style options. This kills the duplication.
   - `#buildLaneMarkingPolygons()` / `#buildRoadTextPolygons()`

   `#getPolygons()` becomes a short orchestrator that concatenates the helper
   outputs **in the original order**.

3. Extract the duplicated car-styling block into a single helper, e.g.
   `#styleCarPolygons(car, options)` returning the styled projected polygons.
   The 4 call sites differ only in the source car(s) and fill/stroke — pass
   those as parameters.

4. Move the magic numbers this method uses into named constants **only if the
   `code-hygiene-cleanup` task has not already done so** — otherwise reuse the
   constants it created. Coordinate: if that task ran first, do not re-declare.

---

## Constraints

- **Painter's-algorithm order is load-bearing.** The final polygon list must be
  appended in the exact same order as before. Verify by diffing render output
  (visual tests).
- No public API change to `Camera`.
- Helpers are `#private`. Do not leak internals.
- Keep the per-frame allocation optimisations already documented in AGENTS.md
  (`#projSegment` reuse, vertex squared-distance depth fade, centroid
  pre-filters) — do NOT reintroduce per-vertex `new Segment`/`new Point` or
  `Polygon.distanceToPoint` depth calc while refactoring.

---

## Acceptance criteria

- `npm run rebuild` compiles cleanly.
- `npm run fix:all` and `npm test` pass.
- `npm run test:visual` passes with **no baseline updates** (pixel-identical 3D
  render is the core guarantee).
- `#getPolygons()` is now a short orchestrator; the 4-way car-styling
  duplication is gone (single helper).
- Camera perf characteristics from AGENTS.md are preserved (no regressed
  allocations in the projection hot path).
