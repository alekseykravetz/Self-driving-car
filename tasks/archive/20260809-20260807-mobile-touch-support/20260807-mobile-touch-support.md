# Mobile Touch Support — Top-View Maps, World Editors, Minimaps

**Date:** 2026-08-07
**Slug:** mobile-touch-support
**Entry points affected:** html/simulator.html, html/traffic.html, html/world.html, html/human-training.html, html/race.html, index.html
**Save-file impact:** none
**Backward compat:** preserved — all existing mouse/wheel desktop behavior must keep working unchanged.

**Audience:** an AI coding agent with **zero prior context** on this
conversation — everything needed to implement is in this file.

---

## Goal

The app works great with a mouse or trackpad but is nearly unusable on phones
and tablets. Touch input is not wired up: you cannot pan or pinch-zoom the
top-view maps or minimaps, and you cannot draw roads/place markings in the
world editor by touch. The only touch code in the repo today is
`ts/car/controls/phoneControls.ts` (device-tilt driving for the race view) —
everything else is mouse-only.

Deliver a unified touch experience across the interactive canvases:

- **One-finger pan** on top-view maps.
- **Pinch-to-zoom** (two fingers), zooming toward the finger midpoint.
- **Single tap** to draw / place points in the world editor.
- **Two-finger tap OR long-press (500 ms)** = the right-click equivalent
  (delete point / delete marking / deselect).
- **Minimap:** one-finger pan, pinch zoom, and **single tap recenters the main
  viewport** on the tapped world location.
- **Landing page:** hide the **Human Backpropagation** section entirely on
  mobile.

### Explicit decisions already made (do not re-litigate)

1. Long-press threshold = **500 ms**.
2. Minimap single tap = **recenter the main map** on the tapped point.
3. **Do NOT touch the toolbars.** No hiding, no re-layout, no pre-selecting
   toolbar options. The existing `styles/pages/_mobile.css` toolbar rules are
   correct as-is. The ONLY landing/CSS change in this task is hiding the Human
   Backpropagation card on mobile (Phase 5).
4. Approach = **Pointer Events** (unify mouse + touch + pen in one code path),
   NOT separate raw `touchstart/touchmove/touchend` listeners.

---

## Why Pointer Events (read before coding)

`PointerEvent extends MouseEvent`. It carries `button`, `buttons`, `offsetX`,
and `offsetY` — exactly the fields the existing code reads. This means:

- `Viewport.getMouse(e)` (which reads `e.offsetX/e.offsetY`) works unchanged
  for a single pointer once its parameter type is widened to
  `PointerEvent | MouseEvent`.
- Every editor's single-pointer path (`#handleMouseDown/Move/Up`) works
  unchanged once retyped, because a `pointerdown` from one finger delivers the
  same `offsetX/offsetY/button` shape a `mousedown` does.

So the migration is mostly: (a) swap `addEventListener('mousedown', …)` →
`'pointerdown'`, etc.; (b) add multi-touch bookkeeping for pinch + two-finger
gestures in ONE shared helper; (c) route single vs multi-finger correctly.

**Coordinate math does not change.** Do not rewrite `getMouse`'s formula.

---

## Context files (read these first)

- `ts/viewport/viewport.ts` — pan/zoom for all top-view maps. Today: pan is
  bound to **middle-mouse only** (`e.button === 1`); zoom is wheel-only.
  `getMouse(e)` converts screen→world using `e.offsetX/offsetY`. Has a
  `mode: 'mouse' | 'touchpad'` for wheel behavior (leave that alone).
- `ts/world/editors/graphEditor.ts` — road drawing. `mousedown/move/up` +
  `contextmenu`. Right-click (`e.button === 2`) deletes/deselects. Single-click
  places/links points; drag moves a point.
- `ts/world/editors/markingEditor.ts` — base class for marking placement.
  Left-click places `intent`; right-click deletes marking under cursor.
- `ts/world/editors/corridorEditor.ts`, `ts/world/editors/inspectEditor.ts`,
  `ts/world/editors/lightEditor.ts` — same mouse pattern. `lightEditor.ts`
  uses `stopImmediatePropagation()` on mousedown to intercept clicks on
  existing lights (see AGENTS.md "Traffic control override").
