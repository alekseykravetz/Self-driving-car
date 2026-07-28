import { test, expect } from '@playwright/test';

/**
 * Functional regression tests for the multi-panel canvas layout.
 *
 * Guards against the bug where the game canvas kept its default 300px basis and
 * was collapsed to 0 width by the flex layout when a page loaded idle/paused
 * (the `resizeLayout()` call sat behind an early-return guard that never ran
 * until cars were spawned). The canvas must be sized on first paint regardless
 * of simulation state.
 */
test.describe('Canvas layout sizing', () => {
  const pages = [
    { name: 'simulator (world mode)', url: '/html/simulator.html?paused=1' },
    {
      name: 'simulator (simple mode)',
      url: '/html/simulator.html?mode=simple&paused=1',
    },
    { name: 'human training', url: '/html/human-training.html?paused=1' },
  ];

  for (const { name, url } of pages) {
    test(`game canvas has a non-zero rendered size on load — ${name}`, async ({
      page,
    }) => {
      await page.goto(url);
      const canvas = page.locator('canvas#gameCanvas');
      await canvas.waitFor({ state: 'attached', timeout: 15000 });

      // Poll until the layout has sized the canvas (first paused draw).
      await expect
        .poll(
          async () => {
            const box = await canvas.boundingBox();
            return box ? Math.round(box.width) : 0;
          },
          { timeout: 10000 },
        )
        .toBeGreaterThan(0);

      const box = await canvas.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(0);
      expect(box!.height).toBeGreaterThan(0);
    });
  }
});
