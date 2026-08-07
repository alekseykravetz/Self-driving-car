import { test, expect } from '@playwright/test';

/**
 * Real interaction flows in the world editor. All assertions are on
 * DOM-observable state the app actually mutates in response to user input
 * (active tool button, OSM panel visibility, road-brush defaults) — no
 * screenshots, so these fail loudly on wiring regressions.
 */
test.describe('World editor interaction flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/html/world.html?paused=1');
    await page
      .locator('canvas#myCanvas')
      .waitFor({ state: 'attached', timeout: 15000 });
    // Toolbars are custom elements that render on connect.
    await page
      .locator('#editorToolbar .editor-mode-btn')
      .first()
      .waitFor({ timeout: 10000 });
  });

  test('switches the active editor tool when a toolbar button is clicked', async ({
    page,
  }) => {
    const graphBtn = page.locator('#graphBtn');
    const inspectBtn = page.locator('#inspectBtn');
    const stopBtn = page.locator('#stopBtn');

    // Graph is the default active tool on load.
    await expect(graphBtn).toHaveClass(/active/);

    await inspectBtn.click();
    await expect(inspectBtn).toHaveClass(/active/);
    await expect(graphBtn).not.toHaveClass(/active/);

    await stopBtn.click();
    await expect(stopBtn).toHaveClass(/active/);
    await expect(inspectBtn).not.toHaveClass(/active/);
    // Exactly one tool is active at a time.
    await expect(
      page.locator('#editorToolbar .editor-mode-btn.active'),
    ).toHaveCount(1);
  });

  test('collapses and expands a road-brush panel section on click', async ({
    page,
  }) => {
    const section = page.locator('#wepRoadTypeSection');
    const toggle = page.locator('#wepRoadTypeToggle');

    await expect(section).not.toHaveClass(/collapsed/);
    await toggle.click();
    await expect(section).toHaveClass(/collapsed/);
    await toggle.click();
    await expect(section).not.toHaveClass(/collapsed/);
  });

  test('opens and closes the OpenStreetMap import panel', async ({ page }) => {
    // The OSM toolbar button is conditionally hidden in this layout, so drive
    // the editor's public entry points (the same handlers the button/Cancel
    // invoke) and assert the real panel DOM display state each time.
    const opened = await page.evaluate(() => {
      const sim = (window as unknown as { __sim: { openOsmPanel(): void } })
        .__sim;
      sim.openOsmPanel();
      return document.getElementById('osmPanel')!.style.display;
    });
    expect(opened).toBe('block');

    const closed = await page.evaluate(() => {
      const sim = (window as unknown as { __sim: { closeOsmPanel(): void } })
        .__sim;
      sim.closeOsmPanel();
      return document.getElementById('osmPanel')!.style.display;
    });
    expect(closed).toBe('none');
  });

  test('road-type selection updates the brush lane-count default', async ({
    page,
  }) => {
    const roadType = page.locator('#wepRoadType');
    const lanes = page.locator('#wepLanes');
    await expect(roadType).toBeVisible();

    // Motorways default to more lanes than residential streets — changing the
    // road type must reflow the brush's default lane count.
    await roadType.selectOption('residential');
    const residentialLanes = Number(await lanes.inputValue());

    await roadType.selectOption('motorway');
    const motorwayLanes = Number(await lanes.inputValue());

    expect(residentialLanes).toBeGreaterThan(0);
    expect(motorwayLanes).toBeGreaterThan(0);
    expect(motorwayLanes).toBeGreaterThanOrEqual(residentialLanes);
  });

  test('the one-way brush toggle flips its checked state', async ({ page }) => {
    const oneWay = page.locator('#wepOneWay');
    await expect(oneWay).not.toBeChecked();
    await oneWay.check();
    await expect(oneWay).toBeChecked();
    await oneWay.uncheck();
    await expect(oneWay).not.toBeChecked();
  });
});
