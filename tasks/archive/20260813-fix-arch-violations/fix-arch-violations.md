# Fix two Medium architecture violations

**Date:** 2026-08-13
**Slug:** fix-arch-violations
**Entry points affected:** none — shared `ts/` only
**Save-file impact:** none
**Backward compat:** preserved — no runtime behavior change, only import paths

## Goal

Fix the two Medium findings from the architecture audit: (1) `EditorType` is defined in `ts/simulator/types.ts` (Layer 4) but consumed by the world layer (Layer 2), creating an upward FSD dependency; (2) `assetSelectors.ts` is classified as an organism but is a plain helper class (no custom element, no template), causing a molecule to import an organism — an Atomic Design violation.

## Context (read first)

- `ts/simulator/types.ts` — currently defines `EditorType` (lines 4–15) alongside `BorderMode`, `LayoutMode`, `TrackingMode`.
- `ts/world/types.ts` — currently re-exports `EditorType` from `../simulator/types.js` (line 112). This re-export makes the world layer a pass-through for a simulator-layer type.
- `ts/world/editors/worldEditor.ts` — imports `EditorType` from `'../../simulator/types.js'` (line 2); uses it as a key type (line 63), a field type (line 75), and a parameter type (line 401).
- `ts/ui/molecules/editorToolbar.ts` — imports `EditorType` from `'../../simulator/types.js'` (line 1); uses it in 7 places (field, params, callbacks).
- `ts/ui/organisms/assetSelectors.ts` — the `ToolbarAssetSelectors` class. It is a plain helper: no `customElements.define`, no `extends HTMLElement`, no `connectedCallback`, no template. Takes a `host: HTMLElement` and manipulates it. By AGENTS.md § UI Architecture, this is a molecule, not an organism.
- `ts/ui/molecules/worldSetup.ts` — imports `ToolbarAssetSelectors` from `'../organisms/assetSelectors.js'` (line 5). This is the molecule→organism Atomic Design violation.
- Five entry-point files have side-effect imports (`import '../ui/organisms/assetSelectors.js'`) that register the module: `ts/race/entry.ts:83`, `ts/simulator/humanTraining/entry.ts:74`, `ts/simulator/entry.ts:78`, `ts/world/entry.ts:57`, `ts/traffic/entry.ts:75`.
- `tests/unit/panels/editorToolbar.test.ts:4` — imports `EditorType` from `../../../ts/simulator/types.js`.
- `tests/unit/world/editors/worldEditor.test.ts:506` — imports `EditorType` from `../../../../ts/simulator/types.js`.
- `tests/unit/panels/assetSelectors.test.ts:3` — imports `ToolbarAssetSelectors` from `../../../ts/ui/organisms/assetSelectors.js`.
- AGENTS.md § UI Architecture lists `assetSelectors` under `ts/ui/organisms/` and `EditorType` is implicitly under `ts/simulator/types.ts` per the "Domain types isolation" rule.

## Scope

- **In scope:**
  - Move `EditorType` type definition from `ts/simulator/types.ts` to `ts/world/types.ts`.
  - Remove the re-export at `ts/world/types.ts:112`.
  - Update all `EditorType` imports to point at `ts/world/types.js`.
  - Move `ts/ui/organisms/assetSelectors.ts` to `ts/ui/molecules/assetSelectors.ts`.
  - Update all `assetSelectors` imports to point at the new path.
  - Update AGENTS.md § UI Architecture to reflect the new locations.
- **Out of scope:**
  - No runtime behavior changes.
  - No new types, no new files, no CSS changes (assetSelectors has no dedicated CSS file).
  - The Low findings (tooltip keydown, deep import chains, raw rgba) are NOT addressed here.

## Implementation

### Phase 1 — Move `EditorType` to `ts/world/types.ts`

