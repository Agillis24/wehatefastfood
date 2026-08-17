/**
 * Production build. Order matters: each step produces something the next one
 * needs, and content is validated before anything is rendered from it - a build
 * that emits pages from invalid content is worse than a build that fails.
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWindows = process.platform === 'win32';

/**
 * A statically exported site cannot have a dynamic route with no parameters.
 * Next refuses `/chains/[chain]/[item]/[market]` outright when
 * generateStaticParams returns nothing, so an empty content directory is not a
 * site with no articles yet - it is a site that cannot be built at all.
 *
 * Next's own error for this is cryptic ("missing generateStaticParams") and
 * arrives at the very end of a long build. This says the true thing early.
 */
async function preflight() {
  const { createRepository } = await import('@wff/content');
  const repo = await createRepository({
    contentRoot: path.join(ROOT, 'content'),
    includeSeed: process.env['WFF_INCLUDE_SEED'] === '1',
    now: new Date(),
  });

  const chains = (await repo.listChains()).length;
  const items = (await repo.listItems()).length;
  const additives = (await repo.listAdditives()).length;

  if (chains > 0 && items > 0 && additives > 0) return;

  console.error('');
  console.error('build: cannot export a site with no content.');
  console.error(`  chains: ${chains}, items: ${items}, additives: ${additives}`);
  console.error('');
  console.error('  A static export needs at least one of each, because Next cannot emit a');
  console.error('  dynamic route that has no parameters. This is not a bug to work around;');
  console.error('  it is the site telling you there is nothing to publish yet.');
  console.error('');
  console.error('  Either add a real chain - `npm run content:coverage` shows the gaps -');
  console.error('  or set WFF_INCLUDE_SEED=1 to build against the obviously-fake seed.');
  console.error('  Seed exists to exercise the pipeline. It must never be what launches.');
  console.error('');
  process.exit(1);
}

const STEPS = [
  { name: 'tokens', cmd: process.execPath, args: ['packages/design-tokens/src/build.mjs'] },
  // Packages first: the scripts and the app import their BUILT output, and
  // dist/ is gitignored, so on a fresh clone nothing exists until this runs.
  {
    name: 'packages',
    cmd: process.execPath,
    args: ['node_modules/typescript/bin/tsc', '--build', 'packages/content', 'packages/i18n'],
  },
  { name: 'content', cmd: process.execPath, args: ['scripts/content-validate.mjs'] },
  { name: 'search', cmd: process.execPath, args: ['scripts/search-index.mjs'] },
  /*
   * Share cards, and the manifest generateMetadata reads. BEFORE next, because
   * the pages import the manifest at build time - after it, every page would
   * fall back to the generic card and nothing would say so.
   *
   * --seed follows the same flag as the rest of the build: a seed build renders
   * seed cards, a real build renders real ones and nothing else.
   */
  {
    name: 'social',
    cmd: process.execPath,
    args: [
      'scripts/social-cards.mjs',
      '--web=true',
      `--seed=${process.env['WFF_INCLUDE_SEED'] === '1' ? 'true' : 'false'}`,
    ],
  },
  { name: 'next', cmd: 'npm', args: ['run', 'build', '--workspace=@wff/web'] },
];

// The preflight imports @wff/content, which needs the packages built - so it
// runs after that step rather than before the first one.
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

  if (step.name === 'packages') await preflight();
}

console.log('\nbuild: OK');
