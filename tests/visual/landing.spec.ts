import { test, expect } from '@playwright/test';

test.describe('Landing page', () => {
  test('loads without console errors and renders the section cards', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/index.html');
    await page.waitForSelector('main.landing-sections', { timeout: 15000 });

    // Title is present.
    await expect(page.locator('h1.landing-title')).toContainText(
      'Self‑Driving Car Simulator',
    );

    // Feature cards render.
    const cards = page.locator('section.landing-card');
    expect(await cards.count()).toBeGreaterThanOrEqual(4);

    // The store panel custom element upgraded and rendered content.
    const storePanel = page.locator('store-panel');
    await expect(storePanel).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('navigation links point to the expected pages', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForSelector('main.landing-sections', { timeout: 15000 });

    const hrefs = await page
      .locator('a.card-btn')
      .evaluateAll((els) =>
        els.map((el) => (el as HTMLAnchorElement).getAttribute('href')),
      );

    // Each page linked from the landing page should be reachable.
    expect(hrefs).toContain('html/simulator.html?mode=simple');
    expect(hrefs).toContain('html/simulator.html');
    expect(hrefs.some((h) => h?.startsWith('html/human-training.html'))).toBe(
      true,
    );
    expect(hrefs.some((h) => h?.startsWith('html/race.html'))).toBe(true);
    expect(hrefs.some((h) => h?.startsWith('html/traffic.html'))).toBe(true);
    expect(hrefs.some((h) => h?.startsWith('html/world.html'))).toBe(true);
  });

  test('matches the visual baseline', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForSelector('main.landing-sections', { timeout: 15000 });

    // Hide the live-preview transition zone so the baseline stays
    // pixel-identical to the card grid (and free of the live canvas).
    await page.addStyleTag({
      content: '.preview-scene, .preview-splash { display: none !important; }',
    });
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('landing.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.03,
      // Mask animated icon custom elements to avoid AA/animation flakiness.
      mask: [page.locator('app-icon')],
    });
  });

  test('scrolling to the preview scene mounts and activates a live sim', async ({
    page,
  }) => {
    await page.goto('/index.html');
    await page.waitForSelector('main.landing-sections', { timeout: 15000 });

    // Scroll to the end so the sticky-pinned card is fully slid into view.
    await page.evaluate(() =>
      window.scrollTo({ top: document.body.scrollHeight }),
    );
    await expect(page.locator('.preview-scene')).toHaveClass(/preview-active/);
    await expect(page.locator('preview-simulator canvas')).toBeVisible();

    await page.evaluate(() => window.scrollTo({ top: 0 }));
    await expect(page.locator('.preview-scene')).not.toHaveClass(
      /preview-active/,
    );
  });
});
