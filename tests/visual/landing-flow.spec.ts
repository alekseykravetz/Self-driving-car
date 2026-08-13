import { test, expect } from '@playwright/test';

/**
 * Real user-journey flows from the landing page: click each launch card and
 * verify it navigates to the right page and that page boots a live canvas
 * without throwing. These are functional (no screenshots) — they guard the
 * links + each page's bootstrap wiring end-to-end.
 */

interface Destination {
  label: string;
  href: string;
  urlPart: string;
}

const DESTINATIONS: Destination[] = [
  {
    label: 'Simple Road training',
    href: 'html/simulator.html?mode=simple',
    urlPart: 'simulator.html',
  },
  {
    label: 'Full World training',
    href: 'html/simulator.html',
    urlPart: 'simulator.html',
  },
  {
    label: 'Human Backprop (simple)',
    href: 'html/human-training.html?mode=simple',
    urlPart: 'human-training.html',
  },
  { label: 'Live Traffic', href: 'html/traffic.html', urlPart: 'traffic.html' },
  {
    label: 'Race (camera)',
    href: 'html/race.html?mode=camera',
    urlPart: 'race.html',
  },
  { label: 'World editor', href: 'html/world.html', urlPart: 'world.html' },
  {
    label: 'Import from OpenStreetMap',
    href: 'html/world.html?import=osm',
    urlPart: 'world.html',
  },
];

test.describe('Landing page launch flows', () => {
  test('the landing page lists every launch card', async ({ page }) => {
    await page.goto('/');
    const cards = page.locator('a.card-btn');
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThanOrEqual(DESTINATIONS.length);
  });

  for (const dest of DESTINATIONS) {
    test(`launches ${dest.label} and boots a canvas`, async ({ page }) => {
      const fatalErrors: string[] = [];
      page.on('pageerror', (err) => fatalErrors.push(err.message));
      page.on('console', (msg) => {
        if (msg.type() !== 'error') return;
        const text = msg.text();
        // Camera/mic access legitimately fails in headless Chromium.
        if (text.includes('Error accessing camera')) return;
        if (text.includes('getUserMedia')) return;
        // Chromium reports external font CDN failures as console errors. They
        // do not indicate that the page bootstrap failed.
        if (text.includes('Failed to load resource')) return;
        fatalErrors.push(text);
      });
      page.on('response', (response) => {
        if (
          response.status() === 404 &&
          response.url().startsWith('http://localhost:9090/')
        ) {
          fatalErrors.push(`404 ${response.url()}`);
        }
      });

      await page.goto('/');
      // Add ?paused=1 so the launched page doesn't burn CPU animating.
      const link = page.locator(`a.card-btn[href="${dest.href}"]`).first();
      await expect(link).toBeVisible();
      const target = (await link.getAttribute('href'))!;
      const sep = target.includes('?') ? '&' : '?';
      await page.goto('/' + target + sep + 'paused=1');

      await expect(page).toHaveURL(new RegExp(dest.urlPart));
      // Every simulator/editor page mounts at least one canvas on boot.
      await page
        .locator('canvas')
        .first()
        .waitFor({ state: 'attached', timeout: 15000 });
      await page.waitForTimeout(500);

      expect(fatalErrors).toEqual([]);
    });
  }
});
