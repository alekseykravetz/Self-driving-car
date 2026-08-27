# Architecture Violations Cleanup

**Date:** 2026-08-27
**Slug:** arch-violations-cleanup
**Entry points affected:** `html/index.html` (landing), all pages (tooltip), `html/simulator.html`, `html/traffic.html`, `html/race.html`, `html/world.html`, `html/human-training.html` (LatchedToggle consumers)
**Save-file impact:** none
**Backward compat:** preserved — no behavioral changes, pure refactoring

## Goal

Fix the 6 architecture violations found by the architect audit: simulation logic in a UI organism, two raw keyboard listeners bypassing KeyboardManager, LatchedToggle in the wrong layer, upward type-only imports in `ts/world/types.ts`, and raw `rgba()` values in CSS. The 7th finding (deep import chains) is explicitly out of scope — accepted as-is per user decision.

## Context (read first)

- `/Users/alex/Code/Self-driving-car/AGENTS.md` — § "Architecture rules", § "Key gotchas" (known keyboard exception), § "UI Architecture — Atomic Design"
- `/Users/alex/Code/Self-driving-car/ts/ui/organisms/previewSimulator.ts` — the 358-line UI organism with embedded simulation logic
- `/Users/alex/Code/Self-driving-car/ts/landing/landingPreview.ts` — landing scroll controller with raw keydown listener (line 330)
- `/Users/alex/Code/Self-driving-car/ts/ui/atoms/tooltip.ts` — global tooltip controller with raw keydown listener (line 45)
- `/Users/alex/Code/Self-driving-car/ts/ui/atoms/latchedToggle.ts` — 42-line pure state machine, no UI, filed under UI atoms
- `/Users/alex/Code/Self-driving-car/ts/input/keyboardManager.ts` — imports LatchedToggle upward from `ts/ui/atoms/` (line 2)
- `/Users/alex/Code/Self-driving-car/ts/world/types.ts` — imports `Viewport`, `VisibleWorldRect` from `ts/viewport/` (Layer 3) and `IMiniMapCar` from `ts/mini-map/` (Layer 3); `MiniMapDrawOptions` interface is dead code (nobody imports it from this file)
- `/Users/alex/Code/Self-driving-car/ts/viewport/viewport.ts` — defines `VisibleWorldRect` (line 48); also defined duplicate in `ts/rendering/heatmapRenderer.ts` (line 4)
- `/Users/alex/Code/Self-driving-car/styles/tokens.css` — design tokens; all raw `rgba()` values should live here
- `/Users/alex/Code/Self-driving-car/styles/atoms/_base.css` — raw rgba in `--main-page-bg` radial gradients (lines 61, 66, 71)
- `/Users/alex/Code/Self-driving-car/styles/templates/_landing-page.css` — raw rgba in card sheen gradient, hover shadow, icon glow, logo drop-shadow, link bg (lines 47, 75-76, 111, 139, 148-149, 180)
- `/Users/alex/Code/Self-driving-car/styles/organisms/_preview-simulator.css` — raw rgba in card sheen gradient, pill inset highlights (lines 56-57, 132, 150, 158)
- `/Users/alex/Code/Self-driving-car/styles/organisms/_store-panel.css` — raw rgba in card sheen gradient, hover shadow, icon glow (lines 11-12, 51, 82-83)

## Scope

- **In scope:**
  1. Extract PreviewSimulator simulation logic from UI organism to `ts/landing/previewSimulatorEngine.ts`
  2. Document `tooltip.ts` raw keydown as a sanctioned exception (comment + AGENTS.md)
  3. Document `landingPreview.ts` raw keydown as a sanctioned exception (comment + AGENTS.md)
  4. Move `LatchedToggle` from `ts/ui/atoms/latchedToggle.ts` to `ts/input/latchedToggle.ts`
  5. Fix `ts/world/types.ts` upward imports: remove dead `MiniMapDrawOptions`, move `VisibleWorldRect` to math layer
  6. Extract raw `rgba()` CSS values into `tokens.css` tokens
