# 3D Camera — Pitched-Roof Building Representation

**Date:** 2026-08-11
**Slug:** 3d-building-roofs
**Entry points affected:** html/race.html (`?mode=camera`) — the 3D view only
**Save-file impact:** none
**Backward compat:** preserved — top-view map rendering must not change.

**Audience:** an AI coding agent with **zero prior context** on this codebase —
everything needed to implement is in this file.

---

## Goal

In the 3D camera view, buildings are currently drawn as **flat, featureless
grey boxes** (a vertical extrusion with a flat top). In the **top-view 2D map**
the same buildings already render a much nicer pseudo-3D look: white walls, a
flat white ceiling, and a **red pitched (gabled) roof**. Bring that nicer
representation — most importantly the **pitched red roof** — into the 3D camera
so buildings read as houses, not grey blocks.

This is a **small, self-contained visual task.** It changes only how building
geometry is generated for the 3D camera.

---

## Where things are

- **3D camera building geometry:** `ts/camera/camera.ts`, method
  `#buildBuildingPolygons(world, show)`. It calls
  `extrudePolygons(bases, EXTRUDE_BUILDING_HEIGHT_PX)` (a fixed `200`) and then
  styles every resulting polygon a uniform translucent grey
  (`rgba(150,150,150,0.2)`).
- **The extrusion primitive:** `ts/camera/extrusion.ts`,
  `extrudePolygons(polygons, height)` returns, per base: N side quads + 1 flat
  `ceiling` polygon (all at `z = -height`). Sibling helpers there
  (`extrudeCarShape`, `extrudeTreeShapes`) show the pattern for richer shapes.
- **The 2D roof to mirror:** `ts/world/items/building.ts`, `Building.draw()`.
  For a 4-point base it builds two slanted red roof polygons from the midpoints
  of base edges `0→1` and `2→3`, raised to the **full** `this.height`, while the
  walls/ceiling use `this.height * BUILDING_CEILING_HEIGHT_RATIO` (0.6). Roof
  fill `#D44`, stroke `#C44`. Reuse this exact geometry recipe.
- **Painter's algorithm:** the 3D view draws polygons in the order
  `#getPolygons()` returns them, back-to-front (see AGENTS.md "3D uses Painter's
  algorithm"). Within one building the draw order must be sides → ceiling →
  roof so the roof paints on top.

## `Building.height` note (coordinate with `osm-building-import` task)

`Building` has a per-instance `height` (default 200). The 3D camera currently
**ignores** it and uses the fixed `EXTRUDE_BUILDING_HEIGHT_PX`. As part of this
task, make the 3D extrusion use the **per-building height** so the sibling
`osm-building-import` task (which sets real heights from OSM) works without
further change. If that task hasn't landed yet, every building still has height
200, so behaviour is unchanged for generated worlds.

---

## Implementation plan

1. **Add a roof-aware extrusion** in `ts/camera/extrusion.ts`, e.g.
   `extrudeBuildingShape(base: Polygon, wallHeight: number, roofHeight: number):
{ walls: Polygon[]; roof: Polygon[] }`:
   - `walls`: the N side quads + the flat ceiling at `z = -wallHeight` (same as
     `extrudePolygons` produces today), where `wallHeight = height * 0.6`.
   - `roof`: for a **4-point** base, the two slanted gable polygons — mirror
     `Building.draw()`: midpoints of edges `0→1` and `2→3`, raised to
     `z = -height` (full height). For a non-4-point base, `roof: []` (the flat
     ceiling already caps it — same rule the 2D draw uses).
   - Keep the `z` sign convention consistent with `extrudePolygons`
     (ceiling/roof are at negative z = up in this projection).
2. **Rewrite `#buildBuildingPolygons`** in `ts/camera/camera.ts` to call the new
   helper per building (using `building.height`), style the walls grey (as now)
   and the roof red (`#D44` fill / `#C44` stroke), and return them in
   sides→ceiling→roof order per building so the roof layers correctly.
3. Introduce named constants for the wall/roof ratio and roof colours at the top
   of `camera.ts` (match the existing named-constant convention there) rather
   than raw literals. Reuse `BUILDING_CEILING_HEIGHT_RATIO` semantics from
   `building.ts` (0.6) — do not hardcode `0.6` inline.
4. Keep the existing **centroid distance pre-filter + frustum filter** in
   `#buildBuildingPolygons` (perf path documented in AGENTS.md — buildings/trees
   are pre-rejected by cached centroid before the expensive frustum math). Do
   NOT reintroduce full polygon math per building.

---

## Constraints

- **Do not touch the 2D top-view** (`Building.draw()`) — only the 3D camera path.
- Preserve the camera perf pre-filters and painter's-order (AGENTS.md).
- No new runtime dependencies; Canvas 2D + hand-rolled math only.
- The roof recipe is only defined for 4-point footprints — match the 2D
  fallback (flat ceiling only) for anything else.

---

## Acceptance criteria

- `npm run rebuild` compiles cleanly; `npm run fix:all` and `npm test` pass.
- **Visual:** the 3D race camera (`html/race.html?mode=camera`) shows buildings
  with red pitched roofs instead of flat grey tops. Run `npm run test:visual`;
  the **race baseline will legitimately change** — update it with
  `npm run test:visual:update` and commit the new baseline (this is the one task
  where a baseline change is expected and correct).
- Generated worlds (all buildings height 200) render identically to the 2D
  map's roof styling, just in 3D.
- Add a unit test for `extrudeBuildingShape` (roof present for a 4-point square,
  empty roof for a triangle; vertex z-heights correct).

---

## Out of scope

- Real OSM building footprints / heights — that's the `osm-building-import` task
  (this task only improves how a building is _drawn_ in 3D, whatever its shape).
- Windows, doors, textures, per-type colours.
