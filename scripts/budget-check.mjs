/**
 * Performance budget gate.
 *
 * Reads the Next build manifest and fails when a route's first-load JavaScript
 * exceeds its budget. This exists because the budget was breached once already
 * and nobody would have noticed without measuring: adding a single client
 * component to the decoder page pushed EVERY route from 107 kB to 118 kB,
 * including the item page that does not use it. See
 * apps/web/src/components/ui/DecoderFilterScript.tsx.
 *
 *   node scripts/budget-check.mjs
 *
 * Sizes are gzipped, because that is what a reader on a slow connection
 * actually downloads. Raw byte counts flatter the result by roughly 3x.
 */

import { readFile, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NEXT = path.join(ROOT, 'apps', 'web', '.next');

/** Per-route budgets in kB gzipped. BRIEF §2: 130 kB on an item page. */
const BUDGETS = [
  { pattern: /chains\/\[chain\]\/\[item\]\/\[market\]/, kb: 130, label: 'item page' },
  { pattern: /./, kb: 150, label: 'other routes' },
];

const budgetFor = (route) => BUDGETS.find((b) => b.pattern.test(route)) ?? BUDGETS.at(-1);

let manifest;
try {
  manifest = JSON.parse(await readFile(path.join(NEXT, 'app-build-manifest.json'), 'utf8'));
} catch {
  console.log('budget: no build found - run `npm run build` first');
  process.exit(0);
}

const cache = new Map();
async function gzippedSize(file) {
  if (cache.has(file)) return cache.get(file);
  const full = path.join(NEXT, file);
  try {
    await stat(full);
    const size = gzipSync(await readFile(full)).length;
    cache.set(file, size);
    return size;
  } catch {
    cache.set(file, 0);
    return 0;
  }
}

const rows = [];
for (const [route, files] of Object.entries(manifest.pages)) {
  let total = 0;
  for (const file of files.filter((f) => f.endsWith('.js'))) {
    total += await gzippedSize(file);
  }
  const budget = budgetFor(route);
  rows.push({ route, kb: total / 1024, budget: budget.kb, label: budget.label });
}

rows.sort((a, b) => b.kb - a.kb);

console.log('budget: first-load JavaScript, gzipped\n');
console.log(`  ${'route'.padEnd(48)}${'size'.padStart(9)}${'budget'.padStart(9)}   headroom`);

let failed = 0;
for (const row of rows) {
  const over = row.kb > row.budget;
  if (over) failed += 1;
  const headroom = row.budget - row.kb;
  console.log(
    `  ${row.route.padEnd(48)}${`${row.kb.toFixed(1)} kB`.padStart(9)}` +
      `${`${row.budget} kB`.padStart(9)}   ${headroom >= 0 ? '+' : ''}${headroom.toFixed(1)} kB` +
      `${over ? '   OVER' : ''}`,
  );
}

if (failed > 0) {
  console.error(`\nbudget: ${failed} route(s) over budget`);
  console.error(
    'Before raising the budget, check for a client component that does not need to be one.',
  );
  process.exit(1);
}
console.log('\nbudget: every route within budget');