- **Out of scope:**
  - Deep import chain flattening (finding #7 — accepted as-is)
  - Any behavioral changes to simulators, car physics, or rendering
  - New test files (existing tests should continue to pass after import path updates)

## Implementation

### Phase 1: Move LatchedToggle to ts/input/ (finding #4)

- Move `ts/ui/atoms/latchedToggle.ts` → `ts/input/latchedToggle.ts` (file content unchanged — it's a pure state machine with no UI, no DOM, no imports).
- Update import in `ts/input/keyboardManager.ts` line 2: change `from '../ui/atoms/latchedToggle.js'` → `from './latchedToggle.js'`.
- Update import in `ts/ui/organisms/worldEditorPanel.ts` line 7: change `from '../atoms/latchedToggle.js'` → `from '../../input/latchedToggle.js'`.
- Update import in `tests/unit/panels/latchedToggle.test.ts` line 2: change `from '../../../ts/ui/atoms/latchedToggle.js'` → `from '../../../ts/input/latchedToggle.js'`.
- Delete `ts/ui/atoms/latchedToggle.ts` (the old location). After `npm run rebuild` the stale `js/ui/atoms/latchedToggle.js` will be cleaned.

### Phase 2: Fix ts/world/types.ts upward imports (finding #5)

- **Remove dead `MiniMapDrawOptions`** interface from `ts/world/types.ts` (lines 57-65). Nobody imports it from this file — the actual `MiniMapDrawOptions` used by consumers lives in `ts/mini-map/miniMap.ts`.
- **Remove `import type { IMiniMapCar } from '../mini-map/miniMap.js'`** (line 11) — only used by the dead `MiniMapDrawOptions`.
- **Remove `Viewport`** from the viewport import on line 10 — only `VisibleWorldRect` is still needed (by `WorldDrawOptions.screenBounds`). Change to `import type { VisibleWorldRect } from '../math/primitives/rect.js'` (see next bullet).
- **Move `VisibleWorldRect` to the math layer**: create `ts/math/primitives/rect.ts` exporting `interface VisibleWorldRect { minX: number; maxX: number; minY: number; maxY: number; }`. This is a pure math rectangle — Layer 1, importable by all higher layers.
- **Update `ts/viewport/viewport.ts`**: remove the local `VisibleWorldRect` definition (line 48), import and re-export from `../math/primitives/rect.js` (`import type { VisibleWorldRect } from '../math/primitives/rect.js'; export type { VisibleWorldRect };`). This preserves backward compat for all existing consumers that import from viewport.
- **Update `ts/rendering/heatmapRenderer.ts`**: remove the duplicate `VisibleWorldRect` definition (line 4), import and re-export from `../math/primitives/rect.js` (`import type { VisibleWorldRect } from '../math/primitives/rect.js'; export type { VisibleWorldRect };`).
- **Update `ts/world/types.ts`**: import `VisibleWorldRect` from `../math/primitives/rect.js` instead of `../viewport/viewport.js`.
- **Update world renderer files** to import `VisibleWorldRect` from the math layer instead of viewport (consistent layering):
  - `ts/world/worldRoadMarkingsRenderer.ts` line 13: `from '../math/primitives/rect.js'`
  - `ts/world/worldSignageRenderer.ts` line 26: `from '../math/primitives/rect.js'`
  - `ts/world/worldViewCulling.ts` line 3: `from '../math/primitives/rect.js'`
  - `ts/world/worldBridgeRenderer.ts` line 4: `from '../math/primitives/rect.js'`
- **Update test imports**: `tests/unit/world/worldViewCulling.test.ts` line 10 and `tests/unit/rendering/heatmapRenderer.test.ts` line 7 — change to import from `ts/math/primitives/rect.js`. (If the test imports from viewport/heatmapRenderer re-export, that still works, but update for consistency.)

### Phase 3: Extract PreviewSimulator simulation logic (finding #1)

- **Create `ts/landing/previewSimulatorEngine.ts`** — a plain (non-DOM) class `PreviewSimulatorEngine` that owns all simulation state and logic currently in `PreviewSimulatorElement`:
  - All fields: `#world`, `#viewport`, `#cars`, `#configs`, `#roadBorders`, `#borderGrid`, `#trafficGrid`, `#clusterSegments`, `#camera`, `#rafId`, `#running`, `#paused`
  - All methods: `activate()`, `deactivate()`, `#init()`, `#pickWorld()`, `#hasRoads()`, `#pickCarConfigs()`, `#buildCluster()`, `#spawnCars()`, `#makeCar()`, `#headingForSegment()`, `#update()`, `#collectCarObstacles()`, `#swarmCentroid()`, `#draw()`, `#fullViewRenderRadius()`
  - The constructor takes `{ canvas: HTMLCanvasElement, paused: boolean }` — the canvas is still DOM but the engine owns the context and viewport.
  - The engine exposes `activate(): Promise<void>`, `deactivate(): void`, `resize(): void` (called by the organism when the ResizeObserver fires), and `get isRunning(): boolean`.
  - All constants (`GRID_CELL_SIZE`, `PREVIEW_CAR_COUNT`, etc.) move with the engine.
- **Rewrite `ts/ui/organisms/previewSimulator.ts`** as a thin UI shell:
  - `connectedCallback`: create canvas, set up ResizeObserver, instantiate `PreviewSimulatorEngine({ canvas, paused })`.
  - `disconnectedCallback`: call `engine.deactivate()`, disconnect ResizeObserver.
  - `activate()`: delegate to `engine.activate()`.
  - `deactivate()`: delegate to `engine.deactivate()`.
  - `#resize()`: call `engine.resize()`.
  - Remove all simulation imports (World, Car, Viewport, SpatialHashGrid, TrafficControlGrid, buildRoadBorders, queryBordersNearCar, buildTrafficControls, queryTrafficControlsNearCar, getRandomColor, carAngleFromDirection, Point, scale, Segment type, SensorTrafficControl type, CarInfo type, StoreManager).
  - The organism retains only: `customElements.define`, the canvas creation, and the ResizeObserver wiring.
- **Update `ts/landing/landingPreview.ts`** — it imports `PreviewSimulatorElement` (type-only, line 1) and calls `sim.activate()` / `sim.deactivate()`. No change needed — the organism's public API stays the same.

### Phase 4: Document raw keydown listeners as sanctioned exceptions (findings #2, #3)

- **`ts/ui/atoms/tooltip.ts`** line 45: add a justification comment above the `window.addEventListener('keydown', ...)` line:
  ```ts
  // Sanctioned exception: this is a global UI controller active on ALL pages
  // (including the landing page, which has no KeyboardManager instance).
  // The Escape-to-dismiss handler is a capture-phase accessibility behavior,
  // not a simulator shortcut. See AGENTS.md § "Known exceptions".
  ```
- **`ts/landing/landingPreview.ts`** line 330: add a justification comment above the `window.addEventListener('keydown', ...)` line:
  ```ts
  // Sanctioned exception: the landing page does not instantiate a
  // KeyboardManager. This listener detects scroll-key input (arrows, space,
  // PageDown, etc.) to cancel the auto-slide animation — it is not a simulator
  // shortcut. See AGENTS.md § "Known exceptions".
  ```
- **Update `AGENTS.md`** § "Known exception — keyboard controls in `Controls`": add two more sanctioned exceptions to that section:
  - `tooltip.ts` — global Escape-to-dismiss, capture-phase, all pages
  - `landingPreview.ts` — landing-page scroll-key detection, no KeyboardManager on landing page

### Phase 5: Extract raw rgba() CSS values to tokens (finding #6)

- **Add new tokens to `styles/tokens.css`** in the appropriate sections:

  ```css
  /* Colors — Decorative glows & gradients */
  --gradient-card-sheen: linear-gradient(160deg, rgba(255, 255, 255, 0.055) 0%, rgba(255, 255, 255, 0.02) 100%);
  --color-bg-link: rgba(255, 255, 255, 0.025);
  --color-glow-green-radial: rgba(125, 223, 125, 0.14);
  --color-glow-cyan-radial: rgba(78, 205, 196, 0.12);
  --color-glow-green-radial-faint: rgba(92, 184, 92, 0.08);
  --color-glow-green-inset: rgba(125, 223, 125, 0.1);
  --color-glow-green-inset-strong: rgba(125, 223, 125, 0.18);
  --color-glow-green-outer: rgba(125, 223, 125, 0.25);
  --color-highlight-inset: rgba(255, 255, 255, 0.14);
  --color-highlight-inset-strong: rgba(255, 255, 255, 0.2);
  ```

  ```css
  /* Shadows — Decorative */
  --shadow-card-hover: 0 12px 30px rgba(0, 0, 0, 0.35);
  --shadow-logo-glow: 0 4px 14px rgba(125, 223, 125, 0.45);
  ```

- **Update `styles/atoms/_base.css`** (lines 61, 66, 71): replace the three raw `rgba()` stops in the `--main-page-bg` radial gradients with `var(--color-glow-green-radial)`, `var(--color-glow-cyan-radial)`, `var(--color-glow-green-radial-faint)`.

- **Update `styles/templates/_landing-page.css`**:
  - Line 47: `drop-shadow(var(--shadow-logo-glow))`
  - Lines 75-76: replace the `linear-gradient(160deg, rgba(...), rgba(...))` with `var(--gradient-card-sheen)`
  - Line 111: replace `0 12px 30px rgba(0, 0, 0, 0.35)` with `var(--shadow-card-hover)`
  - Line 139: replace `inset 0 0 18px rgba(125, 223, 125, 0.1)` with `inset 0 0 18px var(--color-glow-green-inset)`
  - Lines 148-149: replace `inset 0 0 18px rgba(125, 223, 125, 0.18)` with `inset 0 0 18px var(--color-glow-green-inset-strong)` and `0 0 20px rgba(125, 223, 125, 0.25)` with `0 0 20px var(--color-glow-green-outer)`
  - Line 180: replace `rgba(255, 255, 255, 0.025)` with `var(--color-bg-link)`

- **Update `styles/organisms/_preview-simulator.css`**:
  - Lines 56-57: replace the `linear-gradient(160deg, rgba(...), rgba(...))` with `var(--gradient-card-sheen)`
  - Line 132: replace `inset 0 1px 0 rgba(255, 255, 255, 0.14)` with `inset 0 1px 0 var(--color-highlight-inset)`
  - Line 150: same replacement
  - Line 158: replace `inset 0 1px 0 rgba(255, 255, 255, 0.2)` with `inset 0 1px 0 var(--color-highlight-inset-strong)`

- **Update `styles/organisms/_store-panel.css`**:
  - Lines 11-12: replace the `linear-gradient(160deg, rgba(...), rgba(...))` with `var(--gradient-card-sheen)`
  - Line 51: replace `0 12px 30px rgba(0, 0, 0, 0.35)` with `var(--shadow-card-hover)`
  - Lines 82-83: replace `inset 0 0 18px rgba(125, 223, 125, 0.18)` with `inset 0 0 18px var(--color-glow-green-inset-strong)` and `0 0 20px rgba(125, 223, 125, 0.25)` with `0 0 20px var(--color-glow-green-outer)`

## Brain / persistence considerations

None. No brain dimensions, sensor modes, or save schemas are touched. This is pure refactoring.

## Acceptance criteria

- `npm run rebuild` completes with zero errors (no stale `js/` files from moved sources).
- `npx tsc --noEmit` passes.
- `npm run lint:log` passes (zero ESLint warnings).
- `npm run format:check` passes.
- `npm test` passes — all 1539+ existing tests green (test import paths updated for LatchedToggle and VisibleWorldRect moves).
- `ts/input/keyboardManager.ts` no longer imports from `ts/ui/` — grep confirms zero `../ui/` imports in `ts/input/`.
- `ts/world/types.ts` no longer imports from `ts/viewport/` or `ts/mini-map/` — grep confirms zero upward imports.
- `ts/ui/organisms/previewSimulator.ts` is under ~60 lines (canvas + ResizeObserver + delegation only) — no World/Car/Viewport/SpatialHashGrid imports.
- `ts/ui/atoms/tooltip.ts` and `ts/landing/landingPreview.ts` have justification comments above their raw keydown listeners.
- `AGENTS.md` § "Known exception" documents the two new sanctioned exceptions.
- `styles/tokens.css` contains the new decorative tokens; grep for `rgba(` in `styles/atoms/_base.css`, `styles/templates/_landing-page.css`, `styles/organisms/_preview-simulator.css`, `styles/organisms/_store-panel.css` returns zero results (all replaced with `var(--*)`).
- `npm run fix:all` runs clean.
- Visual regression: landing page (`html/index.html`) renders identically — the preview simulator still works, card sheen/gradients/shadows look the same.

## Docs to update

- `AGENTS.md` — update § "Known exception — keyboard controls in `Controls`" to add tooltip.ts and landingPreview.ts as sanctioned exceptions; update § "Centralised keyboard manager" to reflect LatchedToggle moved to `ts/input/`; update the LatchedToggle reference in § "Held/latched toggle extracted" to point to `ts/input/latchedToggle.ts`.
- `docs/DesignSystem.md` — add the new decorative tokens to the token reference table (if it lists tokens).
- No new `docs/*.md` file warranted — these are internal refactors, not user-facing features.
