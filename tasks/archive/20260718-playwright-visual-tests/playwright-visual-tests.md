# Playwright Visual Regression Tests

**Date:** 2026-07-18
**Slug:** playwright-visual-tests
**Entry points affected:** none (only `tests/visual/` added)
**Save-file impact:** none
**Backward compat:** preserved

## Goal

Add Playwright visual regression tests for the 5 HTML entry points. This is the single highest-ROI test improvement — the project currently relies entirely on manual visual inspection for validation.

Playwright (v1.61.1) is already in `devDependencies` — no install needed.

## Context (read first)

- `AGENTS.md` — project conventions, architecture rules, entry points.
- `html/simulator.html` — Training (world mode, `?mode=simple` for simple road)
- `html/traffic.html` — Live Traffic Jam
- `html/race.html` — Racing (`?mode=camera` or `?mode=phone`)
- `html/world.html` — World editor
- `html/human-training.html` — Human Backpropagation training (`?mode=simple`)
- `vitest.config.ts` — ensure visual tests are excluded from the unit test runner.
- `eslint.config.mjs` — may need a rule block for `tests/visual/` (Node + browser globals).
- `tsconfig.json` — excludes `tests/**/*.ts`, so no config change needed.

All pages use `ts/` compiled to `js/` — served by `serve -p 9090`. No bundler.

## Architecture rules for visual tests

1. **Separate directory**: `tests/visual/` — not mixed with unit tests.
2. **Vitest config excludes** `tests/visual/` — Playwright has its own runner.
3. **Baseline screenshots** stored in `tests/visual/baselines/` per page.
4. **No hardcoded dimensions** — test at 1280x720 viewport consistently.
5. **Screenshots are full-page** — capture the entire scrollable area.
6. **Console error detection** — each test should assert no `console.error` or uncaught exceptions occurred during load.
7. **Test files use `.spec.ts` extension** (Playwright convention), not `.test.ts`.

## Scope

### In scope

- Create `tests/visual/` directory with Playwright config.
- Create `tests/visual/baselines/` for reference screenshots (single baseline per page).
- Write tests for **all 5 HTML pages**:
  - `simulator.spec.ts` — loads `simulator.html`, waits for canvas, screenshot
  - `traffic.spec.ts` — loads `traffic.html`, waits for canvas, screenshot
  - `race.spec.ts` — loads `race.html`, waits for canvas, screenshot
  - `world.spec.ts` — loads `world.html`, waits for canvas, screenshot
  - `human-training.spec.ts` — loads `human-training.html`, waits for canvas, screenshot
- Add `npm run test:visual` script to `package.json`.
- Update `AGENTS.md` with visual testing conventions.
- Add `tests/visual/` to vitest config's `exclude`.
- Update `eslint.config.mjs` for spec file globals.

### Out of scope

- Interaction tests (clicking, dragging, keyboard input) — deferred.
- Cross-browser testing (Chromium only for now).
- CI integration for visual diffs — deferred to the CI pipeline plan.
- Responsive/mobile viewport testing.
- Animation frame accuracy — just wait for `requestAnimationFrame` idle.

## Implementation

### 1. Create directory structure

```
tests/
  visual/
    baselines/
      simulator.png
      traffic.png
      race.png
      world.png
      human-training.png
    playwright.config.ts
    simulator.spec.ts
    traffic.spec.ts
    race.spec.ts
    world.spec.ts
    human-training.spec.ts
```

