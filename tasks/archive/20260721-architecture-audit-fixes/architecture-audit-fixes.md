# Architecture Audit Fixes

Fix the 5 issues identified by the architecture audit. All changes should be in a single pass, one branch.

## Issue 1: Move `assetSelectors.ts` from `molecules/` to `organisms/`

**Files to move:**

- `ts/ui/molecules/assetSelectors.ts` → `ts/ui/organisms/assetSelectors.ts`

**Files to update imports:**

- `ts/ui/molecules/worldToolbar.ts` — change `'./assetSelectors.js'` → `'../organisms/assetSelectors.js'`
- `ts/traffic/entry.ts` — change `'../ui/molecules/assetSelectors.js'` → `'../ui/organisms/assetSelectors.js'`
- `ts/race/entry.ts` — same pattern
- `ts/simulator/humanTraining/entry.ts` — same pattern
- `ts/world/entry.ts` — same pattern
- `ts/simulator/entry.ts` — same pattern
- `tests/unit/panels/assetSelectors.test.ts` — change `'../../../ts/ui/molecules/assetSelectors.js'` → `'../../../ts/ui/organisms/assetSelectors.js'`

**No code changes inside the file** — just move it and update import paths.

---

## Issue 2: Extract `SensorRenderer` from `Sensor`

**Create** `ts/rendering/sensorRenderer.ts` with:

- A `SensorRenderer` class (or namespace of static functions) containing:
  - `static draw(ctx, sensor)` — main entry point, dispatches to basic/state-aware
  - `static #drawBasic(ctx, sensor)` — extracted from `Sensor.#drawBasic`
  - `static #drawStateAware(ctx, sensor)` — extracted from `Sensor.#drawStateAware`
- Import `SensorReading`, `TRAFFIC_STATE_RED_THRESHOLD`, `TRAFFIC_STATE_YELLOW_THRESHOLD`, `BASIC_RAY_DOT_RADIUS`, `TRAFFIC_RAY_DOT_RADIUS` from the sensor module (or duplicate the constants — they are rendering constants, not domain constants, so duplicating is fine)

**Modify** `ts/car/sensors/sensor.ts`:

- Remove the `draw()`, `#drawBasic()`, `#drawStateAware()` methods (lines 157–262)
- Add a `draw(ctx)` method that delegates: `SensorRenderer.draw(ctx, this)`
- Import `SensorRenderer` from `../../rendering/sensorRenderer.js`

**Verification:** `Sensor.draw()` still works identically since it delegates. Callers (`CarRenderer`) don't need changes.

---

## Issue 3: Migrate `EditorType` to shared `simulator/types.ts`

**Move** `EditorType` type definition from `ts/world/types.ts` (lines 91–101) to `ts/simulator/types.ts`.

**Update imports in:**

- `ts/world/editors/worldEditor.ts` — change `import { EditorType } from '../../world/types.js'` → `import { EditorType } from '../../simulator/types.js'`
- `ts/ui/molecules/editorToolbar.ts` — change `import type { EditorType } from '../../world/types.js'` → `import type { EditorType } from '../../simulator/types.js'`
- `tests/unit/panels/editorToolbar.test.ts` — update import path
- `tests/unit/world/editors/worldEditor.test.ts` — update import path

**Leave** the original `export type EditorType` in `ts/world/types.ts` as a re-export:

```ts
export type { EditorType } from '../simulator/types.js';
```

This keeps backward compatibility for any import we might have missed.

---

## Issue 4: Retrofit CSS files to use design tokens

Replace all raw CSS values with design tokens. The `tokens.css` file already has a comprehensive set of tokens. Where no matching token exists, add new tokens to `tokens.css` first, then use them.

### New tokens to add to `tokens.css`:

