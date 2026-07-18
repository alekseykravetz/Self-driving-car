import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  snapshotPathTemplate: '{testDir}/baselines/{arg}{ext}',
  reporter: [['list'], ['html', { outputFolder: '../../playwright-report' }]],
  use: {
    baseURL: 'http://localhost:9090',
    viewport: { width: 1280, height: 720 },
    actionTimeout: 10000,
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npx serve -p 9090',
    url: 'http://localhost:9090',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
    cwd: '../../',
  },
});
