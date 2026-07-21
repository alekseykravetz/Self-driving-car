# Atomic Design + FSD Cleanup: Stale Files, Entry Fixes, CSS Tokens, and Architecture Tightening

**Date:** 2026-07-20
**Slug:** atomic-design-fsd-cleanup
**Entry points affected:** `ts/traffic/entry.ts`, `ts/simulator/entry.ts`, `ts/simulator/humanTraining/entry.ts`
**Save-file impact:** none
**Backward compat:** preserved (no save schema changes)

## Goal

Eliminate mid-migration debris and architecture debt identified by `@architect` audit. Six stale panel `.ts` files (old locations) still have duplicate `customElements.define` calls alongside the active copies in `ts/ui/organisms/`. The traffic entry still imports from legacy `ts/panels/` and `ts/simulator/panels/` paths. CSS files have ~50 raw hex/rgba/px literal violations instead of using `var(--color-*)`/`var(--space-*)`/`var(--text-*)` design tokens. `BorderMode`/`LayoutMode` types leak from UI molecules into domain strategy code. `KeyboardManager` (atom) imports from `../molecules/shortcutsToolbar.js`, violating Atomic Design hierarchy. `ts/world/editors/` imports from `ts/ui/`, creating an upward FSD dependency.

This plan fixes all of these in one sweep. No feature changes, no save-schema changes.

## Context (read first — critical for zero-context understanding)

### Architecture overview

The project is a browser-based self-driving car simulator. Two architecture systems coexist:

1. **Feature-Sliced Design (FSD)** — domain layers (math → car/world → neural-network → simulator/ui)
2. **Atomic Design (AD)** — UI component hierarchy (atoms → molecules → organisms) within `ts/ui/`

All UI panel custom elements were recently migrated from legacy locations (under `ts/simulator/training/`, `ts/simulator/traffic/`, `ts/simulator/humanTraining/`, `ts/store/`, `ts/panels/`) to `ts/ui/organisms/` and `ts/ui/molecules/`. The migration was incomplete in several ways.

### Key files and their roles

| File                                                     | Role                                                                                                         |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `ts/store/storePanel.ts`                                 | OLD store panel — has `customElements.define('store-panel', ...)`                                            |
| `ts/ui/organisms/storePanel.ts`                          | NEW store panel — same `customElements.define('store-panel', ...)` (live)                                    |
| `ts/simulator/training/trainingPanel.ts`                 | OLD training panel                                                                                           |
| `ts/ui/organisms/trainingPanel.ts`                       | NEW training panel (live)                                                                                    |
| `ts/simulator/training/trainingInitModal.ts`             | OLD training init modal                                                                                      |
| `ts/ui/organisms/trainingInitModal.ts`                   | NEW training init modal (live)                                                                               |
| `ts/simulator/traffic/trafficPanel.ts`                   | OLD traffic panel                                                                                            |
| `ts/ui/organisms/trafficPanel.ts`                        | NEW traffic panel (live)                                                                                     |
| `ts/simulator/humanTraining/humanTrainingPanel.ts`       | OLD human-training panel                                                                                     |
| `ts/ui/organisms/humanTrainingPanel.ts`                  | NEW human-training panel (live)                                                                              |
| `ts/simulator/humanTraining/humanTrainingConfigModal.ts` | OLD human-training config modal                                                                              |
| `ts/ui/organisms/humanTrainingConfigModal.ts`            | NEW human-training config modal (live)                                                                       |
| `ts/traffic/entry.ts`                                    | Traffic page entry — imports from old `../panels/` and `../simulator/panels/` paths                          |
| `ts/simulator/entry.ts`                                  | Simulator entry — uses correct `../ui/molecules/` paths (the model to follow)                                |
| `ts/ui/atoms/keyboardManager.ts`                         | Singleton keyboard router (atom) — imports `ShortcutsToolbarElement` from `../molecules/shortcutsToolbar.js` |
| `ts/ui/molecules/modeControls.ts`                        | Defines `BorderMode` type and `LayoutMode` type                                                              |
| `ts/simulator/training/modes/worldModeBehavior.ts`       | Imports `BorderMode` from `../../../ui/molecules/modeControls.js` (upward import)                            |
| `ts/simulator/traffic/trafficSimulator.ts`               | Imports `BorderMode` from `../../ui/molecules/modeControls.js` (upward import)                               |
| `ts/world/editors/worldEditor.ts`                        | Imports toolbar elements + `KeyboardManager` from `../../ui/molecules/` and `../../ui/atoms/`                |
| `ts/world/editors/graphEditor.ts`                        | Imports `KeyboardManager` from `../../ui/atoms/keyboardManager.js`                                           |
| `ts/world/editors/corridorEditor.ts`                     | Imports `KeyboardManager` from `../../ui/atoms/keyboardManager.js`                                           |
| `styles/tokens.css`                                      | Single source of truth for design token values                                                               |
| `styles/atoms/_badge.css`                                | Uses raw `#555`, `#5cb85c`, `#d9534f`, `#f0ad4e` (violation)                                                 |
| `styles/atoms/_key-indicator.css`                        | Uses raw `background-color: #333` (violation)                                                                |
| `styles/molecules/_controls-group.css`                   | Uses raw `color: #000` (violation)                                                                           |
| `styles/organisms/_human-training.css`                   | Uses raw `background: #5cb85c` (violation)                                                                   |
| `styles/templates/_simulator-layout.css`                 | Uses raw `linear-gradient(#8cf, white 70%)` (violation)                                                      |
| `styles/templates/_race-layout.css`                      | Uses raw `linear-gradient(#8cf, white 70%)` (violation)                                                      |
| `styles/templates/_landing-page.css`                     | Uses raw `linear-gradient(135deg, #7ddf7d, #4ecdc4)` (violation)                                             |

