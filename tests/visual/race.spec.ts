import { test, expect } from '@playwright/test';

test.describe('Race page', () => {
  test('loads and renders the canvas in camera mode', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      // Camera access is expected to fail in headless browser
      if (
        msg.type() === 'error' &&
        !msg.text().includes('Error accessing camera')
      )
        errors.push(msg.text());
    });

    await page.goto('/html/race.html?mode=camera&paused=1');
    await page.waitForSelector('canvas#cameraCanvas', { timeout: 15000 });
    await page.waitForTimeout(1000);

    expect(errors).toEqual([]);
    await expect(page).toHaveScreenshot('race-camera.png', {
      fullPage: true,
      maxDiffPixels: 5000,
      mask: [page.locator('canvas')],
    });
  });

  test('loads and renders the canvas in phone mode', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/html/race.html?mode=phone&paused=1');
    await page.waitForSelector('canvas#cameraCanvas', { timeout: 15000 });
    await page.waitForTimeout(1000);

    expect(errors).toEqual([]);
    await expect(page).toHaveScreenshot('race-phone.png', {
      fullPage: true,
      maxDiffPixels: 5000,
      mask: [page.locator('canvas')],
    });
  });
});
