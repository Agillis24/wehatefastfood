/**
 * The table that drives our working sessions: what data we hold, and what is
 * missing.
 *
 * This is deliberately blunt. A coverage report that flatters you is worse than
 * no coverage report, because it turns "we have not checked" into "it is fine".
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createRepository,
  hasIndependentSources,
  resolvePer100,
  STALE_AFTER_DAYS,
} from '@wff/content';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NOW = new Date();

const repo = await createRepository({ contentRoot: path.join(ROOT, 'content'), now: NOW });

const chains = await repo.listChains();
const items = await repo.listItems();
const additives = await repo.listAdditives();
const ingredients = await repo.listIngredients();

const ageDays = (iso) =>
  Math.floor((NOW.getTime() - new Date(`${iso}T00:00:00Z`).getTime()) / 86_400_000);

/** Fields a reader will look for. Absence is the interesting signal. */
const KEY_FIELDS = ['energyKcal', 'fatG', 'saturatesG', 'sugarsG', 'saltG', 'proteinG'];

const pad = (s, n) => String(s).padEnd(n);
const rpad = (s, n) => String(s).padStart(n);

console.log('\n=== CHAINS ===');
if (chains.length === 0) {
  console.log('  (none yet)');
} else {
  console.log(`  ${pad('chain', 26)}${pad('status', 12)}${rpad('items', 6)}  markets`);
  for (const chain of chains) {
    const own = items.filter((i) => i.chainSlug === chain.slug);
    const markets = [...new Set(own.flatMap((i) => i.variants.map((v) => v.market)))].sort();
    console.log(
      `  ${pad(chain.slug, 26)}${pad(chain.dataStatus, 12)}${rpad(own.length, 6)}  ${markets.join(', ') || '-'}`,
    );
  }
}

console.log('\n=== ITEMS ===');
if (items.length === 0) {
  console.log('  (none yet)');
} else {
  console.log(`  ${pad('item', 40)}${pad('markets', 12)}${rpad('oldest', 8)}  gaps`);
  for (const item of items) {
    const markets = item.variants.map((v) => v.market);
    const oldest = Math.max(...item.variants.map((v) => ageDays(v.verifiedOn)));

    const gaps = [];
    if (markets.length < 2) gaps.push('single-market (no diff view)');
    if (oldest > STALE_AFTER_DAYS) gaps.push(`stale (${oldest}d)`);

    for (const variant of item.variants) {
      const per100 = resolvePer100(variant.nutrition);
      if (per100 === null) {
        gaps.push(`${variant.market}: no per-100 basis (no traffic lights)`);
        continue;
      }
      const missing = KEY_FIELDS.filter((f) => per100[f] === null);
      if (missing.length > 0) gaps.push(`${variant.market}: missing ${missing.join(', ')}`);
      if (variant.additiveRefs.length === 0 && variant.ingredientRefs.length === 0) {
        gaps.push(`${variant.market}: no ingredients recorded`);
      }
    }

    console.log(
      `  ${pad(`${item.chainSlug}/${item.slug}`, 40)}${pad(markets.join('+'), 12)}${rpad(`${oldest}d`, 8)}  ${gaps.join('; ') || 'complete'}`,
    );
  }
}

console.log('\n=== DECODER ===');
console.log(`  ${additives.length} additives, ${ingredients.length} ingredients`);
const thin = additives.filter((a) => !hasIndependentSources(a.sources, 2));
if (thin.length > 0) {
  console.log('  additives below two independent publishers:');
  for (const a of thin) console.log(`    ${a.slug}`);
}
const orphaned = [];
for (const a of additives) {
  const using = await repo.listItemsUsingAdditive(a.slug);
  if (using.length === 0) orphaned.push(a.slug);
}
if (orphaned.length > 0) {
  console.log(`  not referenced by any item yet: ${orphaned.join(', ')}`);
}

console.log('\n=== REFERENCE DATA ===');
for (const [name, data] of [
  ['fsa-thresholds', await repo.getFsaThresholds()],
  ['reference-intakes', await repo.getReferenceIntakes()],
]) {
  if (data === null) {
    console.log(`  ${pad(name, 22)} MISSING`);
  } else {
    console.log(
      `  ${pad(name, 22)}${pad(data.status, 12)}${data.verifiedOn ?? 'never verified by a human'}`,
    );
  }
}

const issues = await repo.getIssues();
console.log(
  `\n${issues.filter((i) => i.level === 'error').length} errors, ` +
    `${issues.filter((i) => i.level === 'warning').length} warnings. ` +
    `Run "npm run content:validate" for detail.\n`,
);
