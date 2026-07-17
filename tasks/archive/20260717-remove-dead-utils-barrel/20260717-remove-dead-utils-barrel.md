# Remove Dead Barrel File `ts/utils.ts`

**Date:** 2026-07-17
**Slug:** remove-dead-utils-barrel
**Entry points affected:** none — shared `ts/` only
**Save-file impact:** none
**Backward compat:** preserved — all consumers already import directly from the actual source modules

## Goal

Remove `ts/utils.ts`, a legacy barrel/re-export file that has no remaining consumers. All modules in the codebase import `polysIntersect`, `getRGBA`, `getRandomColor`, `safeJsonParse`, and `stripFileExtension` directly from their definitive locations (`ts/math/collision.js`, `ts/math/color.js`, `ts/store/serialization.js`).

## Context (read first)

- `ts/utils.ts` — 3-line barrel file: re-exports `polysIntersect`, `getRGBA`, `getRandomColor`, `safeJsonParse`, `stripFileExtension` from their source modules.
- Search confirms zero imports from `'../utils.js'` (or any path resolving to `ts/utils.ts`) outside of `ts/math/` — those are imports of `ts/math/utils.ts` (a different file). Verified by grep for patterns like `from '\.\./utils\.js'` and `from '\.\./\.\./utils\.js'`.

## Scope

- **In scope:**
  - Delete `ts/utils.ts`.
  - Remove the barrel re-export note from AGENTS.md.
- **Out of scope:**
  - No changes to `ts/math/utils.ts` (a different, active file with geometry utility functions).
  - No import changes needed in any consumer — they already import from the source modules.

## Implementation

### 1. Delete `ts/utils.ts`

Remove the file at `/Users/alex/Code/Self-driving-car/ts/utils.ts`.

### 2. Update `AGENTS.md`

Find the bullet that says:

```
- **`utils.ts` split** — functions moved to `math/collision.ts` (...). Old file kept as re-export barrel.
```

Change it to:

```
- **`utils.ts` split** — functions moved to `math/collision.ts` (`polysIntersect`, `nearestEdgeOffset`), `math/worldUnits.ts` (world-unit conversions), `math/color.ts` (`getRGBA`, `getRandomColor`), `store/serialization.ts` (`safeJsonParse`, `stripFileExtension`). The legacy barrel `ts/utils.ts` has been removed — all consumers import directly from the source modules.
```

## Brain / persistence considerations

None.

## Acceptance criteria

- `npm run fix:all` passes and `tsc --noEmit` compiles clean — confirming no dangling imports.
- `ts/utils.ts` no longer exists.
- Opening `html/simulator.html`, `html/traffic.html`, `html/race.html`, `html/world.html`, `html/human-training.html` — all pages load without 404 errors (no missing imports).

## Docs to update

- `AGENTS.md` — update the `utils.ts` split note as described above.