1. **`ts/simulator/types.ts`** — Remove the `EditorType` type definition (lines 4–15). The file keeps `BorderMode`, `LayoutMode`, and `TrackingMode`.
2. **`ts/world/types.ts`** — Add the `EditorType` type definition (the same union: `'graph' | 'marking' | 'stop' | 'crossing' | 'start' | 'parking' | 'light' | 'target' | 'corridor' | 'yield' | 'inspect'`). Remove the re-export at line 112 (`export type { EditorType } from '../simulator/types.js';`).
3. **`ts/world/editors/worldEditor.ts`** — Change the import on line 2 from `'../../simulator/types.js'` to `'../types.js'`.
4. **`ts/ui/molecules/editorToolbar.ts`** — Change the import on line 1 from `'../../simulator/types.js'` to `'../../world/types.js'`.
5. **`tests/unit/panels/editorToolbar.test.ts`** — Change the import on line 4 from `'../../../ts/simulator/types.js'` to `'../../../ts/world/types.js'`.
6. **`tests/unit/world/editors/worldEditor.test.ts`** — Change the import on line 506 from `'../../../../ts/simulator/types.js'` to `'../../../../ts/world/types.js'`.

### Phase 2 — Move `assetSelectors.ts` to `ts/ui/molecules/`

1. **Move the file** `ts/ui/organisms/assetSelectors.ts` → `ts/ui/molecules/assetSelectors.ts`. (Use `git mv` to preserve history.)
2. **`ts/ui/molecules/worldSetup.ts`** — Change the import on line 5 from `'../organisms/assetSelectors.js'` to `'./assetSelectors.js'`.
3. **`ts/race/entry.ts`** — Change the side-effect import on line 83 from `'../ui/organisms/assetSelectors.js'` to `'../ui/molecules/assetSelectors.js'`.
4. **`ts/simulator/humanTraining/entry.ts`** — Change the side-effect import on line 74 from `'../../ui/organisms/assetSelectors.js'` to `'../../ui/molecules/assetSelectors.js'`.
5. **`ts/simulator/entry.ts`** — Change the side-effect import on line 78 from `'../ui/organisms/assetSelectors.js'` to `'../ui/molecules/assetSelectors.js'`.
6. **`ts/world/entry.ts`** — Change the side-effect import on line 57 from `'../ui/organisms/assetSelectors.js'` to `'../ui/molecules/assetSelectors.js'`.
7. **`ts/traffic/entry.ts`** — Change the side-effect import on line 75 from `'../ui/organisms/assetSelectors.js'` to `'../ui/molecules/assetSelectors.js'`.
8. **`tests/unit/panels/assetSelectors.test.ts`** — Change the import on line 3 from `'../../../ts/ui/organisms/assetSelectors.js'` to `'../../../ts/ui/molecules/assetSelectors.js'`.

### Phase 3 — Update AGENTS.md

1. In the **TS Component Hierarchy** section under `ts/ui/`, remove `assetSelectors` from the `organisms/` list and add it to the `molecules/` list.
2. In the **Domain types isolation** rule, add a note that `EditorType` lives in `ts/world/types.ts` (it is a world-editor domain type), while `BorderMode` and `LayoutMode` remain in `ts/simulator/types.ts`.

## Brain / persistence considerations

None. No runtime behavior, no save-file schema, no brain dimensions, no localStorage keys.

## Acceptance criteria

- `npm run rebuild` (wipes `js/` and recompiles from `ts/`) succeeds with zero errors.
- `npx tsc --noEmit` passes.
- `npm run lint` passes (eslint auto-fix).
- `npm run format:check` passes.
- `npm test` passes — all existing unit tests still pass with the updated import paths.
- `rg "EditorType" ts/` shows zero imports from `simulator/types.js`; all import from `world/types.js` (or `../types.js` within the world layer).
- `rg "organisms/assetSelectors" ts/ tests/` returns zero matches.
- `rg "molecules/assetSelectors" ts/ tests/` returns the expected 7 matches (1 value import in worldSetup, 5 side-effect imports in entry files, 1 test import).
- AGENTS.md § UI Architecture lists `assetSelectors` under molecules, not organisms.

## Docs to update

- `AGENTS.md` — § UI Architecture (TS component hierarchy) and § Architecture rules ("Domain types isolation" bullet). See Phase 3 above.
- No `docs/*.md` files need changes — this is a pure code-organization refactor with no behavioral or API change.