- `ts/mini-map/miniMap.ts` — draws a minimap; currently has **no input
  listeners** (zoom only via `zoomIn()/zoomOut()` buttons). `#scaler` is
  world→minimap scale; `draw({ viewPoint, … })` centers on `viewPoint`.
- `ts/input/keyboardManager.ts` — the centralized keyboard router. Touch/pointer
  routing is separate from this; do NOT try to funnel pointer events through it.
- `ts/car/controls/phoneControls.ts` — the existing (unrelated) touch code for
  race tilt-driving. Leave it alone; it is a good reference for `{ passive }`
  listener options.
- `styles/pages/_mobile.css` — existing mobile CSS. Uses `@media` +
  `:has()` selectors already. Phase 5 adds one rule here.
- `index.html` — landing page. The Human Backpropagation section is the
  `<section class="landing-card">` at ~line 103 whose links point to
  `html/human-training.html` (`<!-- Section 2: Human Backpropagation -->`).
- Docs to update at the end: `docs/Viewport.md`, `docs/Controls.md`,
  `docs/WorldEditor.md`.

---

## Gesture routing — the core UX rule

There is a fundamental conflict: on a top-view map a one-finger drag should
**pan the viewport**, but in the world editor a one-finger drag should
**draw/drag a point**. Resolve it with a per-viewport mode flag:

Add to `Viewport`:

```ts
export type TouchPanMode = 'one-finger' | 'two-finger-only';
```

- **Simulators / traffic (no drawing tool):** `touchPanMode = 'one-finger'`
  (default). One finger pans, pinch zooms, two-finger also pans.
- **World editor with an active drawing tool:** the world editor sets
  `viewport.setTouchPanMode('two-finger-only')` when a tool is enabled and
  restores `'one-finger'` when all tools are disabled. In this mode the
  Viewport ignores single-finger drags (they flow to the editor), and only
  **two-finger** gestures pan/zoom.

Concretely:

| Surface / mode                               | 1 finger drag   | 2 finger drag | pinch | tap           | 2-finger tap / long-press |
| -------------------------------------------- | --------------- | ------------- | ----- | ------------- | ------------------------- |
| Simulator/traffic map (`one-finger`)         | pan             | pan           | zoom  | (spawn/none)  | —                         |
| World editor tool active (`two-finger-only`) | draw/drag point | pan           | zoom  | place/link    | delete (right-click)      |
| Minimap                                      | pan minimap     | pan minimap   | zoom  | recenter main | —                         |

The Viewport owns two-finger pan + pinch in BOTH modes; only the single-finger
branch differs.

---

## Phase 1 — Foundation

### 1a. HTML viewport meta + touch-action

For the 5 **app** pages (NOT the landing `index.html`), stop the browser from
stealing gestures for its own pinch-zoom / scroll:

- `html/simulator.html`, `html/traffic.html`, `html/world.html`,
  `html/human-training.html`, `html/race.html`:
  change the meta to:
  ```html
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
  />
  ```
- Leave `index.html`'s meta pinchable (do NOT add `user-scalable=no` there).

In the page CSS entries (or a shared canvas rule), ensure interactive canvases
have:

```css
canvas {
  touch-action: none;
  -ms-touch-action: none;
}
```