### The customElements.define problem

Each custom element file registers itself via `customElements.define('tag-name', Class)` as a side effect of being imported. If both old and new copies are loaded (e.g., via import chains), the browser throws `DOMException: Failed to execute 'define' on 'CustomElementRegistry': the name "training-panel" has already been used with 'TrainingPanelElement'`. Currently no entry point loads both copies simultaneously, so no runtime error—but it's fragile.

### Entry point import pattern (correct)

The simulator entry (`ts/simulator/entry.ts`) shows the correct pattern for side-effect imports that register custom elements:

```typescript
import '../ui/molecules/worldToolbar.js'; // side-effect: registers <world-toolbar>
import '../ui/organisms/trainingPanel.js'; // side-effect: registers <training-panel>
```

Every entry file follows this structure:

1. Nominal imports (bootstrap classes)
2. `declare` for DOM element references
3. Side-effect-only imports to register custom elements and polyfills
4. An async IIFE that calls `StoreManager.init()` before constructing the top-level controller

### KeyboardManager's dual role

`KeyboardManager` lives in `ts/ui/atoms/` because it's a singleton utility with no visual DOM of its own. However, it directly updates `ShortcutsToolbarElement`'s visual state (highlighting active keys), which creates a direct import dependency from atom → molecule. This is the only AD hierarchy violation of its kind.

### WorldEditor's architecture catch-22

`ts/world/editors/worldEditor.ts` is domain logic (FSD Layer 2) that manages the world graph and marking editors. It needs `KeyboardManager` to register/unregister editor shortcuts (`pushBindings`/`popBindings`) and needs references to toolbar custom elements to toggle their visual state. But `KeyboardManager` lives in `ts/ui/atoms/` (FSD Layer 4), and the toolbar elements live in `ts/ui/molecules/` (also Layer 4). This breaks FSD's strict downward dependency rule.

### CSS token system

`styles/tokens.css` defines CSS custom properties for all colors (e.g., `--color-accent-green-strong: #5cb85c`), spacing (e.g., `--space-1: 4px`, `--space-2: 8px`), typography (e.g., `--text-sm: 12px`), and radii (e.g., `--radius-sm: 4px`). The project convention (from `AGENTS.md`) is:

- Never use raw hex/rgba values — use `var(--color-*)` tokens
- Never use raw px for spacing/fonts/radii — use `var(--space-*)`/`var(--text-*)`/`var(--radius-*)` tokens

Currently ~11 raw hex values, ~17 raw rgba values, and ~50+ raw px values violate this convention outside `tokens.css`.

## Scope

**In scope:**