```css
/* Additional size tokens needed */
--space-2\.5: 10px; /* for 10px gaps/paddings */
--space-3\.5: 14px; /* for 14px gaps/paddings */
--space-4\.5: 18px; /* for 18px paddings */
--space-7: 28px; /* for 28px heights/widths */
--space-7\.5: 30px; /* for 30px heights */
--space-11: 45px; /* for 45px min-widths */
--space-12: 48px; /* for 48px widths */
--space-14: 56px; /* for 56px logo dimensions */
--space-20: 80px; /* for 80px thresholds */

/* Button sizing */
--size-btn-num: 22px; /* number-stepper button */
--size-btn-icon-sm: 28px; /* icon button small */

/* Additional color tokens for hover states */
--color-bg-hover-subtle: rgba(255, 255, 255, 0.15);
--color-bg-green-hover: rgba(80, 180, 80, 0.4);
--color-bg-red-hover: rgba(200, 60, 60, 0.35);
--color-bg-green-subtle: rgba(92, 184, 92, 0.08);
--color-bg-red-subtle: rgba(217, 83, 79, 0.08);
--color-bg-green-border: rgba(92, 184, 92, 0.3);
--color-bg-yellow-border: rgba(240, 173, 78, 0.3);
--color-bg-medium: #555;
--color-bg-dark-kbd: #333;

/* Gradient/accent colors */
--color-accent-cyan: #4ecdc4;
--color-accent-cyan-bg: rgba(78, 205, 196, 0.08);
--color-accent-cyan-shadow: 0 2px 8px rgba(78, 205, 196, 0.35);
--color-accent-sky: #8cf;

/* Shadow token for modal */
--shadow-modal: 0 18px 50px rgba(0, 0, 0, 0.55);

/* Misc */
--color-body-bg-landing: #4ecdc4; /* used in gradient, already have --color-body-bg but different */
--text-landing-title: 2rem;
--text-landing-subtitle: 1rem;
--text-landing-h2: 1.5rem;
--color-black: #000;
```

### Files to retrofit (list of all raw values to replace):

#### `styles/atoms/_base.css`

| Line | Raw value                     | Token                   |
| ---- | ----------------------------- | ----------------------- |
| 67   | `background-color: lightgray` | `var(--color-bg-hover)` |

#### `styles/atoms/_button.css`

| Line(s) | Raw value                                         | Token                                                                                |
| ------- | ------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 67      | `background-color: lightgray` \*duplicate in base | —                                                                                    |
| 78      | `rgba(80, 180, 80, 0.4)`                          | `var(--color-bg-green-hover)`                                                        |
| 86      | `rgba(200, 60, 60, 0.35)`                         | `var(--color-bg-red-hover)`                                                          |
| 111     | `rgba(255, 255, 255, 0.15)`                       | `var(--color-bg-hover-subtle)`                                                       |
| 149     | `rgba(255, 255, 255, 0.15)`                       | `var(--color-bg-hover-subtle)`                                                       |
| 154     | `padding: 0 10px`                                 | `var(--space-2\.5)`                                                                  |
| 170     | `font-size: 0.8rem`                               | `var(--text-base)` or keep rem                                                       |
| 192     | `height: 30px`                                    | `var(--space-7\.5)`                                                                  |
| 211     | `height: 30px`                                    | `var(--space-7\.5)`                                                                  |
| 226     | `rgba(255, 255, 255, 0.15)`                       | `var(--color-bg-hover-subtle)`                                                       |
| 238     | `font-size: 20px`                                 | `var(--text-2xl)` = 16px, or `var(--text-3xl)` = 24px — closest is `var(--text-2xl)` |
| 242     | `text-shadow: 1px 1px black`                      | `var(--color-black)` or just keep (no matching token)                                |

#### `styles/atoms/_badge.css`

| Line  | Raw value                                | Token                                                  |
| ----- | ---------------------------------------- | ------------------------------------------------------ |
| 10    | `background: #555`                       | `var(--color-bg-medium)`                               |
| 18    | `0 0 3px rgba(217, 83, 79, 0.6)`         | `var(--shadow-red)` — add this token                   |
| 22    | `0 0 3px rgba(240, 173, 78, 0.6)`        | `var(--shadow-orange)` — add this token                |
| 30    | `gap: 3px`                               | `var(--space-0\.5)` = 2px (or keep since no 3px token) |
| Multi | `font-size: 0.78rem`, `0.8rem`, `0.9rem` | `var(--text-*)` or keep rem                            |

#### `styles/atoms/_key-indicator.css`

| Line | Raw value           | Token                      |
| ---- | ------------------- | -------------------------- |
| 14   | `#333`              | `var(--color-bg-dark-kbd)` |
| 48   | `padding: 6px 10px` | Keep or use tokens         |

#### `styles/atoms/_input.css`

| Line(s) | Raw value                         | Token                 |
| ------- | --------------------------------- | --------------------- |
| 52-55   | `width/min-width/max-width: 22px` | `var(--size-btn-num)` |
| 55      | `height: 22px`                    | `var(--size-btn-num)` |
| 74      | `width: 48px`                     | `var(--space-12)`     |

