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

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
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

/**
 * --web=true renders ONLY the og preset, into the site's own public directory,
 * and writes a manifest the pages read.
 *
 * The two destinations are different jobs. exports/social/ holds assets a human
 * downloads and posts to Instagram or drops into a video; apps/web/public/og/
 * holds files the site serves. Until now there was only the first, it is
 * gitignored, and the step was not in the production build - so no deployment
 * had ever contained a single per-item share image, and every page fell back to
 * one generic card.
 */
const WEB = args.get('web') === 'true';
/*
 * A SUBDIRECTORY, not apps/web/public/og itself. This directory is emptied on
 * every run, because content-hashed filenames are never overwritten - a changed
 * figure produces a new name and orphans the old one, so without a sweep the
 * directory grows forever. og/ itself holds the committed wff-share.png
 * fallback, which a recursive delete would take with it.
 */
const WEB_OUT = path.join(ROOT, 'apps', 'web', 'public', 'og', 'items');
const MANIFEST = path.join(ROOT, 'apps', 'web', 'src', 'generated', 'og-manifest.json');

/** filename by `chain/item/MARKET`, so a page cannot name a card that was never rendered. */
const manifest = {};

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

if (WEB) {
  await rm(WEB_OUT, { recursive: true, force: true });
  await mkdir(WEB_OUT, { recursive: true });
  await mkdir(path.dirname(MANIFEST), { recursive: true });
} else {
  await mkdir(OUT, { recursive: true });
}

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

    const presets = WEB ? { og: PRESETS.og } : PRESETS;

    for (const [preset, meta] of Object.entries(presets)) {
      // Video frames use the ink surface, where pink is unrestricted. See
      // docs/BRAND.md §4.
      const surface = preset === 'video' ? 'ink' : 'paper';
      const svg = specimenCardSvg(card, preset, tokens, surface);

      const png = new Resvg(svg, {
        fitTo: { mode: 'width', value: meta.width },
        font: { loadSystemFonts: true },
      })
        .render()
        .asPng();

      if (WEB) {
        /*
         * The filename carries a hash of the RENDERED BYTES, and that is the
         * entire cache-invalidation strategy.
         *
         * Facebook: "Images are cached based on the URL and won't be updated
         * unless the URL changes." Discord re-proxies through its own CDN with
         * a cache that expires independently of the metadata cache. This site
         * is on GitHub Pages, so there is no Cache-Control to set and nothing
         * to purge. A card that changes at a fixed filename is a card the
         * biggest consumers keep showing the old version of, indefinitely.
         *
         * The PNG rather than the SVG, deliberately: the SVG is identical
         * whether or not the named fonts were installed, and the render is not.
         * Hashing what actually ships is the only version that notices a font
         * fallback - which is a live risk here, because no font files are
         * committed and CI does not have Archivo.
         */
        const hash = createHash('sha256').update(png).digest('hex').slice(0, 8);
        const file = `${item.chainSlug}-${item.slug}-${variant.market}.${hash}.png`;
        await writeFile(path.join(WEB_OUT, file), png);
        manifest[`${item.chainSlug}/${item.slug}/${variant.market}`] = file;
        console.log(
          `  og/items/${file}  ${meta.width}x${meta.height}  ${(png.length / 1024).toFixed(1)} kB`,
        );
      } else {
        const base = `${item.chainSlug}-${item.slug}-${variant.market}-${meta.label}`;
        await writeFile(path.join(OUT, `${base}.svg`), svg, 'utf8');
        await writeFile(path.join(OUT, `${base}.png`), png);
        console.log(
          `  ${base}.png  ${meta.width}x${meta.height}  ${(png.length / 1024).toFixed(1)} kB`,
        );
      }
      written += 1;
    }
  }
}

if (WEB) {
  await writeFile(
    MANIFEST,
    `${JSON.stringify(manifest, null, 2)}
`,
    'utf8',
  );
  console.log(
    `
social: ${Object.keys(manifest).length} share cards -> apps/web/public/og/items/`,
  );
  console.log('social: manifest -> apps/web/src/generated/og-manifest.json');
} else if (written === 0) {
  console.log(
    'social: nothing to render.' +
      (items.length === 0
        ? ' No published content yet - pass --seed=true to exercise the pipeline against seed data.'
        : ''),
  );
} else {
  console.log(`\nsocial: ${written} images -> exports/social/`);
}
