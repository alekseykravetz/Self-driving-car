import { test, expect } from '@playwright/test';

test.describe('Simulator page', () => {
  test('loads and renders the canvas', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/html/simulator.html?paused=1');
    await page.waitForSelector('canvas#gameCanvas', { timeout: 15000 });
    await page.waitForTimeout(1000);

    expect(errors).toEqual([]);
    await expect(page).toHaveScreenshot('simulator.png', {
      fullPage: true,
      maxDiffPixels: 5000,
      mask: [page.locator('canvas')],
    });
  });
});