#### `styles/molecules/_controls-group.css`

| Line | Raw value                   | Token                          |
| ---- | --------------------------- | ------------------------------ |
| 11   | `gap: 3px`                  | `var(--space-0\.5)`            |
| 35   | `height: 11px`              | Keep (very specific)           |
| 76   | `min-width: 45px`           | `var(--space-11)`              |
| 96   | `rgba(255, 255, 255, 0.15)` | `var(--color-bg-hover-subtle)` |
| 113  | `min-width: 45px`           | `var(--space-11)`              |
| 142  | `height: 28px`              | `var(--space-7)`               |

#### `styles/molecules/_num-input-row.css`

| Line  | Raw value     | Token                 |
| ----- | ------------- | --------------------- |
| 4     | `gap: 3px`    | `var(--space-0\.5)`   |
| 24-27 | `22px`        | `var(--size-btn-num)` |
| 49    | `width: 48px` | `var(--space-12)`     |

#### `styles/molecules/_param-grid.css`

| Line | Raw value                  | Token               |
| ---- | -------------------------- | ------------------- |
| 21   | `gap: 3px` (`.ctrl`)       | `var(--space-0\.5)` |
| 39   | `gap: 10px` (`.ti-source`) | `var(--space-2\.5)` |
| 40   | `padding: ... 10px`        | `var(--space-2\.5)` |
| 56   | `margin-top: 3px`          | `var(--space-0\.5)` |

#### `styles/molecules/_stat-row.css`

| Line | Raw value         | Token               |
| ---- | ----------------- | ------------------- |
| 5    | `3px` (padding)   | `var(--space-0\.5)` |
| 46   | `min-width: 28px` | `var(--space-7)`    |

#### `styles/molecules/_asset-picker.css`

| Line | Raw value      | Token               |
| ---- | -------------- | ------------------- |
| 37   | `height: 30px` | `var(--space-7\.5)` |

#### `styles/organisms/_modals.css`

| Line         | Raw value                           | Token                 |
| ------------ | ----------------------------------- | --------------------- |
| 40           | `0 18px 50px rgba(0,0,0,0.55)`      | `var(--shadow-modal)` |
| 50           | `font-size: 1.1rem`                 | Keep or use token     |
| 55,64,74,etc | `font-size: 0.85rem/0.8rem/0.75rem` | Keep or use tokens    |
| 88,131       | `gap: 10px`                         | `var(--space-2\.5)`   |
| 89           | `padding: ... 10px`                 | `var(--space-2\.5)`   |
| 105          | `margin-top: 3px`                   | `var(--space-0\.5)`   |

#### `styles/organisms/_toolbar-panel.css`

| Line | Raw value               | Token               |
| ---- | ----------------------- | ------------------- |
| 4-5  | `top: 10px; left: 10px` | `var(--space-2\.5)` |
| 10   | `gap: 10px`             | `var(--space-2\.5)` |
| 25   | `padding: ... 10px`     | `var(--space-2\.5)` |
| 45   | `gap: 3px`              | `var(--space-0\.5)` |
| 106  | `height: 11px`          | Keep                |

#### `styles/organisms/_human-training.css`

| Line | Raw value                        | Token                                                                               |
| ---- | -------------------------------- | ----------------------------------------------------------------------------------- |
| 6-7  | `width: 28px; height: 28px`      | `var(--space-7)`                                                                    |
| 93   | `rgba(92, 184, 92, 0.3)`         | `var(--color-bg-green-border)`                                                      |
| 99   | `rgba(240, 173, 78, 0.3)`        | `var(--color-bg-yellow-border)`                                                     |
| 160  | `rgba(255, 255, 255, 0.15)`      | `var(--color-bg-hover-subtle)`                                                      |
| 166  | `0 0 6px rgba(92, 184, 92, 0.6)` | Use `var(--shadow-green)`? Check if it matches. If not, add `--shadow-green-strong` |
| 172  | `gap: 3px`                       | `var(--space-0\.5)`                                                                 |
| 239  | `border-radius: 2px`             | `var(--radius-sm)` = 3px, closest                                                   |
| 244  | `rgba(92, 184, 92, 0.08)`        | `var(--color-bg-green-subtle)`                                                      |
| 249  | `rgba(217, 83, 79, 0.08)`        | `var(--color-bg-red-subtle)`                                                        |

