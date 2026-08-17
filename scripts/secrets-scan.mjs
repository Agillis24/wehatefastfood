/**
 * Secrets hygiene gate. Two failures, both cheap to make and expensive to find:
 *
 *   1. A secret named NEXT_PUBLIC_* - that prefix ships the value to every
 *      browser that loads the site.
 *   2. An .env file committed to git, or a key-shaped literal in source.
 *
 * Exits non-zero on either. Part of `npm run check`.
 */

import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'coverage',
  'playwright-report',
  'test-results',
]);

const SECRETISH = /(KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL|PRIVATE)/i;

/** Literal key shapes worth failing on. Deliberately narrow to avoid noise. */
const KEY_LITERALS = [
  { name: 'Anthropic API key', re: /sk-ant-[A-Za-z0-9_-]{20,}/ },
  { name: 'AWS access key id', re: /AKIA[0-9A-Z]{16}/ },
  { name: 'Generic bearer secret', re: /(?:secret|token)\s*[:=]\s*['"][A-Za-z0-9_-]{32,}['"]/i },
];

/**
 * Everything git tracks, as repo-relative paths.
 *
 * Read once rather than shelling out per file. If git is unavailable - a
 * tarball, a sandbox - the set is empty and the .env check simply cannot fire,
 * which is the right way round: this gate exists to catch a secret entering the
 * index, and with no index there is nothing to catch.
 */
const tracked = new Set(
  spawnSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' })
    .stdout?.split('\n')
    .map((line) => line.trim())
    .filter(Boolean) ?? [],
);

const problems = [];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await walk(path.join(dir, entry.name));
      continue;
    }

    const full = path.join(dir, entry.name);
    const rel = path.relative(ROOT, full).split(path.sep).join('/');

    /*
     * A COMMITTED .env is the single most common way a key escapes. A PRESENT
     * one is the documented way to work: the first line of .env.example says
     * "Copy to .env.local", and every script here reads it.
     *
     * This used to fire on any .env file that merely existed, so following the
     * project's own instructions turned `npm run check` red - the gate forbade
     * the workflow it was written to protect. What matters is whether git
     * TRACKS it.
     */
    if (/^\.env($|\.)/.test(entry.name) && entry.name !== '.env.example' && tracked.has(rel)) {
      problems.push(`${rel}: env file is TRACKED BY GIT - take it out of the index now`);
    }

    if (!/\.(ts|tsx|mjs|js|json|md|yml|yaml|css)$/.test(entry.name)) continue;
    if (rel === 'scripts/secrets-scan.mjs') continue;

    const text = await readFile(full, 'utf8');

    for (const match of text.matchAll(/NEXT_PUBLIC_[A-Z0-9_]+/g)) {
      const name = match[0];
      if (SECRETISH.test(name.replace(/^NEXT_PUBLIC_/, ''))) {
        problems.push(`${rel}: ${name} - a NEXT_PUBLIC_ variable is shipped to the browser`);
      }
    }

    for (const { name, re } of KEY_LITERALS) {
      if (re.test(text)) problems.push(`${rel}: looks like a committed ${name}`);
    }
  }
}

await walk(ROOT);

if (problems.length > 0) {
  console.error('secrets: FAILED');
  for (const p of [...new Set(problems)]) console.error(`  ${p}`);
  process.exit(1);
}

console.log('secrets: clean (no NEXT_PUBLIC_ secrets, no committed env, no key literals)');