Add this scoped to the simulator/world/traffic/human-training/race canvases
(e.g. in each page's CSS entry via the existing `styles/` structure). Do NOT
apply `touch-action: none` to the whole landing page. `touch-action: none` is
what lets `preventDefault()` in pointer handlers actually suppress native
scroll/zoom.

### 1b. Shared gesture helper — `ts/input/pointerGestures.ts` (NEW)

A single, unit-tested module that tracks active pointers on a canvas and emits
high-level callbacks. This is the heart of the task — keep all multi-touch
bookkeeping here so it is not duplicated across 6 files.

Proposed API:

```ts
export interface GestureWorldPoint {
  x: number;
  y: number;
} // canvas offset coords

export interface PointerGestureCallbacks {
  /** Single-finger press. Return false to let the gesture be treated as a
   *  potential pan (used by viewport); editors return void. */
  onDragStart?: (p: GestureWorldPoint, e: PointerEvent) => void;
  onDragMove?: (p: GestureWorldPoint, e: PointerEvent) => void;
  onDragEnd?: (p: GestureWorldPoint, e: PointerEvent) => void;
  /** Fired on pointerup if it was a tap (no significant move, short duration). */
  onTap?: (p: GestureWorldPoint, e: PointerEvent) => void;
  /** Two-finger pinch. scale = current/previous distance; focal = midpoint. */
  onPinch?: (scale: number, focal: GestureWorldPoint) => void;
  /** Two-finger drag pan. delta is in canvas px since last move. */
  onTwoFingerPan?: (dx: number, dy: number) => void;
  /** Right-click equivalent: two-finger tap OR long-press (500 ms). */
  onSecondaryTap?: (p: GestureWorldPoint, e: PointerEvent) => void;
}

export interface PointerGestureOptions {
  longPressMs?: number; // default 500
  tapMoveTolerancePx?: number; // default ~8
  tapMaxDurationMs?: number; // default ~300
  /** When true, single-finger drags are ignored (two-finger-only mode). */
  singleFingerPanDisabled?: () => boolean;
}

export class PointerGestures {
  constructor(
    canvas: HTMLCanvasElement,
    cb: PointerGestureCallbacks,
    opts?: PointerGestureOptions,
  );
  enable(): void;
  disable(): void;
}
```

Implementation notes:

- Track a `Map<number, {x,y,startX,startY,startT}>` keyed by `pointerId`.
- Use `pointerdown/pointermove/pointerup/pointercancel`. Call
  `canvas.setPointerCapture(e.pointerId)` on down so moves keep coming if the
  finger slides off the canvas; release on up/cancel.
- **1 active pointer:** drive `onDragStart/Move/End`; detect tap (moved <
  tolerance AND duration < tapMaxDuration) → `onTap`; start a 500 ms long-press
  timer on down that fires `onSecondaryTap` if still held & not moved, then
  cancels the pending tap/drag.
- **2 active pointers:** cancel any long-press timer; compute distance and
  midpoint each move → emit `onPinch(scale, focalMidpoint)` and
  `onTwoFingerPan(dx, dy)`. If both go up quickly without moving → treat as a
  **two-finger tap** → `onSecondaryTap`.
- Ignore `pointerType === 'mouse'` for the tap/long-press/pinch synthesis so
  desktop mouse keeps flowing through the existing mouse listeners untouched.
  (i.e. the gesture helper only synthesizes for `touch`/`pen`. Mouse buttons
  are still handled by the pre-existing mouse handlers you are keeping.)
- `preventDefault()` on handled touch moves to stop scroll.

Unit tests: `tests/unit/input/pointerGestures.test.ts` — synthesize
`PointerEvent`-like objects and assert callbacks (tap vs long-press vs pinch vs
two-finger-tap vs single-finger drag; verify `singleFingerPanDisabled` gating).
Follow the existing pure-logic test style (no real DOM; a minimal fake canvas
with `addEventListener/setPointerCapture` stubs).

---

## Phase 2 — Viewport pan/zoom (`ts/viewport/viewport.ts`)

1. Widen `getMouse(e: MouseEvent, …)` → `getMouse(e: PointerEvent | MouseEvent, …)`.
   No body change (offsetX/offsetY exist on both).
2. Add `#touchPanMode: TouchPanMode = 'one-finger'` + public
   `setTouchPanMode(mode)`.
3. Keep the existing mouse `wheel` + middle-mouse-drag listeners exactly as-is
   (desktop unchanged).
4. Instantiate a `PointerGestures` on `this.canvas`:
   - `onDragStart/Move/End` (single finger): only act when
     `#touchPanMode === 'one-finger'`. Reuse the existing `#drag` state machine
     — on start record `getMouse` world start; on move update `#drag.offset`;
     on end commit into `this.offset` (mirror `#handleMouseDown/Move/Up` but for
     button-less touch). Pass `singleFingerPanDisabled: () => this.#touchPanMode === 'two-finger-only'`
     so the helper suppresses single-finger drags in editor mode.
   - `onTwoFingerPan(dx, dy)`: `this.offset = add(this.offset, new Point(dx * this.zoom, dy * this.zoom))`.
     (Sign: dragging content right should move the world right — match the
     existing wheel-pan sign convention in `#handleMouseWheel`'s touchpad
     branch, which uses `-e.deltaX`. Two-finger content-drag pan is the
     opposite sign of scroll delta, so `+dx`. Verify direction on device.)
   - `onPinch(scale, focal)`: zoom toward the focal point. Convert `focal`
     (canvas offset coords) to a world point BEFORE, apply
     `this.zoom = clampZoom(this.zoom / scale)` (pinch apart → scale>1 → zoom
     in → smaller `zoom` value; confirm against `MIN_ZOOM=0.8`/`MAX_ZOOM=30`
     semantics where SMALLER zoom = more zoomed in), then adjust `this.offset`
     so the same world point stays under `focal`. Reuse the `getMouse`-style
     inverse to keep the focal world point fixed.
5. Add pointer-based tests to
   `tests/unit/viewport/viewport.interaction.test.ts`: single-finger pan commit,
   two-finger pan offset delta, pinch changes zoom and keeps focal point fixed,
   and that single-finger pan is suppressed when `two-finger-only`.

---

## Phase 3 — Editors

For each of `graphEditor.ts`, `markingEditor.ts`, `corridorEditor.ts`,
`inspectEditor.ts`, `lightEditor.ts`:

1. Retype the bound handlers' params to `PointerEvent | MouseEvent`.
2. Keep the existing `mousedown/mousemove/mouseup/contextmenu` listeners for
   desktop. ADD a `PointerGestures` instance (touch/pen only) wired as:
   - `onDragStart` → existing `#handleMouseDown`-equivalent for a left press
     (place/select/start-drag). For editors that distinguish button, synthesize
     `button: 0`.
   - `onDragMove` → existing `#handleMouseMove` (hover/drag preview).
   - `onDragEnd` → existing mouseup (`#dragging = false`, commit).
   - `onTap` → for editors where a click places on up (marking/light), fire the
     place action.
   - `onSecondaryTap` → the existing **right-click branch** (`e.button === 2`):
     delete point / delete marking / deselect. Extract that branch into a small
     private method (e.g. `#handleSecondary(worldPoint)`) so both the
     `contextmenu`/right-click path and the touch secondary path call it.
3. In the world editor host (the object that enables/disables these editors —
   `ts/world/editors/worldEditor.ts`), call
   `viewport.setTouchPanMode('two-finger-only')` when ANY drawing tool becomes
   active and `viewport.setTouchPanMode('one-finger')` when returning to a
   no-tool state. Ensure enable/disable of each editor keeps the mode correct
   (e.g. switching directly between two tools stays `two-finger-only`).
4. `lightEditor.ts`: preserve the `stopImmediatePropagation()` interception
   behavior — the pointer path must also let a tap on an existing light cycle
   its override BEFORE the base marking-placement runs. Verify tap ordering.

Editors have no dedicated interaction unit tests today (draw/DOM paths are
excluded from unit tests per AGENTS.md "Testing"). Do NOT add DOM/canvas unit
tests here; rely on the `PointerGestures` unit tests + manual device check.

---

## Phase 4 — Minimap (`ts/mini-map/miniMap.ts`)

1. The minimap currently has no listeners and is drawn by a host each frame.
   Add an `enableInput()` that attaches a `PointerGestures` to `#canvas`, and a
   way for the host to react to a tap (recenter the MAIN viewport).
2. Because `MiniMap` must not import `Viewport` (keep it decoupled — it only
   knows a `#graph`, `#scaler`, and the `viewPoint` passed to `draw`), expose a
   callback the host wires up:
   ```ts
   setOnRecenter(cb: (worldPoint: Point) => void): void;
   ```
   - `onTap(canvasPt)` → convert the minimap canvas point to a **world point**
     using the inverse of `draw`'s transform (`translate(scaledViewPoint + size/2)`
     then `scale(#scaler)`), then call the recenter callback with that world
     point.
   - `onDragStart/Move` → pan the minimap's `viewPoint` locally OR call a
     `setOnPan` callback so the host can move the main viewport (decide: for
     "one-way sync" cleanliness, panning the minimap should move the MAIN
     viewport, mirroring how tap recenters it — prefer a single
     `setOnRecenter`/`setOnPan` host callback rather than internal state).
   - `onPinch` → reuse `zoomIn()/zoomOut()` logic via a continuous
     `#setScaler(this.#scaler * scale)` (respect `MIN_SCALER`/`MAX_SCALER`).
