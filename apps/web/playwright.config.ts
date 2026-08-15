import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke suite. Small on purpose: it exists to catch the things that would make
 * the site wrong rather than ugly, and a slow suite is a suite nobody runs.
 *
 * Runs against a production build with seed content, because the seed is the
 * only content that exists until real chains are added.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: process.env['CI'] ? 'github' : 'list',
  use: { baseURL: 'http://localhost:3000', trace: 'on-first-retry' },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000/en',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
    env: { WFF_INCLUDE_SEED: '1' },
  },
});
