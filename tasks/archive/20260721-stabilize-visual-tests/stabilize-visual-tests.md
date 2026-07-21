# Stabilize visual regression tests for cross-OS + animated canvas

**Date:** 2026-07-21
**Slug:** stabilize-visual-tests
**Entry points affected:** `html/simulator.html`, `html/traffic.html`, `html/race.html`, `html/world.html`, `html/human-training.html`
**Save-file impact:** none
**Backward compat:** preserved — `?paused=1` is an opt-in test hook, no effect on normal usage

## Goal

The Playwright visual regression tests fail in GitHub Actions (Ubuntu) because (1) baselines were captured on macOS and Chromium renders fonts differently across OSes, and (2) the tests screenshot live canvas animations whose state is non-deterministic at screenshot time. We fix both by pausing the animation loop before screenshotting and masking all `<canvas>` elements so the screenshot comparison covers only the stable HTML/CSS UI chrome. A generous `maxDiffPixels` threshold absorbs the remaining cross-OS font anti-aliasing differences.

## Context (read first)

- `tests/visual/playwright.config.ts` — Playwright config (viewport 1280×720, webServer on :9090, `snapshotPathTemplate` → `tests/visual/baselines/`).
- `tests/visual/*.spec.ts` — 5 spec files (human-training, race, simulator, traffic, world). All use `waitForTimeout(3000)` then `toHaveScreenshot` with `maxDiffPixels: 100` (race uses 2000).
- `ts/simulator/core/simulatorShell.ts` — abstract base for all simulators. Owns the rAF loop in `animate(time)` (line 288). Stores `animationFrameId` (line 100). `draw(time)` is `protected abstract` (line 275). Subclasses call `this.animate(0)` at end of constructor.
- `ts/world/editors/worldEditor.ts` — world editor. `animate()` at line 438 calls `this.draw()` then `requestAnimationFrame(this.animate.bind(this))`. Does NOT store the rAF id currently.
- Entry points (each constructs the simulator/editor then starts the loop via the constructor):
  - `ts/simulator/entry.ts` — TrainingSimulator (simulator.html)
  - `ts/traffic/entry.ts` — TrafficSimulator (traffic.html)
  - `ts/race/entry.ts` — RaceSimulator (race.html), reads `?mode=` param
  - `ts/world/entry.ts` — WorldEditor (world.html)
  - `ts/simulator/humanTraining/entry.ts` — HumanBackpropSimulator (human-training.html)
- Canvas IDs per page: `gameCanvas`, `networkCanvas`, `miniMapCanvas`, `cameraCanvas` (all simulator pages); `ironManCanvas` additionally on race.html; `myCanvas`, `miniMapCanvas` on world.html.
- AGENTS.md § Testing — visual tests section.

## Scope

- **In scope:**
  - Add `pause()` method to `SimulatorShell` (cancels rAF, one final draw).
  - Add `#animationFrameId` field + `pause()` method to `WorldEditor`.
  - Each of the 5 entry points: expose the instance on `window.__sim` and check `?paused=1` → call `pause()`.
  - Update all 5 spec files: navigate with `?paused=1`, mask all canvas elements, raise `maxDiffPixels` to 5000.
  - Regenerate baselines via `npm run test:visual:update`.
- **Out of scope:**
  - No changes to simulator/editor logic, rendering, or behavior when `?paused=1` is absent.
  - No CI workflow changes (the existing workflow already runs `npm run test:visual`).
  - No new tests, no unit test changes.

## Implementation

### 1. `ts/simulator/core/simulatorShell.ts` — add `pause()` method

Add a public method to `SimulatorShell`:

```ts
/**
 * Cancel the animation loop and render one final frame. Used by visual
 * regression tests via the `?paused=1` query param to produce a
 * deterministic canvas state before screenshotting.
 */
pause(): void {
  if (this.animationFrameId !== -1) {
    cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = -1;
  }
  this.draw(0);
}
```

Place this method immediately after the existing `animate(time)` method (after line 308). `draw()` is `protected abstract` but accessible from within the same class, so this compiles.

### 2. `ts/world/editors/worldEditor.ts` — add rAF id tracking + `pause()` method

The `WorldEditor.animate()` method (line 438) currently does not store the rAF id. Add a private field and modify `animate()` + add `pause()`:

- Add field near other fields (top of class): `#animationFrameId: number = -1;`
- Modify `animate()` (line 438):
  ```ts
  animate(): void {
    this.draw();
    this.#animationFrameId = requestAnimationFrame(this.animate.bind(this));
  }
  ```
- Add `pause()` method after `animate()`:
  ```ts
  /** Cancel the animation loop and render one final frame. Used by visual regression tests. */
  pause(): void {
    if (this.#animationFrameId !== -1) {
      cancelAnimationFrame(this.#animationFrameId);
      this.#animationFrameId = -1;
    }
    this.draw();
  }
  ```

