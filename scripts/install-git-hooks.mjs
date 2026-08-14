/**
 * `npm prepare` runs this. simple-git-hooks needs an explicit install step, and
 * it must not blow up in CI or in a tarball install where there is no .git.
 */
import { access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

if (process.env['CI']) {
  console.log('git hooks: skipped (CI)');
  process.exit(0);
}

try {
  await access(path.join(ROOT, '.git'));
} catch {
  console.log('git hooks: skipped (not a git working tree)');
  process.exit(0);
}

const child = spawn('npx', ['simple-git-hooks'], {
  cwd: ROOT,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
child.on('close', (code) => process.exit(code ?? 0));
child.on('error', () => {
  console.log('git hooks: simple-git-hooks not installed yet, skipping');
  process.exit(0);
});