#### `styles/organisms/_training-panel.css`

| Line | Raw value                   | Token                          |
| ---- | --------------------------- | ------------------------------ |
| 21   | `padding: 10px 10px`        | `var(--space-2\.5)`            |
| 64   | `3px`                       | `var(--space-0\.5)`            |
| 107  | `10px`                      | `var(--space-2\.5)`            |
| 161  | `height: 30px`              | `var(--space-7\.5)`            |
| 177  | `rgba(255, 255, 255, 0.15)` | `var(--color-bg-hover-subtle)` |
| 186  | `gap: 3px`                  | `var(--space-0\.5)`            |

#### `styles/organisms/_store-panel.css`

| Line      | Raw value            | Token                                                                  |
| --------- | -------------------- | ---------------------------------------------------------------------- |
| 12        | `padding: ... 28px`  | `var(--space-7)` (use `var(--space-8)` = 32px if 28px is too specific) |
| 37        | `font-size: 1.5rem`  | Keep or use token                                                      |
| 50        | `padding: ... 14px`  | `var(--space-3\.5)`                                                    |
| 55,99,188 | `font-size: 0.85rem` | Keep or use token                                                      |
| 73,107    | `font-size: 0.78rem` | Keep or use token                                                      |
| 104,144   | `10px` (padding)     | `var(--space-2\.5)`                                                    |

#### `styles/templates/_simulator-layout.css`

| Line | Raw value               | Token                                                                                                          |
| ---- | ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| 49   | `#8cf` in gradient      | `var(--color-accent-sky)`                                                                                      |
| 50   | `white 70%` in gradient | `var(--color-text-primary)` doesn't work since it's a color stop in a bg gradient... keep as `white` or `#fff` |

#### `styles/templates/_race-layout.css`

| Line | Raw value                                    | Token                          |
| ---- | -------------------------------------------- | ------------------------------ |
| 8    | `#8cf`                                       | `var(--color-accent-sky)`      |
| 37   | `gap: 10px`                                  | `var(--space-2\.5)`            |
| 39   | `padding: ... 14px`                          | `var(--space-3\.5)`            |
| 52   | `rgba(255, 255, 255, 0.15)`                  | `var(--color-bg-hover-subtle)` |
| 57   | `padding: 0 10px`                            | `var(--space-2\.5)`            |
| 77   | `font-size: xx-large`                        | Keep or use token              |
| 79   | `font-family: Ariel` (typo: should be Arial) | `var(--font-ui)`               |
| 79   | `padding: 10px`                              | `var(--space-2\.5)`            |
| 97   | `width: 300px`                               | Keep (very specific)           |

#### `styles/templates/_landing-page.css`

| Line   | Raw value                            | Token                                    |
| ------ | ------------------------------------ | ---------------------------------------- |
| 13     | `#4ecdc4`                            | `var(--color-accent-cyan)`               |
| 25     | `gap: 14px`                          | `var(--space-3\.5)`                      |
| 31-32  | `width/height: 56px`                 | `var(--space-14)`                        |
| 34     | `0 2px 8px rgba(78, 205, 196, 0.35)` | `var(--color-accent-cyan-shadow)`        |
| 57     | `padding: ... 28px`                  | `var(--space-7)`                         |
| 74     | `font-size: 2.5rem`                  | Keep                                     |
| 81     | `margin: 0 0 10px`                   | `0 0 var(--space-2\.5)`                  |
| 86     | `font-size: 0.9rem`                  | Keep                                     |
| 95,101 | `gap: 10px`, `gap: 14px`             | `var(--space-2\.5)`, `var(--space-3\.5)` |
| 102    | `padding: 14px 18px`                 | `var(--space-3\.5) var(--space-4\.5)`    |

#### `styles/templates/_world-editor.css`

| Line | Raw value                       | Token                            |
| ---- | ------------------------------- | -------------------------------- |
| 19   | `top: 10px`                     | `var(--space-2\.5)`              |
| 35   | `bottom: 20px` (editor-toolbar) | `var(--space-5)`                 |
| 42   | `outline: 2px solid`            | `var(--space-0\.5)` for width    |
| 79   | `height: 28px`                  | `var(--space-7)`                 |
| 90   | `font-size: 20px`               | `var(--text-2xl)` = 16px or keep |
| 122  | `padding: ... 10px`             | `var(--space-2\.5)`              |

