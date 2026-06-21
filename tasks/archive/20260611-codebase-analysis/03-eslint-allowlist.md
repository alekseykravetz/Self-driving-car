# Task 03 — Clean stale ESLint allowlist

**Effort:** low · **Status:** done

## Problem

`eslint.config.mjs` still lists the removed globals `world` and `carInfo` in
`allowedUnusedVars`. These globals no longer exist at runtime (replaced by the
`StoreManager` singleton), so the allowance is dead config.

## Goal

Remove the stale `world` / `carInfo` entries from the ESLint allowlist.

## Steps

1. Open `eslint.config.mjs` and locate `allowedUnusedVars`.
2. Remove the `"world"` and `"carInfo"` entries.
3. Run `npm run lint` and confirm no new unused-var errors appear.

## Acceptance criteria

- `allowedUnusedVars` no longer contains `world` or `carInfo`.
- `npm run lint` passes.

## Notes

- If lint surfaces a real remaining usage, investigate before re-adding the entry.
