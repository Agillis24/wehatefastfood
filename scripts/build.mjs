/**
 * Production build. Order matters: tokens must exist before the app compiles,
 * and content must validate before anything is rendered from it - a build that
 * emits pages from invalid content is worse than a build that fails.
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWindows = process.platform === 'win32';

const STEPS = [
  { name: 'tokens', cmd: process.execPath, args: ['packages/design-tokens/src/build.mjs'] },
  // Packages must be compiled before content validation, because the validator
  // imports @wff/content's built output - the same entry point the video and
  // social pipelines use, so this exercises the real contract.
  {
    name: 'packages',
    cmd: process.execPath,
    args: ['node_modules/typescript/bin/tsc', '--build', 'packages/content', 'packages/i18n'],
  },
  { name: 'content', cmd: process.execPath, args: ['scripts/content-validate.mjs'] },
  { name: 'search', cmd: process.execPath, args: ['scripts/search-index.mjs'] },
  { name: 'next', cmd: 'npm', args: ['run', 'build', '--workspace=@wff/web'] },
];

for (const step of STEPS) {
  console.log(`\n--- build: ${step.name}`);
  const code = await new Promise((resolve) => {
    const child = spawn(step.cmd, step.args, {
      cwd: ROOT,
      stdio: 'inherit',
      shell: isWindows && step.cmd === 'npm',
    });
    child.on('close', (c) => resolve(c ?? 1));
    child.on('error', () => resolve(1));
  });
  if (code !== 0) {
    console.error(`build failed at: ${step.name}`);
    process.exit(code);
  }
}
console.log('\nbuild: OK');