### 2. Create `tests/visual/playwright.config.ts`

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // serial — screenshots can interfere
  reporter: [['list'], ['html', { outputFolder: '../../playwright-report' }]],
  use: {
    baseURL: 'http://localhost:9090',
    viewport: { width: 1280, height: 720 },
    actionTimeout: 10000,
    screenshot: 'only-on-failure',
  },
  // Start server before tests
  webServer: {
    command: 'npx serve -p 9090',
    url: 'http://localhost:9090',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
```

### 3. Create `tests/visual/simulator.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import path from 'path';

const BASELINE_DIR = path.resolve(__dirname, 'baselines');

test.describe('Simulator page', () => {
  test('loads and renders the canvas', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/html/simulator.html');
    await page.waitForSelector('canvas', { timeout: 15000 });
    // Wait for initial render frames to settle
    await page.waitForTimeout(3000);

    expect(errors).toEqual([]);
    await expect(page).toHaveScreenshot('simulator.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });
});
```

### 4. Create `tests/visual/traffic.spec.ts`

Same structure as simulator, but:

- URL: `/html/traffic.html`
- Wait for canvas
- Screenshot named `traffic.png`
- Assert no console errors

### 5. Create `tests/visual/race.spec.ts`

Same structure, but test **two modes** in separate tests:

- `/html/race.html?mode=camera`
- `/html/race.html?mode=phone`
- Wait for canvas
- Screenshots named `race-camera.png` and `race-phone.png`

### 6. Create `tests/visual/world.spec.ts`

- URL: `/html/world.html`
- Wait for canvas
- Screenshot named `world.png`
- Assert no console errors

### 7. Create `tests/visual/human-training.spec.ts`

- URL: `/html/human-training.html`
- Wait for canvas
- Screenshot named `human-training.png`
- Assert no console errors

### 8. Generate baselines

```bash
# First run with --update-snapshots to create baseline images
PLAYWRIGHT_UPDATE_SNAPSHOTS=1 npx playwright test --config=tests/visual/playwright.config.ts
```

The baselines will be generated in `tests/visual/baselines/`.

**Important:** The baselines must be committed to the repo — they're the reference for future comparisons.

### 9. Add npm scripts to `package.json`

```json
"scripts": {
  "test:visual": "playwright test --config=tests/visual/playwright.config.ts",
  "test:visual:update": "PLAYWRIGHT_UPDATE_SNAPSHOTS=1 playwright test --config=tests/visual/playwright.config.ts",
}
```

### 10. Update `vitest.config.ts` to exclude visual tests

Add to the `test` object:

```typescript
exclude: ['tests/visual/**', 'node_modules/**'],
```

### 11. Update `eslint.config.mjs`

Add a rule block for `tests/visual/**/*.spec.ts` with:

```javascript
{
  files: ['tests/visual/**/*.spec.ts'],
  languageOptions: {
    globals: {
      ...globals.node,
      ...globals.browser,
    },
  },
  rules: {
    // Playwright test runner globals
  },
}
```

### 12. Update `AGENTS.md`

Add a visual testing section below the existing testing conventions:

```markdown
- **Visual regression** tests live in `tests/visual/` using Playwright.
- Run `npm run test:visual` to execute visual tests.
- Run `npm run test:visual:update` to update baseline screenshots.
- Baselines are stored in `tests/visual/baselines/` and must be committed.
- Visual tests start a local server on `:9090` automatically.
- **Chromium only** — no cross-browser visual testing yet.
```

## Acceptance criteria

- `npx playwright test --config=tests/visual/playwright.config.ts` passes (baselines exist).
- `npm run test:visual` runs the visual test suite and passes.
- `npm test` (unit tests) does NOT include visual tests.
- All 5 HTML pages are tested (6 tests including both race modes).
- Console errors during page load cause test failure.
- `npm run fix:all` passes.

## Gotchas

- **Canvas renders asynchronously** — `waitForSelector('canvas')` is not enough. Add `waitForTimeout(3000)` or poll for `requestAnimationFrame` completion via `page.evaluate(() => new Promise(requestAnimationFrame))`.
- **First-time run** without baselines will fail all tests with "Screenshot comparison failed — no baseline found". Use `PLAYWRIGHT_UPDATE_SNAPSHOTS=1` to create baselines.
- **Baseline drift** — if you change rendering code intentionally, run `npm run test:visual:update` to refresh baselines and commit the new ones.
- **`maxDiffPixels`** may need tuning per page (100 is a reasonable starting point; increase if CI produces false positives).
- **`serve` server** — the `webServer` config auto-starts it. If port 9090 is already in use (from `npm start`), set `reuseExistingServer: true` (it's already set for local dev).

## Docs to update

- `AGENTS.md` — add visual testing section.
