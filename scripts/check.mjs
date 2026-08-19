/**
 * The definition of done, per BRIEF §0.7.
 *
 * Runs every gate and reports all failures rather than stopping at the first,
 * so one run tells you everything that is wrong.
 *
 * Every gate is spawned as `node <local bin entrypoint>` with an argv array.
 * No shell, no `npx`, no `&&`, no inline env assignment - so it behaves
 * identically in PowerShell, and it does not trip Node's DEP0190 warning about
 * unescaped arguments under `shell: true`.
 */

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bin = (p) => path.join(ROOT, 'node_modules', ...p.split('/'));

/** @type {{name: string, args: string[], why: string}[]} */
const GATES = [
  {
    name: 'tokens',
    args: ['packages/design-tokens/src/build.mjs'],
    why: 'tokens.css and tokens.export.json must match tokens.json',
  },
  {
    // MUST come before i18n and typecheck. The scripts import the BUILT output
    // of the workspace packages, and dist/ is gitignored - so on a fresh clone
    // (which is what CI is) nothing exists until this runs. A local machine
    // hides this completely, because dist/ is already sitting there from the
    // last build. Found by CI on the first push, not by testing.
    name: 'packages',
    args: [bin('typescript/bin/tsc'), '--build', 'packages/content', 'packages/i18n'],
    why: 'scripts and the app import the built packages, and dist/ is gitignored',
  },
  {
    name: 'i18n',
    args: ['scripts/i18n-extract.mjs'],
    why: 'regenerates the tier-2 manifest and checks catalogues for drift',
  },
  {
    name: 'typecheck',
    args: [bin('typescript/bin/tsc'), '--build'],
    why: 'TypeScript strict across every workspace',
  },
  {
    name: 'lint',
    args: [bin('eslint/bin/eslint.js'), '.'],
    why: 'includes the no-bare-strings and no-framework-in-content rules',
  },
  {
    name: 'format',
    args: [bin('prettier/bin/prettier.cjs'), '--check', '.'],
    why: 'formatting is not a review topic',
  },
  {
    name: 'secrets',
    args: ['scripts/secrets-scan.mjs'],
    why: 'no secret may be NEXT_PUBLIC_ or committed',
  },
  {
    name: 'content',
    args: ['scripts/content-validate.mjs'],
    why: 'every fact carries a source, every reference resolves',
  },
  {
    /*
     * Reads apps/web/out, so it only does anything after a build. It skips
     * quietly rather than failing on a fresh clone; CI builds before checking.
     *
     * The indexing flag is passed through because the DEPLOYED site is open.
     * Without it the gate reads a correctly-built export and reports all 857
     * pages as "indexable, but the flag was not set", which is a failure about
     * the checker's own environment rather than about the site. CI sets the
     * same value for the build and for this gate.
     */
    name: 'seo',
    args: ['scripts/seo-check.mjs'],
    env: { NEXT_PUBLIC_ALLOW_INDEXING: '1' },
    why: 'every exported page needs a canonical, Open Graph and a reflexive hreflang set',
  },
  {
    name: 'budget',
    args: ['scripts/budget-check.mjs'],
    why: 'first-load JS per route; skips silently when there is no build yet',
  },
  {
    name: 'test',
    args: [bin('vitest/vitest.mjs'), 'run', '--passWithNoTests'],
    why: 'unit tests',
  },
];

function run(gate) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(process.execPath, gate.args, {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env, ...(gate.env ?? {}) },
    });
    child.on('close', (code) => resolve({ ...gate, code: code ?? 1, ms: Date.now() - started }));
    child.on('error', (err) => {
      console.error(`\n${gate.name}: failed to start - ${err.message}`);
      resolve({ ...gate, code: 1, ms: Date.now() - started });
    });
  });
}

const results = [];
for (const gate of GATES) {
  console.log(`\n--- ${gate.name}  (${gate.why})`);
  results.push(await run(gate));
}

console.log('\n=== check ===');
const failed = results.filter((r) => r.code !== 0);
for (const r of results) {
  console.log(
    `  ${r.code === 0 ? 'PASS' : 'FAIL'}  ${r.name.padEnd(10)} ${String(r.ms).padStart(6)} ms`,
  );
}

if (failed.length > 0) {
  console.error(
    `\n${failed.length} of ${results.length} gates failed: ${failed.map((f) => f.name).join(', ')}`,
  );
  process.exit(1);
}
console.log(`\nAll ${results.length} gates passed.`);
