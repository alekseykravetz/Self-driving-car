# Refactor: Separate Canvas Drawing from Marker Detection in `CameraControls`

**Date:** 2026-07-25
**Slug:** refactor-camera-controls-draw-separation
**Entry points affected:** `html/race.html?mode=camera` (camera-based steering). No other page uses `CameraControls`.
**Save-file impact:** none
**Backward compat:** must be preserved — steering behavior from the camera must be identical

## Goal

`ts/car/controls/cameraControls.ts` violates the project rule that **canvas context work belongs only in `draw()` methods**. Its `#processMarkers()` method (marker/vision detection logic) also performs canvas drawing (`ctx.beginPath()`, `ctx.fillStyle`, `ctx.arc()`, `ctx.fill()`) to visualize the detected wheel center and marker centroids. Detection logic and rendering are entangled in the same method and driven from `#loop()`.

Separate the concerns: `#processMarkers()` should only _compute_ detection state (forward/reverse, sizes, centroids); a distinct draw step should _render_ the overlay. This keeps detection pure and confines canvas mutation to a rendering method, matching the architecture rule.

**Behavior-preserving: the camera control decisions (forward/reverse thresholds) and the on-screen overlay must look and behave the same.**

## Context (read first)

- `AGENTS.md` (repo root) — rule: _"Canvas context manipulation must occur within `draw(ctx, options?)` methods, not in physics, detection, or simulation loops."_ Also read the **"Known exception — keyboard controls in `Controls`"** section for how control classes are structured (this task does NOT touch keyboard handling).
- Layer rules: `ts/car/controls/` is Layer 2. Canvas allowed only in draw methods. Private members use `#`. Imports use `.js`.

### Key source file

- `ts/car/controls/cameraControls.ts`:
  - `#processMarkers(...)` (~lines 100-150): computes `this.forward`/`this.reverse` from `sizeRatio` vs `REVERSE_SIZE_RATIO` / `FORWARD_SIZE_RATIO`, then draws the wheel-center circle (blue/red/gray) and the two lime marker-centroid dots directly to `this.ctx`.
  - `#loop()` (~line 150+): the render/detect loop that mirrors the video onto the canvas (`ctx.save()/translate/scale/drawImage`) and calls `#processMarkers`.
- Note: `#loop()` legitimately draws the mirrored **video frame** — that is the camera preview and is acceptable as a render step. The problem is specifically the _detection-result overlay_ drawing living inside the _detection_ method.

## Architecture rules

1. **`#processMarkers()` (or its renamed detect method) must not touch `this.ctx`.** It computes and stores detection state only (forward/reverse booleans, and the wheelCenter/wheelRadius/centroids needed for the overlay — store them on private fields or return them).
2. **Introduce a dedicated overlay draw step**, e.g. private `#drawDetectionOverlay(detection)`, that performs all the `beginPath/fillStyle/arc/fill` calls. Call it from `#loop()` AFTER detection, in the same visual position as today (so the overlay still renders on top of the mirrored video).
3. **Keep the video-mirror drawing where it is** in `#loop()` (it is already a render step; optionally extract to `#drawVideoFrame()` for symmetry, but not required).
4. **No change to detection thresholds** (`REVERSE_SIZE_RATIO`, `FORWARD_SIZE_RATIO`), initialization (`expectedSize`), or the resulting `forward`/`reverse` outputs.
5. **No canvas work in the constructor.**

## Scope

### In scope

- Split `#processMarkers()` into a pure detection method (no ctx) + a `#drawDetectionOverlay(...)` render method.
- Wire `#loop()` to call detect, then draw overlay, preserving z-order and visuals.
- Minimal private fields to pass detection results (wheelCenter, wheelRadius, marker centroids, forward/reverse) from detect → draw, if not returned directly.

### Out of scope

- Keyboard handling in `ts/car/controls/controls.ts` (the documented raw-listener exception) — do not touch.
- `PhoneControls` — out of scope.
- Changing the camera/vision detection algorithm or thresholds.
- Any change to how `Car` consumes `CameraControls.forward/reverse`.

## Suggested steps

1. Read `cameraControls.ts` fully; identify exactly which values the overlay draw needs (wheelCenter, wheelRadius, the two marker centroids, forward/reverse).
2. Refactor `#processMarkers` to compute and store/return those values without any `this.ctx.*` calls.
3. Add `#drawDetectionOverlay(...)` containing the moved `beginPath/fillStyle/arc/fill` calls.
4. In `#loop()`, call detection then `#drawDetectionOverlay(...)` at the same point the drawing happened before.
5. `npx tsc --noEmit` until clean.
6. `npm test` green.
7. `npm run fix:all`.

## Verification / acceptance criteria

- [ ] `npx tsc --noEmit` passes.
- [ ] `npm run lint:log` clean; `npm run format:check` clean.
- [ ] `npm test` green.
- [ ] `rg -n "ctx\.(beginPath|fillRect|arc|fill|fillStyle)" ts/car/controls/cameraControls.ts` shows canvas calls ONLY inside `#loop()` / `#draw*` render methods — none inside the detection method.
- [ ] Manual smoke check on `html/race.html?mode=camera` (if a camera is available): overlay circles render identically and forward/reverse still respond to marker size. If no camera is available, document that visual verification was skipped and rely on the code review that the moved drawing calls are byte-identical.
- [ ] No change to detection thresholds or `forward`/`reverse` outputs.
