# CI Pipeline (GitHub Actions)

**Date:** 2026-07-18
**Slug:** ci-pipeline
**Entry points affected:** none (only `.github/` directory added)
**Save-file impact:** none
**Backward compat:** preserved

## Goal

Add a GitHub Actions CI workflow that runs on every push and pull request. Currently the project has no CI — tests only run locally.

## Context (read first)

- `AGENTS.md` — project conventions.
- `package.json` — test scripts: `test`, `test:coverage`, `test:watch`, `test:visual`.
- `vitest.config.ts` — Vitest v4 config.
- Node.js version used in `package.json` — the project uses TypeScript 5.8 which requires Node >= 18.17.
- The project has zero runtime dependencies — `npm ci` will be very fast.
- There's no bundler — just `tsc` compilation.

## Architecture rules for CI

1. **Fast fail** — lint + typecheck first, then tests, then coverage.
2. **Caching** — cache `node_modules` and `.tsbuildinfo` for speed.
3. **No secrets** — no API keys in CI. Tests that need API keys must mock them.
4. **Playwright visual tests** — added as a separate job (requires baseline images).
5. **Coverage upload** — upload `coverage/` as an artifact for review.

## Scope

### In scope

- Create `.github/workflows/test.yml` with:
  - **Lint + Typecheck** job (fastest, runs first)
  - **Unit tests** job
  - **Visual tests** job (if baselines exist; allow failure initially)
  - **Coverage upload** artifact
- Node matrix: `[18, 20, 22]` (LTS versions)
- Caching: `actions/cache` for `node_modules` and `~/.cache/ms-playwright`

### Out of scope

- Deploy/publish workflow (deferred).
- Code coverage thresholds blocking PRs (deferred to the threshold config plan).
- Cross-browser visual testing (Chromium only for now).
- Performance/bundle-size checks.

## Implementation

### 1. Create `.github/workflows/test.yml`

```yaml
name: Test

on:
  push:
    branches: [main, master, develop]
  pull_request:
    branches: [main, master, develop]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint:
    name: Lint & Typecheck
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - run: npm run format -- --check
        continue-on-error: true
      - run: npm run lint
      - run: npx tsc --noEmit

  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    timeout-minutes: 10
    strategy:
      fail-fast: false
      matrix:
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npm test
      - name: Coverage
        run: npm run test:coverage
      - name: Upload coverage
        uses: actions/upload-artifact@v4
        with:
          name: coverage-${{ matrix.node-version }}
          path: coverage/
          retention-days: 14

  visual-tests:
    name: Visual Regression Tests
    runs-on: ubuntu-latest
    timeout-minutes: 10
    continue-on-error: true # Allow failures until baselines stabilize
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - name: Install Playwright browsers
        run: npx playwright install chromium
      - name: Run visual tests
        run: npm run test:visual
      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 14
      - name: Upload screenshots
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-screenshots
          path: test-results/
          retention-days: 14
```

### 2. Create `.github/workflows/publish.yml` (optional, but nice to have)

```yaml
name: Publish

on:
  push:
    branches: [main]

jobs:
  deploy:
    name: Deploy to here.now
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - run: npm run publish:site
```

Skip this if the publish mechanism requires interactive authentication.

### 3. Add `.gitignore` entries (if not already present)

Ensure these are in `.gitignore`:

```
coverage/
playwright-report/
test-results/
```

### 4. Test the workflow locally

Use `act` to simulate the workflow locally (optional):

```bash
# Install act: https://github.com/nektos/act
act -j unit-tests --container-architecture linux/amd64
```

Or push a branch and verify on GitHub.

## Acceptance criteria

- `.github/workflows/test.yml` exists with all 3 jobs.
- PR checks appear on GitHub after pushing a branch.
- `lint` job passes: `tsc --noEmit` + `eslint --fix` succeed.
- `unit-tests` job runs `npm test` + `npm run test:coverage` for all 3 Node versions.
- `visual-tests` job runs `npm run test:visual` and uploads artifacts on failure.
- Coverage artifacts are uploaded and downloadable.
- `npm run fix:all` passes.

## Gotchas

- **`npm run format -- --check`** — Prettier's `--check` flag needs the extra `--` separator. If the project doesn't have a format-check script, add one: `"format:check": "prettier --check ."`.
- **`tsc --noEmit`** — the main `tsconfig.json` excludes `tests/**/*.ts` and `vitest.config.ts`. This is correct — CI doesn't need to typecheck test files.
- **`npm ci`** — requires `package-lock.json`. If the repo doesn't have a committed lockfile, use `npm install` instead. Check with `ls package-lock.json`.
- **Playwright browsers** — `npx playwright install chromium` installs the Chromium browser (~300MB). Cache with `actions/cache` to save download time on repeat runs:
  ```yaml
  - name: Cache Playwright browsers
    uses: actions/cache@v4
    with:
      path: ~/.cache/ms-playwright
      key: playwright-${{ runner.os }}-${{ hashFiles('package-lock.json') }}
  ```

## Docs to update

- `AGENTS.md` — mention CI badge and workflow file location. No changes needed for testing section.
