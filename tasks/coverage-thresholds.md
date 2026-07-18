# Add Coverage Thresholds to Vitest Config

**Date:** 2026-07-18
**Slug:** coverage-thresholds
**Entry points affected:** none (only `vitest.config.ts` changed)
**Save-file impact:** none
**Backward compat:** preserved

## Goal

Add coverage thresholds to `vitest.config.ts` so that `npm run test:coverage` fails if coverage drops below configurable levels. This creates a safety net against coverage regression.

## Context (read first)

- `vitest.config.ts` — minimal config with just `test.include`.
- Current coverage: 61% statements, 60% branches, 71% functions, 60% lines.
- The project has `@vitest/coverage-v8` already installed.
- `AGENTS.md` — project conventions.

## Architecture rules

1. **Thresholds are per-file** — global thresholds are too lenient for well-tested files and too strict for untested ones. Use per-file thresholds where possible.
2. **Start conservative** — set thresholds at current levels minus a small buffer to avoid flaky failures.
3. **Escalation path** — thresholds can be raised over time as coverage improves.

## Scope

### In scope

- Update `vitest.config.ts` with `coverage.thresholds`.
- Set global thresholds slightly below current levels.
- Optionally set per-directory thresholds for well-tested modules.
- Create a `tests/coverage-exceptions.ts` file for files that are intentionally low-coverage (rendering, DOM-dependent code).

### Out of scope

- Writing new tests — only threshold configuration.
- CI integration — covered by the CI pipeline plan.

## Implementation

### 1. Read the current `vitest.config.ts`

Current contents:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
```

### 2. Update `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/visual/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      include: ['ts/**'],
      exclude: [
        'ts/utils.ts',
        'ts/**/*.d.ts',
      ],
      thresholds: {
        // Global thresholds — slightly below current to avoid flaky failures
        statements: 58,
        branches: 55,
        functions: 68,
        lines: 58,
      },
    },
  },
});
```

If the config needs per-directory exceptions (e.g. for the rendering module which is 0%), use:

```typescript
coverage: {
  provider: 'v8',
  include: ['ts/**'],
  exclude: [
    'ts/utils.ts',
    'ts/**/*.d.ts',
  ],
  thresholds: {
    statements: 58,
    branches: 55,
    functions: 68,
    lines: 58,
    perFile: true, // Check each file individually (optional)
  },
  // Exclude specific files from threshold enforcement
  // by not including them — they just report 0% but don't fail
  // Instead, use a separate threshold set:
  // thresholds: {
  //   statements: 58,
  //   ...
  //   'ts/car/rendering/**': { statements: 0 },  // Allow 0% for rendering
  //   'ts/rendering/**': { statements: 0 },
  //   'ts/world/loader/**': { statements: 0 },
  //   'ts/world/generation/**': { statements: 30 },
  // },
}
```

### 3. Verify it works

```bash
npm run test:coverage
```

Expected: tests pass, coverage report prints, exit code 0 (because current coverage exceeds thresholds).

### 4. Test threshold failure

Temporarily set a very high threshold to verify failure mode:

```typescript
thresholds: {
  statements: 99, // Impossible
}
```

Then run:

```bash
npm run test:coverage
# Should fail with: ERROR: Coverage for statements (61%) does not meet global threshold (99%)
```

Revert to the reasonable thresholds before committing.

### 5. Add a `test:coverage:ci` script (optional)

For CI, it's useful to have a stricter check:

```json
"scripts": {
  "test:coverage:ci": "vitest run --coverage --coverage.thresholds.statements=60 --coverage.thresholds.branches=58"
}
```

This way the local check is lenient and CI is strict.

### 6. Run fix:all

```bash
npm run fix:all
```

## Acceptance criteria

- `npm run test:coverage` exits with code 0.
- Coverage thresholds are set at 58% statements, 55% branches, 68% functions, 58% lines.
- `vitest.config.ts` includes `exclude` for `tests/visual/`.
- `npm run fix:all` passes.

## Alternative approach: Incremental thresholds

If per-file thresholds are too complex to configure upfront, a simpler alternative is to just add a `coverage.thresholds` block and update it after each test-writing sprint. The task plan above uses the simple global approach — start there.

## Docs to update

- None (config is self-documenting).
