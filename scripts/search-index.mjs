/**
 * Build-time search index.
 *
 * Emits apps/web/public/search-index.json: one flat record per addressable
 * thing on the site, with a precomputed lowercase, accent-folded haystack so a
 * client never has to normalise anything.
 *
 * NOT used by the decoder page. That page filters DOM nodes the server already
 * rendered, which needs no index and no library - see
 * apps/web/src/components/ui/DecoderFilterScript.tsx for the measurement that
 * decided it. This index exists for site-wide search, which is a different
 * problem: it spans chains, items and additives, and cannot be answered from
 * whatever happens to be on the current page.
 *
 * Seed content is excluded. An index is a published artefact.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRepository, pickBasis } from '@wff/content';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'apps', 'web', 'public', 'search-index.json');

const fold = (value) =>
  value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

const repo = await createRepository({
  contentRoot: path.join(ROOT, 'content'),
  includeSeed: false,
  now: new Date(),
});

const records = [];

for (const chain of await repo.listChains()) {
  records.push({
    type: 'chain',
    id: chain.slug,
    title: chain.name,
    subtitle: chain.oneLiner,
    path: `/chains/${chain.slug}`,
    haystack: fold([chain.name, chain.oneLiner, chain.slug].join(' ')),
  });
}

for (const item of await repo.listItems()) {
  for (const variant of item.variants) {
    const serving = pickBasis(variant.nutrition, 'per-serving');
    records.push({
      type: 'item',
      id: `${item.chainSlug}/${item.slug}/${variant.market}`,
      title: item.name,
      subtitle: item.chainSlug,
      market: variant.market,
      kcal: serving?.energyKcal ?? null,
      path: `/chains/${item.chainSlug}/${item.slug}/${variant.market}`,
      haystack: fold(
        [item.name, item.chainSlug, item.slug, item.category, variant.market].join(' '),
      ),
    });
  }
}

for (const additive of await repo.listAdditives()) {
  records.push({
    type: 'additive',
    id: additive.slug,
    title: additive.names[0] ?? additive.slug,
    subtitle: additive.eNumber ?? '',
    path: `/decoder/${additive.slug}`,
    haystack: fold(
      [additive.names.join(' '), additive.eNumber ?? '', additive.functionalClass.join(' ')].join(
        ' ',
      ),
    ),
  });
}

await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(OUT, `${JSON.stringify({ records }, null, 0)}\n`, 'utf8');

const bytes = JSON.stringify({ records }).length;
console.log(
  `search: ${records.length} records -> ${path.relative(ROOT, OUT).split(path.sep).join('/')} (${(bytes / 1024).toFixed(1)} kB)`,
);
