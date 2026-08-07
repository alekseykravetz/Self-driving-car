import { test, expect } from '@playwright/test';

/**
 * Real training-launch flow: the simulator opens a "Start Training" modal on
 * load. Starting it must dismiss the modal and spawn a live population — the
 * panel's Alive counter is the app's own read-out of that, so we assert on it.
 */
test.describe('Training simulator launch flow', () => {
  test('starting training spawns a live car population', async ({ page }) => {
    const fatalErrors: string[] = [];
    page.on('pageerror', (err) => fatalErrors.push(err.message));

    // Simple mode keeps world generation trivial and fast/deterministic.
    await page.goto('/html/simulator.html?mode=simple');
    await page
      .locator('canvas#gameCanvas')
      .waitFor({ state: 'attached', timeout: 15000 });

    const modal = page.locator('training-init-modal');
    const startBtn = page.locator('#tiStartBtn');
    await startBtn.waitFor({ state: 'visible', timeout: 15000 });
    await expect(modal).toHaveClass(/open/);

    await startBtn.click();

    // Modal closes...
    await expect(modal).not.toHaveClass(/open/);

    // ...and the Alive stat climbs above zero once cars are spawned.
    const alive = page.locator('#stat-alive');
    await expect
      .poll(async () => Number((await alive.textContent()) || '0'), {
        timeout: 10000,
      })
      .toBeGreaterThan(0);

    expect(fatalErrors).toEqual([]);
  });
});
