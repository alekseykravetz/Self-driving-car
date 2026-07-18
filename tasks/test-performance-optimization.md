# Test Performance Optimization

**Date:** 2026-07-18
**Slug:** test-performance-optimization
**Entry points affected:** none (only `vitest.config.ts` and optionally `package.json`)
**Save-file impact:** none
**Backward compat:** preserved

## Goal

Optimize test execution time. Currently tests take ~2.7s wall clock but spend **7.2s importing** vs **716ms executing** — a 10:1 import-to-execution ratio. Reducing import overhead makes the test-feedback loop faster during development.

## Context (read first)

- Current `vitest.config.ts` — minimal config with just `test.include`.
- Test suite: 579 tests in 40 files.
- The project uses ES modules with `module: "nodenext"` and relative `.js` import paths.
- Vitest v4 uses `esbuild` for TypeScript transformation by default.
- The main cost is **module resolution + transformation** on first run (7.19s import time).

## Architecture rules

1. **No bundler change** — the project doesn't use a bundler. Vitest's built-in transform pipeline is the only mechanism. Don't add `vite` as a dependency.
2. **Cache-friendly** — any change should make repeated runs faster, not just cold runs.
3. **Deterministic** — optimizations must not change test behavior.

## Scope

### In scope

- Enable Vitest cache for faster incremental runs.
- Configure `pool` and `poolOptions` for parallel execution.
- Add `deps.optimizer` configuration.
- Add `test:fast` script for running only changed tests during development.
- Configure `server.deps.fallbackCJS` for faster CJS interop.

### Out of scope

- Splitting tests into separate Vitest projects (too complex for the current test count).
- Adding `vite` as a build tool to the project.
- Restructuring imports in production code to improve test performance.
- Moving to `swc` or `esbuild` for a different transform pipeline.

## Implementation

### 1. Update `vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/visual/**', 'node_modules/**'],

    // Enable result caching for faster repeated runs
    cache: {
      dir: 'node_modules/.vitest',
    },

    // Use forks pool with multiple workers
    pool: 'forks',
    poolOptions: {
      forks: {
        // Single fork is actually faster for small suites with heavy imports
        singleFork: false,
        // Don't isolate forks (saves ~10% overhead)
        isolate: false,
      },
      threads: {
        singleThread: false,
        isolate: false,
      },
    },

    // File change detection for --changed flag
    watch: {
      exclude: ['node_modules/**', 'js/**', 'coverage/**'],
    },
  },
});
```

**Key decisions:**

- `singleFork: false` — use multiple workers (files are independent).
- `isolate: false` — workers share module cache after first file (safe because tests don't mutate modules).
- `cache.dir` — enables Vitest's built-in cache. Second run (with no file changes) will be faster.

### 2. Add `test:fast` script to `package.json`

```json
"scripts": {
  "test:fast": "vitest run --changed",
  "test:changed": "vitest run --changed",
  "test:affected": "vitest run --related='ts/**'"
}
```

- `--changed` — only runs tests for files that have changed since the last commit.
- `--changed=HEAD~1` — runs tests for files changed in the last commit.
- `--related='ts/**'` — runs tests related to changed source files (vitest tracks dependencies automatically).

### 3. Add `test:dev` script for fast watching

```json
"scripts": {
  "test:dev": "vitest --reporter=verbose --changed"
}
```

This starts Vitest in watch mode but only runs tests for changed files initially.

### 4. Profile a cold run vs warm run

```bash
# Cold run
npm test -- --reporter=verbose
# Note the total time

# Warm run (immediately after)
npm test -- --reporter=verbose
# Should be faster due to cache

# Changed-only run
touch ts/math/spatialGrid.ts
npm run test:fast
# Should run only spatialGrid tests (and its dependents)
```

### 5. Optional: Add `test.profiling` for debugging slow tests

Requires `@vitest/ui`:

```json
"scripts": {
  "test:profile": "vitest --ui --reporter=html"
}
```

This provides a flamechart of test execution. (Adding `@vitest/ui` as a devDependency if desired — see https://vitest.dev/guide/ui.html)

### 6. Record baseline improvement

```bash
# Before optimization
time npm test

# After optimization
time npm test

# Compare
echo "Before vs After: check 'real' time in the time output"
```

## Acceptance criteria

- `npm test` runs with no errors.
- `npm run test:fast` runs only tests for changed files.
- `npm run test:changed` works and is faster than full suite for incremental changes.
- All 579 tests still pass.
- `npm run fix:all` passes.

## Expected improvement

| Metric                      | Before | After (estimate)    |
| --------------------------- | ------ | ------------------- |
| Cold run (no cache)         | 10-12s | 8-10s (pool opt)    |
| Warm run (with cache)       | 10-12s | 3-5s (cache hit)    |
| Incremental (1 file change) | 10-12s | 1-3s (changed only) |

## Gotchas

- **`isolate: false`** — if any test mutates a module-level variable that another test depends on, this can cause cross-test contamination. If tests start failing in non-deterministic ways, set `isolate: true` or revert to `pool: 'threads'` with `isolate: true`.
- **`pool: 'forks'` vs `pool: 'threads'`** — forks are more isolated but slightly slower. Threads are faster but share memory. For this project's test count (579), the difference is negligible. Start with `forks`.
- **`cache.dir` in `node_modules/.vitest`** — this directory is deleted by `npm ci`. That's fine — cache is recreated on the next run.
- **`--changed` flag** — depends on git. If the repo isn't a git checkout (e.g., detached tarball), `--changed` won't work. Keep it as an optional optimization.
- **Ecosystem note** — Vitest v4 caches aggressively by default. The key optimization here is actually the `pool` config and the `--changed` flag, not the cache itself.

## Docs to update

- `package.json` — add `test:fast`, `test:changed`, `test:dev` scripts.
- `AGENTS.md` — add the new npm scripts to the Key commands table:
  ```
  | `npm run test:fast` | Run tests for changed files only |
  | `npm run test:changed` | Run tests for changed files only |
  | `npm run test:dev` | Watch mode with fast initial run |
  ```
