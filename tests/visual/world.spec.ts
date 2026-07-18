import { test, expect } from '@playwright/test';

test.describe('World editor page', () => {
  test('loads and renders the canvas', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/html/world.html');
    await page.waitForSelector('canvas#myCanvas', { timeout: 15000 });
    await page.waitForTimeout(3000);

    expect(errors).toEqual([]);
    await expect(page).toHaveScreenshot('world.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });
});
