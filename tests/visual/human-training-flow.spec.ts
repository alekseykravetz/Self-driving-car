import { test, expect } from '@playwright/test';

/**
 * Real interaction flows for Human Backpropagation training. The page opens a
 * config modal on load; we start a car, then drive the actual keyboard/toggle
 * surfaces and assert the panel state the app updates in response.
 */
async function startSession(page: import('@playwright/test').Page) {
  await page.goto('/html/human-training.html');
  // A config modal blocks on load — start with the default car config.
  const startBtn = page.locator('#htcStartBtn');
  await startBtn.waitFor({ state: 'visible', timeout: 15000 });
  await startBtn.click();
  await page
    .locator('#htLearningState')
    .waitFor({ state: 'visible', timeout: 10000 });
}

test.describe('Human training interaction flows', () => {
  test('the L key toggles online learning on and off', async ({ page }) => {
    await startSession(page);
    const state = page.locator('#htLearningState');

    // Learning is ON by default.
    await expect(state).toHaveText('LEARNING');

    await page.keyboard.press('l');
    await expect(state).toHaveText('PAUSED');

    await page.keyboard.press('l');
    await expect(state).toHaveText('LEARNING');
  });

  test('enabling autopilot shows the banner and suspends learning', async ({
    page,
  }) => {
    await startSession(page);
    const autopilot = page.locator('#htAutopilot');
    const banner = page.locator('#htAutopilotBanner');
    const state = page.locator('#htLearningState');

    await expect(banner).toBeHidden();

    await autopilot.check();
    await expect(banner).toBeVisible();
    // The car now drives itself, so human-imitation learning is paused.
    await expect(state).toHaveText('PAUSED');

    await autopilot.uncheck();
    await expect(banner).toBeHidden();
  });

  test('driving forward increases the reported speed', async ({ page }) => {
    const fatalErrors: string[] = [];
    page.on('pageerror', (err) => fatalErrors.push(err.message));

    await startSession(page);
    const speed = page.locator('#htSpeed');
    await expect(speed).toHaveText('0.0 km/h');

    // Hold the accelerator for a moment — the car should pick up speed.
    await page.keyboard.down('ArrowUp');
    await expect
      .poll(
        async () =>
          parseFloat(
            (await speed.textContent())?.replace(/[^\d.]/g, '') || '0',
          ),
        {
          timeout: 8000,
        },
      )
      .toBeGreaterThan(0);
    await page.keyboard.up('ArrowUp');

    expect(fatalErrors).toEqual([]);
  });
});
