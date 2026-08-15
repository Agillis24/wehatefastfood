/**
 * Runs the smoke suite against a build that includes seed content.
 *
 * Necessary because a production build deliberately excludes content/_seed/,
 * so `npm run build` alone produces a site with no chains and no items - and
 * the smoke suite would then be testing empty states rather than pages. That
 * exclusion is a feature (an invented figure can never reach a reader), so the
 * test harness works around it rather than weakening it.
 *
 * Cross-platform: spawns with an argv array, no shell operators.
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...process.env, WFF_INCLUDE_SEED: '1' };

const run = (args, label) =>
  new Promise((resolve) => {
    console.log(`\n--- ${label}`);
    const child = spawn(process.execPath, args, { cwd: ROOT, stdio: 'inherit', env });
    child.on('close', (code) => resolve(code ?? 1));
    child.on('error', () => resolve(1));
  });

const bin = (p) => path.join(ROOT, 'node_modules', ...p.split('/'));

const buildCode = await run([path.join(ROOT, 'scripts', 'build.mjs')], 'build (with seed)');
if (buildCode !== 0) process.exit(buildCode);

const testCode = await run(
  [bin('@playwright/test/cli.js'), 'test', '--config', 'apps/web/playwright.config.ts'],
  'playwright',
);
process.exit(testCode);