1. Delete the 6 stale panel `.ts` files (old locations)
2. Update `ts/traffic/entry.ts` imports to use `../ui/molecules/` and `../ui/organisms/` paths (matching `ts/simulator/entry.ts` pattern)
3. Delete stale `js/panels/` and `js/simulator/panels/` compiled artifacts
4. Extract `BorderMode` and `LayoutMode` types from `ts/ui/molecules/modeControls.ts` into a shared domain types file at `ts/simulator/types.ts` (or existing appropriate domain location)
5. Decouple `KeyboardManager` from `ShortcutsToolbarElement`: introduce a `ToolbarUpdater` interface/type so the atom doesn't import the concrete molecule
6. Move `KeyboardManager` to `ts/input/keyboardManager.ts` (outside both FSD Layer 4 and AD tree) to resolve both the atom→molecule and the worldEditor→ui upward dependencies
7. Update all import paths that reference the old `ts/ui/atoms/keyboardManager.ts` location to point to `ts/input/keyboardManager.ts`
8. Fix all raw hex values in CSS (outside `tokens.css`) to use `var(--color-*)` tokens
9. Fix all raw `rgba()` values in CSS (outside `tokens.css`) to use tokens where tokens exist, or add appropriate new tokens where coverage is missing
10. Add missing spacing tokens (`--space-0\.5: 2px`, `--space-1\.5: 6px`) to `tokens.css` to cover the most common raw px values
11. Fix raw px values in CSS to use `var(--space-*)` / `var(--text-*)` / `var(--radius-*)` tokens where matching tokens exist

**Out of scope:**

- Any behavioral or feature changes to panels, simulators, or cars
- Changing save-file schemas or localStorage keys
- Renaming any HTML tags or custom element names
- Adding stylelint or CSS token CI rules (this is pure cleanup; CI rules can be a follow-up)
- Refactoring `ts/ui/organisms/` deep domain imports (noted as INFO-level in the audit, not actionable here)

**Important:** Do NOT modify `styles/tokens.css` beyond adding `--space-0.5` and `--space-1.5` tokens. All other value changes should use existing tokens. If no token exists for a given value, keep the raw value and add a comment like `/* TODO: add token */` — do not invent new tokens without the design system being extended.

## Implementation

### 1. Delete 6 stale panel files

Remove these files from the working tree and from git:

```
ts/store/storePanel.ts
ts/simulator/training/trainingPanel.ts
ts/simulator/training/trainingInitModal.ts
ts/simulator/traffic/trafficPanel.ts
ts/simulator/humanTraining/humanTrainingPanel.ts
ts/simulator/humanTraining/humanTrainingConfigModal.ts
```

**Verification:** After deletion, `grep -r "customElements.define" ts/` should show each tag exactly once (in the `ts/ui/organisms/` copy). Check each entry point's imports to ensure none reference the deleted files. The entry points to check:

- `ts/simulator/entry.ts` — must still import from `../ui/organisms/trainingPanel.js` etc.
- `ts/traffic/entry.ts` — currently imports `../simulator/traffic/trafficPanel.js` (line 82), which will be updated in step 2
- `ts/simulator/humanTraining/entry.ts` — check this file's imports

### 2. Fix `ts/traffic/entry.ts` imports

Replace the old path imports (lines 67-82) with the correct `../ui/molecules/` and `../ui/organisms/` paths, matching the pattern in `ts/simulator/entry.ts`.

Lines to change (67-82):

```
Line 67: '../panels/templates/worldToolbarTemplate.js'        → '../ui/molecules/worldToolbarTemplate.js'
Line 68: '../simulator/panels/templates/layoutToolbarTemplate.js' → '../ui/molecules/layoutToolbarTemplate.js'
Line 69: '../simulator/panels/templates/animationLoopToolbarTemplate.js' → '../ui/molecules/animationLoopToolbarTemplate.js'
Line 70: '../panels/templates/shortcutsToolbarTemplate.js'     → '../ui/molecules/shortcutsToolbarTemplate.js'
Line 71: '../panels/templates/worldLayersToolbarTemplate.js'   → '../ui/molecules/worldLayersToolbarTemplate.js'
Line 72: '../simulator/traffic/templates/trafficPanelTemplate.js' → '../ui/organisms/trafficPanelTemplate.js'  (or keep — check what simulator entry does)
Line 73: '../panels/modeControls.js'                           → '../ui/molecules/modeControls.js'
Line 74: '../panels/assetSelectors.js'                         → '../ui/molecules/assetSelectors.js'
Line 75: '../panels/worldToolbar.js'                           → '../ui/molecules/worldToolbar.js'
Line 76: '../simulator/panels/layoutToolbar.js'                → '../ui/molecules/layoutToolbar.js'
Line 77: '../simulator/panels/animationLoopToolbar.js'         → '../ui/molecules/animationLoopToolbar.js'
Line 78: '../panels/shortcutsToolbar.js'                       → '../ui/molecules/shortcutsToolbar.js'
Line 79: '../panels/worldLayersToolbar.js'                     → '../ui/molecules/worldLayersToolbar.js'
Line 82: '../simulator/traffic/trafficPanel.js'                → '../ui/organisms/trafficPanel.js'
```

