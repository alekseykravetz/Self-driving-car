# Split Camera — Extract Frustum/Projection Math

**Date:** 2026-08-04
**Slug:** split-camera-ts
**Entry points affected:** html/race.html (`?mode=camera`/`?mode=phone`), any 3D camera view
**Save-file impact:** none
**Backward compat:** preserved (no public API changes visible to callers)

**Audience:** an AI coding agent with **zero prior context** on this
conversation — everything needed is in this file.

## Goal

`ts/camera/camera.ts` (713 lines) is on the architecture audit's god-object
watch-list (see `AGENTS.md` "Anti-Patterns to Flag"). It already delegates
extrusion math to `ts/camera/extrusion.ts` and road-text glyph geometry to
`ts/camera/roadText.ts` — extend that same established pattern one step
further by extracting the camera's **view-frustum and projection math**
(position/orientation state, frustum-point computation, point projection,
polygon/segment visibility filtering, near-plane clipping) into its own
collaborator, separate from the **scene-assembly** logic in `#getPolygons`
(which gathers/colors/extrudes world objects into drawable polygons using
that frustum math). No behavior change.

## Context (read first)

- [ts/camera/camera.ts](../ts/camera/camera.ts) — read in full.
- [ts/camera/extrusion.ts](../ts/camera/extrusion.ts) and
  [ts/camera/roadText.ts](../ts/camera/roadText.ts) — the existing sibling
  collaborators this task's new file should sit alongside stylistically
  (plain exported functions/classes, no DOM, pure geometry).
- [tests/unit/camera/camera.test.ts](../tests/unit/camera/camera.test.ts) —
  imports only the `Camera` class (construction, `simpleMove`, `move`,
  `render` describe blocks). It does not reach into any private method, so
  this extraction is safe as long as `Camera`'s public surface (`constructor`,
  `move`, `simpleMove`, `render`, `draw`, and the public fields `x`/`y`/`z`/
  `angle`/`range`/`distanceBehind`/`center`/`tip`/`left`/`right`/`polygon`)
  is preserved exactly — those public fields are read directly by
  `tests/unit/camera/camera.test.ts`'s `simpleMove`/`move` assertions, so do
  NOT turn them into private fields on a sub-object; keep them as public
  fields on `Camera` itself, delegating their _computation_ to the new
  collaborator internally.
- `docs/Camera.md` — read for the documented behavior of frustum filtering,
  clipping, and the painter's-algorithm render order; this must not change.

## Scope

- **In scope:**
  - Create `ts/camera/cameraFrustum.ts` exporting a class `CameraFrustum`
    that owns: `#updateFrustumPoints` (recompute `center`/`tip`/`left`/
    `right`/`polygon` from `x`/`y`/`z`/`angle`/`range`), `#projectPoint`,
    `#filter`, `#forward`, `#inFront`, `#nearPlaneClip`, `#visibleRange` —
    moved verbatim (renamed to public methods without the `#`, e.g.
    `updateFrustumPoints`, `projectPoint`, `filter`, `forward`, `inFront`,
    `nearPlaneClip`, `visibleRange`).
  - `Camera` holds `#frustum = new CameraFrustum(...)` and:
    - keeps its own public `x`/`y`/`z`/`angle`/`range`/`distanceBehind`
      fields (unchanged, since the test reads them directly), computed the
      same way in `move`/`simpleMove`;
    - after computing new `x`/`y`/`z`/`angle`, calls
      `this.#frustum.updateFrustumPoints(this.x, this.y, this.z, this.angle, this.range)`
      and copies the returned `{center, tip, left, right, polygon}` onto its
      own public fields (`this.center = result.center`, etc.) so external
      readers see no difference;
    - `#projectPoint`, `#filter`, `#emitRoadLine`'s use of `#visibleRange`,
      and `#getPolygons`'s use of `#inFront` all delegate to
      `this.#frustum.projectPoint(...)`, `this.#frustum.filter(...)`, etc.
  - `#emitRoadLine` and `#getPolygons` stay on `Camera` (they assemble
    world-specific polygons and are out of scope for this task — see the
    sibling extraction opportunity noted below, which this task does NOT do).
