import { test, expect } from '@playwright/test';

/**
 * Mobile visual regression tests.
 *
 * Mirrors the desktop specs but runs each page at a phone-sized viewport so the
 * `@media (max-width: 768px)` mobile layout (single-column landing grid,
 * collapsed store tabs, touch-first chrome) is covered. Canvases are masked so
 * the pixel comparison only checks the stable HTML/CSS UI chrome — the same
 * approach the desktop specs use.
 */

// iPhone 12 logical viewport (below the 768px mobile breakpoint) with touch.
// Set at file scope: a mobile `test.use` cannot live inside a `describe`
// because it would force a new worker. `defaultBrowserType` is intentionally
// omitted so this stays on the config's Chromium project.
test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
});

test.describe('Mobile layout', () => {
  test('landing page renders the mobile layout', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/index.html');
    await page.waitForSelector('main.landing-sections', { timeout: 15000 });
    await page.waitForTimeout(500);

    expect(errors).toEqual([]);
    await expect(page).toHaveScreenshot('mobile-landing.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.03,
      mask: [page.locator('app-icon')],
    });
  });

  test('simulator page renders on mobile', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/html/simulator.html?paused=1');
    await page.waitForSelector('canvas#gameCanvas', { timeout: 15000 });
    await page.waitForTimeout(1000);

    expect(errors).toEqual([]);
    await expect(page).toHaveScreenshot('mobile-simulator.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.03,
      mask: [page.locator('canvas')],
    });
  });

  test('traffic page renders on mobile', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/html/traffic.html?paused=1');
    await page.waitForSelector('canvas#gameCanvas', { timeout: 15000 });
    await page.waitForTimeout(1000);

    expect(errors).toEqual([]);
    await expect(page).toHaveScreenshot('mobile-traffic.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.03,
      mask: [page.locator('canvas')],
    });
  });

  test('world editor page renders on mobile', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/html/world.html?paused=1');
    await page.waitForSelector('canvas#myCanvas', { timeout: 15000 });
    await page.waitForTimeout(1000);

    expect(errors).toEqual([]);
    await expect(page).toHaveScreenshot('mobile-world.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.03,
      mask: [page.locator('canvas')],
    });
  });

  test('race page renders on mobile in phone mode', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/html/race.html?mode=phone&paused=1');
    await page.waitForSelector('canvas#cameraCanvas', { timeout: 15000 });
    await page.waitForTimeout(1000);

    expect(errors).toEqual([]);
    await expect(page).toHaveScreenshot('mobile-race-phone.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.03,
      mask: [page.locator('canvas')],
    });
  });
});