3. In each host that draws a minimap (search for `new MiniMap(` /
   `miniMap.draw(`), wire `setOnRecenter(p => viewport.recenterOn(p))`. Add a
   `Viewport.recenterOn(worldPoint: Point)` helper that sets `this.offset` so
   `worldPoint` maps to screen center (`offset = scale(worldPoint, -1)` given
   the `reset()` transform where screen center → `-getOffset()`).
4. Guard: only enable minimap input on touch-capable/host contexts where the
   minimap is interactive; do not break the desktop minimap zoom buttons.

---

## Phase 5 — Landing page: hide Human Backpropagation on mobile

Single CSS rule, no HTML/JS change. In `styles/pages/_mobile.css`, inside the
existing `@media (max-width: 768px)` block, add:

```css
/* Human Backpropagation is not touch-friendly yet — hide it on phones. */
.landing-card:has(a[href^='html/human-training.html']) {
  display: none;
}
```

This targets the Section-2 card by its `human-training.html` links (mirrors the
existing pattern that hides the race links via
`a[href='html/race.html']`). Verify the `:has()` selector matches ONLY the
Human Backpropagation card and not the training card (the training card links
to `html/simulator.html`, so it will not match). If the landing grid leaves an
empty column, confirm the single-column mobile layout (already set at 768px)
collapses cleanly.