### 3. Entry points — expose instance + check `?paused=1`

In each of the 5 entry files, after the `new SimulatorOrEditor(...)` call, add:

```ts
const __instance = new <SimulatorOrEditor>(...);
(window as unknown as { __sim: unknown }).__sim = __instance;
if (new URLSearchParams(window.location.search).has('paused')) {
  (__instance as { pause: () => void }).pause?.();
}
```

The exact variable name and constructor call differ per file — adapt to each. Use a local variable instead of passing the `new` expression directly. Files:

- `ts/simulator/entry.ts` — `const sim = new TrainingSimulator(...);` then expose + pause check.
- `ts/traffic/entry.ts` — `const sim = new TrafficSimulator(...);` then expose + pause check.
- `ts/race/entry.ts` — `const sim = new RaceSimulator(...);` then expose + pause check. NOTE: this file already reads `URLSearchParams` for `mode` — reuse or create a new `URLSearchParams` instance for the `paused` check.
- `ts/world/entry.ts` — `const worldEditor = new WorldEditor(...)` already exists on line 73. After the existing `worldEditor.animate()` call on line 80, add the expose + pause check. When `?paused=1` is present, `pause()` will cancel the rAF that `animate()` just scheduled.
- `ts/simulator/humanTraining/entry.ts` — `const sim = new HumanBackpropSimulator(...);` then expose + pause check.

### 4. Update spec files — `?paused=1`, mask canvases, raise threshold

For each spec file, make three changes:

**a. Add `?paused=1` to the URL:**

- `simulator.spec.ts`: `'/html/simulator.html?paused=1'`
- `traffic.spec.ts`: `'/html/traffic.html?paused=1'`
- `human-training.spec.ts`: `'/html/human-training.html?paused=1'`
- `world.spec.ts`: `'/html/world.html?paused=1'`
- `race.spec.ts` camera test: `'/html/race.html?mode=camera&paused=1'`
- `race.spec.ts` phone test: `'/html/race.html?mode=phone&paused=1'`

**b. Add `mask` option to `toHaveScreenshot`:**

Mask all `<canvas>` elements on the page. Use `page.locator('canvas')` to mask every canvas in one locator:

```ts
await expect(page).toHaveScreenshot('name.png', {
  fullPage: true,
  maxDiffPixels: 5000,
  mask: [page.locator('canvas')],
});
```

This masks all canvases (gameCanvas, networkCanvas, miniMapCanvas, cameraCanvas, ironManCanvas where present) with a solid color, so their animated/rendered content is excluded from the pixel comparison.

**c. Raise `maxDiffPixels` from 100 (or 2000) to 5000** for all tests. This absorbs cross-OS font anti-aliasing differences in the unmasked HTML/CSS UI chrome.

**d. Reduce `waitForTimeout`** from 3000 to 1000. With the animation paused, we only need to wait for the initial render + fonts to settle. 1 second is sufficient and speeds up the suite.

### 5. Regenerate baselines

After all code changes, run:

```bash
npm run rebuild
npm run test:visual:update
```

This regenerates all `tests/visual/baselines/*.png` files with the new masked+paused screenshots. The new baselines will have canvases covered by the mask color (pink by default). Commit the updated baselines.

## Brain / persistence considerations

None. The `?paused=1` hook is a read-only test affordance — it cancels the animation loop but does not modify any state, brains, or save files. The `window.__sim` global is a debugging convenience with no persistence impact.

## Acceptance criteria

- [ ] `SimulatorShell` has a public `pause()` method that cancels rAF and calls `draw(0)`.
- [ ] `WorldEditor` stores its rAF id and has a public `pause()` method.
- [ ] All 5 entry points expose the instance on `window.__sim` and call `pause()` when `?paused=1` is in the URL.
- [ ] All 5 spec files navigate with `?paused=1`, mask `page.locator('canvas')`, use `maxDiffPixels: 5000`, and `waitForTimeout(1000)`.
- [ ] Baselines regenerated via `npm run test:visual:update` — new baselines show masked (solid-color) canvas areas.
- [ ] `npm run rebuild` succeeds (no TS errors).
- [ ] `npm run fix:all` passes (format + lint).
- [ ] `npm test` passes (all existing unit tests still pass — no source logic changed).
- [ ] `npm run test:visual` passes locally (baselines match the new masked+paused screenshots).

## Docs to update

- `AGENTS.md` § Testing — add a note about the `?paused=1` test hook and the canvas masking strategy in the visual tests subsection.
- No new `docs/*.md` file needed — this is a test infrastructure change, not a feature.