Also check if line 80 (`'../simulator/spatialGridUtils.js'`) and subsequent lines already use correct paths — they should not be changed.

### 3. Delete stale JS compiled artifacts

After step 2, delete these directories (compiled artifacts from the old panel locations):

```
js/panels/
js/simulator/panels/
```

**Verification:** Run `grep -r "from.*'\.\.\/panels\/" ts/` and `grep -r "from.*'\.\.\/simulator\/panels\/" ts/` to confirm no remaining source imports reference these paths. Also grep `ts/` for `'\.\.\/panels\/` (without the leading `../` prefix variant) to be thorough.

### 4. Extract `BorderMode` and `LayoutMode` to shared domain types

The `BorderMode` type (`'none' | 'damage' | 'collision'`) and `LayoutMode` are currently defined in `ts/ui/molecules/modeControls.ts`. They are imported by domain logic modules:

- `ts/simulator/training/modes/worldModeBehavior.ts`
- `ts/simulator/traffic/trafficSimulator.ts`
- `ts/simulator/racing/racePanel.ts`

**Action:**

1. Create `ts/simulator/types.ts` (if it doesn't exist) and move the type definitions there:
   ```typescript
   export type BorderMode = 'none' | 'damage' | 'collision';
   // also export LayoutMode if it's defined in modeControls.ts
   ```
2. Update `ts/ui/molecules/modeControls.ts` to import the types from `../../simulator/types.js` instead of defining them
3. Update domain imports (`worldModeBehavior.ts`, `trafficSimulator.ts`, `racePanel.ts`) to import from `../types.js` (or the appropriate relative path to `ts/simulator/types.js`)

**Important:** `modeControls.ts` Also exports the `BorderModeControlsElement` class which references these types. Keep the class in `modeControls.ts`, just import the type from the shared location.

### 5. Decouple `KeyboardManager` from `ShortcutsToolbarElement`

Currently `ts/ui/atoms/keyboardManager.ts` imports `ShortcutsToolbarElement` (a concrete custom element class) from `../molecules/shortcutsToolbar.js`. This violates the Atomic Design hierarchy (atoms must not depend on molecules).

**Action:**
Define a `ToolbarUpdater` interface in `keyboardManager.ts` (or a separate small file) that exposes only the methods `KeyboardManager` needs:

```typescript
export interface ToolbarUpdater {
  flash(key: string): void;
  setActive(key: string, active: boolean): void;
}
```

Make `ShortcutsToolbarElement` implement this interface. Update `KeyboardManager` to accept a `ToolbarUpdater` instead of a `ShortcutsToolbarElement` directly.

Where does `KeyboardManager` receive the toolbar reference? Search for all places that construct or access `KeyboardManager` and pass the toolbar — these call sites will need to pass it as a `ToolbarUpdater` instead.

### 6. Move `KeyboardManager` to `ts/input/`

`KeyboardManager` is used by both UI code (`ts/ui/molecules/shortcutsToolbar.ts` references it) and domain logic (`ts/world/editors/worldEditor.ts`, `graphEditor.ts`, `corridorEditor.ts`). Its current home in `ts/ui/atoms/` creates an upward FSD dependency from `ts/world/` → `ts/ui/`.

**Action:**

1. Move `ts/ui/atoms/keyboardManager.ts` → `ts/input/keyboardManager.ts`
2. Create `ts/input/` directory if it doesn't exist
3. Keep `ts/ui/atoms/latchedToggle.ts` where it is (it's purely a UI state machine, no domain consumers)
4. Update all files that import from `../../ui/atoms/keyboardManager.js` or similar paths to point to `../../input/keyboardManager.js`

Files to update (found via `grep -r "keyboardManager" ts/ —include="*.ts"`):

- `ts/world/editors/worldEditor.ts`
- `ts/world/editors/graphEditor.ts`
- `ts/world/editors/corridorEditor.ts`
- `ts/ui/molecules/shortcutsToolbar.ts` (if it imports KeyboardManager)
- `ts/simulator/core/simulatorShell.ts` (likely)
- `ts/traffic/entry.ts` (if it imports KeyboardManager)
- Any simulator subclass files that set up bindings

**Double-check:** The files `ts/world/editors/worldEditor.ts`, `graphEditor.ts`, and `corridorEditor.ts` also import from `../../ui/molecules/` (toolbar elements). Those toolbar imports are acceptable — they're UI elements that editors need to reference. Only the `KeyboardManager` import needs to change.

### 7. Update editor imports for `KeyboardManager`

See step 6. Update all import paths referencing the old `ts/ui/atoms/keyboardManager.ts` location. This includes editors AND any simulator or entry files that import it.

### 8. Fix raw hex values in CSS

Replace raw hex color values in these CSS files (outside `tokens.css`) with `var(--color-*)` tokens:

**`styles/atoms/_badge.css` (4 violations):**
| Line | Current | Replacement |
|---|---|---|
| 10 | `background: #555;` | `background: var(--color-bg-dark-300);` — but no such token exists. Use `var(--color-bg-dark)` or define a new token. The `tokens.css` has `--color-bg-dark: #000`. For `#555`, consider using `--color-text-secondary: #888` (close) or keep and add a comment. **Best:** add `--color-bg-muted: #555` to tokens.css? NO — the spec says don't add new tokens. Use `background: #555; /* TODO: add token */` |
| 13 | `background: #5cb85c;` | `background: var(--color-accent-green-strong);` |
| 17 | `background: #d9534f;` | `background: var(--color-accent-red);` |
| 21 | `background: #f0ad4e;` | `background: var(--color-accent-yellow);` |

**`styles/atoms/_key-indicator.css` (1 violation):**
| Line | Current | Replacement |
|---|---|---|
| 14 | `background-color: #333;` | `background-color: #333; /* TODO: add token — no matching var */` |

**`styles/molecules/_controls-group.css` (1 violation):**
| Line | Current | Replacement |
|---|---|---|
| 137 | `color: #000;` | `color: var(--color-text-inverse);` |

**`styles/organisms/_human-training.css` (1 violation):**
| Line | Current | Replacement |
|---|---|---|
| 165 | `background: #5cb85c;` | `background: var(--color-accent-green-strong);` |

**`styles/templates/_simulator-layout.css` (1 violation):**
| Line | Current | Replacement |
|---|---|---|
| 48 | `linear-gradient(#8cf, white 70%)` | No existing token for `#8cf`. Use `linear-gradient(#8cf, white 70%); /* TODO: add token for #8cf */` |

**`styles/templates/_race-layout.css` (1 violation):**
| Line | Current | Replacement |
|---|---|---|
| 7 | `linear-gradient(#8cf, white 70%)` | Same as above |

**`styles/templates/_landing-page.css` (1 violation):**
| Line | Current | Replacement |
|---|---|---|
| 10 | `linear-gradient(135deg, #7ddf7d, #4ecdc4)` | `linear-gradient(135deg, var(--color-accent-green), #4ecdc4)` — note `--color-accent-green` is `#7ddf7d` (matches first color). Second color `#4ecdc4` has no token: `linear-gradient(135deg, var(--color-accent-green), #4ecdc4); /* TODO: add token for #4ecdc4 */` |

### 9. Fix raw rgba() values in CSS

Search for all `rgba(` occurrences in CSS files under `styles/` (outside `tokens.css`). For each:

- If the color matches an existing `--color-*` token, use `var(--color-*)` with `alpha` fallback. CSS custom properties can't be interpolated directly in `rgba()`, so use the `color-mix()` approach or define separate token-opacity variants. Since the project doesn't use `color-mix` yet, the simplest approach is to keep raw `rgba()` values that can't be easily replaced and **add a `/* TODO */` comment**.
- If a matching token + opacity variant is defined (e.g., if `--color-accent-green-border` is `rgba(92, 184, 92, 0.3)`), use that.

Example of what to look for and annotate:

```
/* TODO: replace with token — e.g., var(--color-accent-green-border) */
background: rgba(92, 184, 92, 0.3);
```

### 10. Add missing spacing tokens to `tokens.css`

The most common raw px values that lack matching tokens are:

| Raw value | Suggested token     |
| --------- | ------------------- |
| `2px`     | `--space-0\.5: 2px` |
| `6px`     | `--space-1\.5: 6px` |

Add these to `styles/tokens.css` in the spacing section. The `--space-*` scale currently goes 1=4px, 2=8px, 3=12px, 4=16px, 5=24px, 6=32px. Insert the new tokens at the appropriate positions.

### 11. Fix raw px values to use tokens

This is the largest CSS change. For each CSS file in `styles/` (excluding `tokens.css`):

1. Identify common px values (`gap: 2px`, `padding: 4px`, `height: 32px`, etc.)
2. Replace with the appropriate token where a match exists:
   - `4px` → `var(--space-1)`
   - `8px` → `var(--space-2)`
   - `12px` → `var(--space-3)`
   - `16px` → `var(--space-4)`
   - `24px` → `var(--space-5)`
   - `32px` → `var(--space-6)`
   - `1px` (border) → keep raw; no border token exists
   - `2px` → `var(--space-0\.5)` (newly created)
   - `6px` → `var(--space-1\.5)` (newly created)
3. For `font-size` values:
   - `10px` → `var(--text-xs)` if defined
   - `12px` → `var(--text-sm)` if defined
   - `14px` → keep raw if no matching token
4. For `border-radius`:
   - `4px` → `var(--radius-sm)`
   - `8px` → `var(--radius-md)`
5. For values with no matching token (e.g., `3px`, `28px`, `30px`), keep raw and add `/* TODO */`

### Notes on CSS changes

- All CSS files are in `styles/` and follow an Atomic Design directory structure (`atoms/`, `molecules/`, `organisms/`, `templates/`, `pages/`).
- `tokens.css` contains all token definitions and is the ONLY file where raw values are acceptable.
- Use `grep -rn "px" styles/ --include="*.css" | grep -v tokens.css | grep -v "0px" | grep -v "1px"` to find candidate values. Filter to `gap`, `padding`, `margin`, `height`, `width`, `font-size`, `border-radius`, and `border-width` contexts (not `box-shadow`, `transform`, or `0px` which are OK raw).
- Be conservative: if a value would look wrong with a token substitution (e.g., `padding: 3px` → `var(--space-1)` = 4px changes the layout), keep it raw and `/* TODO */`.

## Brain / persistence considerations

None. No `ts/` changes affect brain dimensions, save files, or localStorage keys.

## Acceptance criteria

- **Stale files gone:** `ts/store/storePanel.ts`, `ts/simulator/training/trainingPanel.ts`, `ts/simulator/training/trainingInitModal.ts`, `ts/simulator/traffic/trafficPanel.ts`, `ts/simulator/humanTraining/humanTrainingPanel.ts`, `ts/simulator/humanTraining/humanTrainingConfigModal.ts` no longer exist in the working tree.
- **Traffic entry fixed:** `ts/traffic/entry.ts` imports from `../ui/molecules/*` and `../ui/organisms/*` instead of `../panels/*` or `../simulator/panels/*`.
- **Stale JS artifacts removed:** `js/panels/` and `js/simulator/panels/` directories no longer exist.
- **Types extracted:** `BorderMode` and `LayoutMode` defined in `ts/simulator/types.ts`; `modeControls.ts` imports them from there; domain files import from the shared location.
- **KeyboardManager decoupled:** No imports of `ShortcutsToolbarElement` from `keyboardManager.ts`. A `ToolbarUpdater` interface bridges the communication.
- **KeyboardManager relocated:** Lives at `ts/input/keyboardManager.ts`. All imports updated across the codebase.
- **CSS hex fixed:** No raw hex colors outside `styles/tokens.css` in any CSS file under `styles/`. All use `var(--color-*)` or have `/* TODO */` comments.
- **Spacing tokens added:** `--space-0\.5: 2px` and `--space-1\.5: 6px` in `styles/tokens.css`.
- **Raw px reduced:** All px values that have matching tokens (`--space-*`, `--text-*`, `--radius-*`) are replaced. Non-tokenizable px values have `/* TODO */` comments.
- **Build succeeds:** `tsc --noEmit` passes with zero errors.
- **Lint passes:** `npm run fix:all` (format + lint) passes with zero errors on all changed files.
- **Tests pass:** `npm test` passes (all 684 tests, ~75% coverage). No test behavior changed.
- **Visual tests pass:** `npm run test:visual` (Playwright) passes — no visual regressions from CSS changes.
- **No duplicate registrations:** `grep "customElements.define" ts/` shows each tag name exactly once.

## Docs to update

- `AGENTS.md` — update the `ts/ui/` hierarchy section to note `KeyboardManager` now lives in `ts/input/`. Add `ts/simulator/types.ts` reference if the architecture section mentions shared types. Update the "Known exception" note about keyboard controls to clarify `ts/input/keyboardManager.ts` as the canonical location.
- `docs/Architecture.md` (if it references `ts/ui/atoms/keyboardManager.ts` path) — update to `ts/input/keyboardManager.ts`.
- `docs/DesignSystem.md` — add the new spacing tokens (`--space-0\.5`, `--space-1\.5`) to the spacing token table.