- **Out of scope:**
  - `#getPolygons` itself — this is the largest remaining method (~350
    lines) but it is scene-assembly (buildings/trees/roads/cars/traffic/
    markings/lights), not frustum math, and further splitting it (e.g. into
    per-feature "scene builder" functions) is a separate, larger, higher-risk
    task not covered here. Do not attempt it as part of this task.
  - `render()`/`draw()` — public API, unchanged.
  - `extrusion.ts`/`roadText.ts` — already extracted, untouched.

## Implementation

### `ts/camera/cameraFrustum.ts` (new file)

- Export class `CameraFrustum`.
- Move `#updateFrustumPoints`→`updateFrustumPoints(x, y, z, angle, range): { center: Point; tip: Point; left: Point; right: Point; polygon: Polygon }`
  (pure function of its inputs — no need to store x/y/z/angle/range as
  fields on `CameraFrustum` itself, since `Camera` already owns those; but it
  DOES need to store the resulting `polygon`/`center` internally for
  `filter`/`inFront`/`nearPlaneClip`/`visibleRange` to use, so give it
  private fields `#center`, `#tip`, `#left`, `#right`, `#polygon`, `#x`,
  `#y`, `#angle` populated by `updateFrustumPoints`).
- Move `#projectPoint(ctx, p)`→`projectPoint(ctx, p)` verbatim (uses
  `#center`/`#tip`/`#x`/`#y`/`#z` — add a `#z` field too, populated by
  `updateFrustumPoints`).
- Move `#filter(polygons, clip?)`→`filter(polygons, clip?)`,
  `#forward()`→`forward()`, `#inFront(p)`→`inFront(p)`,
  `#nearPlaneClip(poly)`→`nearPlaneClip(poly)`,
  `#visibleRange(a, b)`→`visibleRange(a, b)` — verbatim, referencing the
  new private fields instead of `this.x`/`this.polygon`/etc.

### `ts/camera/camera.ts`

- Remove the seven moved private methods.
- Add `#frustum = new CameraFrustum()` field.
- In `move()`/`simpleMove()`, after computing `this.x`/`this.y`/`this.z`/
  `this.angle`, call
  `const f = this.#frustum.updateFrustumPoints(this.x, this.y, this.z, this.angle, this.range); this.center = f.center; this.tip = f.tip; this.left = f.left; this.right = f.right; this.polygon = f.polygon;`
  in place of the old direct `this.#updateFrustumPoints()` call.
- Replace every remaining internal use of `this.#projectPoint(...)`,
  `this.#filter(...)`, `this.#forward()`, `this.#inFront(...)`,
  `this.#nearPlaneClip(...)`, `this.#visibleRange(...)` (inside
  `#emitRoadLine`, `#getPolygons`, `render`) with
  `this.#frustum.projectPoint(...)`, `this.#frustum.filter(...)`, etc.

## Brain / persistence considerations

None — this task touches no save-file schema, sensor, or brain code.

## Acceptance criteria

- `tests/unit/camera/camera.test.ts` passes unmodified — specifically the
  `simpleMove`/`move` describe blocks, which read `camera.x`/`camera.y`/
  `camera.center`/etc. directly, and the `render` describe block, which
  exercises the full filter→project→draw pipeline via `mockCanvas2D`.
- Opening `html/race.html?mode=camera` renders the 3D view identically to
  before this change (roads, cars, buildings, trees, markings, traffic
  lights all in the same positions/colors — spot-check manually; this view
  is canvas-only and not covered by the Playwright visual suite's masked
  screenshots).
- `npm run rebuild`, `npm run fix:all`, `npx tsc --noEmit`, `npm test` all
  pass with the same test count as before this change.

## Docs to update

- `docs/Camera.md` — if it references specific private-method names
  (`#filter`, `#nearPlaneClip`, etc.) or file structure, update to mention
  that frustum/projection math now lives in `CameraFrustum`
  (`ts/camera/cameraFrustum.ts`), read the file first to confirm whether any
  such references exist before editing.
