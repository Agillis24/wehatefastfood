/**
 * Social and Open Graph cards.
 *
 *   npm run social:cards                      all items, all sizes
 *   npm run social:cards -- --item=chain/item one item
 *   npm run social:cards -- --market=US       one market
 *
 * Writes into exports/social/ - the Instagram asset pipeline, per BRIEF §11,
 * produced from exactly the same data and the same drawing as the web page.
 * There is no separate "social version" of a figure to fall out of sync.
 *
 * Seed content is excluded. These are publishable artefacts.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { FSA_NUTRIENTS, bandFor, createRepository, pickBasis, resolvePer100 } from '@wff/content';
import { PRESETS, specimenCardSvg } from './lib/specimen-card.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'exports', 'social');

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value ?? 'true'];
  }),
);

const tokens = JSON.parse(
  await readFile(path.join(ROOT, 'packages', 'design-tokens', 'tokens.export.json'), 'utf8'),
).css;

const repo = await createRepository({
  contentRoot: path.join(ROOT, 'content'),
  includeSeed: args.get('seed') === 'true',
  now: new Date(),
});

const thresholds = await repo.getFsaThresholds();
const items = await repo.listItems();

const wanted = args.get('item');
const wantedMarket = args.get('market');

const BAND_WORD = { high: 'HIGH', medium: 'MED', low: 'LOW' };
const NUTRIENT_LABEL = { fat: 'FAT', saturates: 'SAT', sugars: 'SUG', salt: 'SALT' };

await mkdir(OUT, { recursive: true });

let written = 0;

for (const item of items) {
  const key = `${item.chainSlug}/${item.slug}`;
  if (wanted !== undefined && wanted !== key) continue;

  const chain = await repo.getChain(item.chainSlug);
  if (!chain) continue;

  for (const variant of item.variants) {
    if (wantedMarket !== undefined && wantedMarket !== variant.market) continue;

    const serving = pickBasis(variant.nutrition, 'per-serving') ?? null;
    const per100 = resolvePer100(variant.nutrition);
    const isDrink = item.category === 'drink';

    const bands =
      per100 && thresholds
        ? FSA_NUTRIENTS.map((n) => bandFor(n, per100, serving, isDrink, thresholds))
            .filter((b) => b !== null)
            .map((b) => ({
              label: NUTRIENT_LABEL[b.nutrient],
              word: BAND_WORD[b.band],
              band: b.band,
            }))
        : [];

    const card = {
      specimenId: `${chain.slug.slice(0, 3).toUpperCase()}-${variant.market}`,
      chainName: chain.name,
      itemName: item.name,
      market: variant.market,
      verifiedOn: variant.verifiedOn,
      sugarG: serving?.sugarsG ?? null,
      saltG: serving?.saltG ?? null,
      saturatesG: serving?.saturatesG ?? null,
      bands,
    };

    for (const [preset, meta] of Object.entries(PRESETS)) {
      // Video frames use the ink surface, where pink is unrestricted. See
      // docs/BRAND.md §4.
      const surface = preset === 'video' ? 'ink' : 'paper';
      const svg = specimenCardSvg(card, preset, tokens, surface);

      const base = `${item.chainSlug}-${item.slug}-${variant.market}-${meta.label}`;
      await writeFile(path.join(OUT, `${base}.svg`), svg, 'utf8');

      const png = new Resvg(svg, {
        fitTo: { mode: 'width', value: meta.width },
        font: { loadSystemFonts: true },
      })
        .render()
        .asPng();
      await writeFile(path.join(OUT, `${base}.png`), png);

      console.log(
        `  ${base}.png  ${meta.width}x${meta.height}  ${(png.length / 1024).toFixed(1)} kB`,
      );
      written += 1;
    }
  }
}

if (written === 0) {
  console.log(
    'social: nothing to render.' +
      (items.length === 0
        ? ' No published content yet - pass --seed=true to exercise the pipeline against seed data.'
        : ''),
  );
} else {
  console.log(`\nsocial: ${written} images -> exports/social/`);
}
