# Cleanup: Remove Duplicate `.js` Test Files

**Date:** 2026-07-18
**Slug:** cleanup-duplicate-js-tests
**Entry points affected:** none
**Save-file impact:** none
**Backward compat:** preserved (Vitest will only find the remaining `.ts` files)

## Goal

Remove 26 stale `.js` test files that are duplicates of their `.ts` counterparts.  
These `.js` files are leftovers from a migration. Vitest picks up both, so tests run twice, wasting ~30% import time.

## Context (read first)

- The project uses Vitest with `include: ['tests/**/*.test.ts']` in `vitest.config.ts`.
- 26 test files exist as both `*.test.js` and `*.test.ts` pairs — the `.ts` is canonical.
- Run `npm test` to verify after cleanup.
- Run `npm run fix:all` before final commit.

## Implementation

### 1. Delete all `.js` duplicates

Run from the repo root:

```bash
# Remove every .test.js file that has a matching .test.ts sibling
for f in tests/unit/**/*.test.js; do
  ts="${f%.js}.ts"
  if [ -f "$ts" ]; then
    rm "$f"
    echo "Removed $f"
  fi
done
```

Verify deletion:

```bash
find tests -name '*.test.js' | wc -l
# Should print 0
```

### 2. Check for any standalone `.js` test files

If a `.js` test file exists WITHOUT a `.ts` counterpart, **keep it** — it's not a duplicate.  
Check with:

```bash
find tests -name '*.test.js' -not -path '*/node_modules/*'
```

If any remain, verify each is intentionally JS-only (no corresponding `.ts` file).

### 3. Run tests

```bash
npm test
```

All 579+ tests must still pass.  
Then verify the count hasn't halved (due to running only once now, not twice):

```bash
npm test 2>&1 | grep "Tests"
# Should show roughly the same test count as before
```

### 4. Run fix:all

```bash
npm run fix:all
```

## Acceptance criteria

- `find tests -name '*.test.js'` returns 0 files
- `npm test` passes with all tests green
- No `.ts` files were harmed (only `.js` duplicates removed)
- `npm run fix:all` passes

## Docs to update

None.