#### `styles/pages/_mobile.css`

| Line | Raw value            | Token                               |
| ---- | -------------------- | ----------------------------------- |
| 6    | `font-size: 1.6rem`  | Keep                                |
| 9-10 | `width/height: 40px` | `var(--space-10)` if added, or keep |
| 13   | `font-size: 0.95rem` | Keep                                |

#### `html/world.html` (inline styles)

| Line  | Raw value                   | Token                                      |
| ----- | --------------------------- | ------------------------------------------ |
| 20-22 | `right: 20px; bottom: 20px` | `var(--space-5)`                           |
| 23    | `background-color: #2a5`    | `var(--color-bg-canvas)` (already matches) |
| 24    | `outline: 2px solid black`  | `2px solid var(--color-black)`             |

### Global approach:

1. Add all new tokens to `styles/tokens.css` first
2. Then systematically go through each CSS file and replace values
3. Run `npm run rebuild` and `npm test` to verify nothing breaks

---

## Issue 5: 3 Minor Items

### 5a: `drawSimulatorCars` parameter types

In `ts/simulator/training/rendering/carRenderer.ts`:

- The function currently takes `Car[]` directly (line 20, 21, 26, 28). Per architecture rules, `Car` is a domain type and the function is in a rendering context.
- Add a comment noting the architectural intent to migrate to `CarDrawData[]` in the future. For now, keep the existing signature since `CarDrawData` doesn't expose all needed info (pool membership, type checking).
- Alternatively, narrow the type: use a local interface that requires only what's needed (`x`, `y`, `draw()`).

### 5b: `html/world.html` inline styles

Move the inline `style` attribute from the `<canvas id="miniMapCanvas">` element into `styles/templates/_world-editor.css` (or `styles/organisms/_toolbar-panel.css`):

```css
#miniMapCanvas {
  position: absolute;
  right: var(--space-5);
  bottom: var(--space-5);
  background-color: var(--color-bg-canvas);
  outline: 2px solid var(--color-black);
}
```

Remove the inline `style` attribute from the HTML.

### 5c: `TrackingMode` type relocation

`TrackingMode` is defined in `ts/ui/molecules/modeControls.ts`. Per architecture rules, shared domain types should live in `ts/simulator/types.ts`.

- Move `TrackingMode` type to `ts/simulator/types.ts`
- Add a re-export in `modeControls.ts`: `export type { TrackingMode } from '../../simulator/types.js'`
- Update all imports that reference the old location:
  - `ts/simulator/racing/racePanel.ts`
  - `ts/ui/molecules/worldToolbar.ts`

---

## Order of execution

1. Add new tokens to `styles/tokens.css` (Issue 4 prerequisite)
2. Add `EditorType` re-export to `ts/simulator/types.ts` and re-export from `ts/world/types.ts` (Issue 3)
3. Move `assetSelectors.ts` + update imports (Issue 1)
4. Create `ts/rendering/sensorRenderer.ts` + update `Sensor.draw()` to delegate (Issue 2)
5. Move `TrackingMode` to `ts/simulator/types.ts` + update imports (Issue 5c)
6. Move inline styles from `html/world.html` to CSS (Issue 5b)
7. Retrofit all CSS files (Issue 4) — do in dependency order: tokens first, then atoms, molecules, organisms, templates, pages
8. Update `drawSimulatorCars` types (Issue 5a)

## Acceptance criteria

- [ ] `assetSelectors.ts` lives in `organisms/`, all imports updated
- [ ] `Sensor.draw()` delegates to `SensorRenderer`, no draw logic remains in `Sensor`
- [ ] `EditorType` defined in `ts/simulator/types.ts`, re-exported from `ts/world/types.ts`
- [ ] `TrackingMode` defined in `ts/simulator/types.ts`, re-exported from `ts/ui/molecules/modeControls.ts`
- [ ] All CSS files use design tokens (no raw `rgba()`, `#hex`, `lightgray`, bare `px` values)
- [ ] `html/world.html` has no inline `style` attribute on `<canvas id="miniMapCanvas">`
- [ ] `drawSimulatorCars` has updated types and/or clarifying comment
- [ ] TypeScript compiles without errors (`npm run rebuild`)
- [ ] All tests pass (`npm test`)
- [ ] Docs updated (`docs/DesignSystem.md` for new tokens)
