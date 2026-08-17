import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const HERE = path.dirname(fileURLToPath(import.meta.url));

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
  use: { baseURL: 'http://localhost:4173', trace: 'on-first-retry' },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  // `next start` cannot serve an output: export build, so the suite runs
  // against the exported files through the same kind of static server GitHub
  // Pages is - which is the thing we actually publish.
  webServer: {
    // cwd is the repo root: this config lives in apps/web, and Playwright would
    // otherwise resolve the script relative to it.
    cwd: path.resolve(HERE, '..', '..'),
    command: 'node scripts/serve-static.mjs 4173',
    url: 'http://localhost:4173/en/',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
});