---

## Phase 6 — Tests, build, docs

1. `npm run fix:all` (format + lint) — required before considering done.
2. `npm test` — all unit tests pass, including the new
   `tests/unit/input/pointerGestures.test.ts` and viewport pointer cases.
3. `npm run test:visual` — visual baselines must be unchanged. The specs mask
   all `<canvas>` elements and append `?paused=1`, so canvas gesture code does
   not affect pixels. The landing-page mobile change is under a `max-width`
   media query; confirm no desktop-width baseline shifts. If a landing visual
   test runs at mobile width and now legitimately differs, update the baseline
   with `npm run test:visual:update` and commit it.
4. Rebuild TS if needed: `npm run rebuild` (never edit `js/` directly).
5. Update docs:
   - `docs/Viewport.md` — document `TouchPanMode`, `setTouchPanMode`,
     `recenterOn`, and the pointer/pinch gesture handling.
   - `docs/Controls.md` — document the new touch gestures and the
     `PointerGestures` helper (there is already a touch section stub around
     line 240).
   - `docs/WorldEditor.md` — document two-finger-only pan while a tool is
     active, tap-to-place, and long-press/two-finger-tap = delete.
6. Update `AGENTS.md` if a new cross-cutting invariant is introduced (e.g. "all
   canvas pointer input routes through `PointerGestures`; do not add raw
   `touchstart` listeners" — mirror the existing keyboard-routing invariant).

---

## Acceptance criteria

- On a phone (iOS Safari AND Android Chrome):
  - Simulator/traffic/world top-view maps: one-finger pan + pinch-zoom work
    smoothly; the page itself does not scroll or browser-zoom while
    interacting with the canvas.
  - World editor: tap places/links points and markings; drag moves a point;
    two-finger drag pans and pinch zooms WITHOUT drawing; long-press (500 ms)
    or two-finger tap deletes (right-click equivalent).
  - Minimap: one-finger pan, pinch zoom, and single tap recenters the main map.
  - Landing page: the Human Backpropagation card is not shown.
- On desktop (mouse + trackpad): behavior is byte-for-byte unchanged — wheel
  zoom, middle-drag pan, left-click draw, right-click delete, minimap zoom
  buttons all work exactly as before.
- `npm run fix:all`, `npm test`, and `npm run test:visual` all pass.

---

## Constraints / gotchas (repo-specific)

- Import paths use the `.js` extension even in `.ts` sources (`nodenext`).
- Private members use `#` prefix (ES2022). Match surrounding style.
- No new runtime dependencies (AGENTS.md "Architecture rules"). Pointer Events
  are a native browser API — no library.
- Do NOT route pointer input through `KeyboardManager`.
- Do NOT touch `phoneControls.ts` or the toolbars.
- Keep `Viewport.mode` ('mouse'/'touchpad' wheel behavior) — that is a
  separate, pre-existing feature; do not conflate it with `touchPanMode`.
- Prettier uses `singleQuote: true` — keep it.

```

```
