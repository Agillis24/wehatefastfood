/**
 * One post a day, built from what the site already holds.
 *
 *   npm run social:daily                 today
 *   npm run social:daily -- --date=2026-08-20
 *   npm run social:daily -- --days=7     a week ahead, for review in one go
 *
 * WRITES, NEVER POSTS. Output lands in exports/social/daily/<date>/ as the
 * image and the caption next to each other. Publishing stays a separate,
 * deliberate act through social-publish.mjs, because a script that can post on
 * its own is a script that can post something wrong on its own.
 *
 * THE PICK IS DETERMINISTIC. The same date always yields the same item, so
 * re-running never quietly swaps the post somebody already approved, and a
 * queue prepared a week ahead still matches what goes out. It walks a shuffled
 * order seeded by nothing but the pool itself, so nothing repeats until every
 * eligible item has had a turn.
 *
 * NOTHING IS WRITTEN THAT IS NOT IN THE DATA. The number, the chain, the
 * market, the publisher and the date a person last checked it all come from the
 * item record. The only free text is the framing, and the framing never
 * characterises the food beyond what the figure says.
 *
 * VOICE RULES FROM docs/BRAND.md APPLY. No diets, no good and bad foods, no
 * exercise equivalents, nothing about anybody's body. The comparison is always
 * a physical quantity of the same substance, which is the same rule the site
 * uses for its own drawings.
 */

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { resvgFonts } from './lib/fonts.mjs';
import { FSA_NUTRIENTS, bandFor, createRepository, pickBasis, resolvePer100 } from '@wff/content';
import { specimenCardSvg } from './lib/specimen-card.mjs';

/* The same labels social-cards.mjs uses, so a daily post and a share card
 * coming from the same item are the same picture and not two dialects. */
const BAND_WORD = { high: 'HIGH', medium: 'MED', low: 'LOW' };
const NUTRIENT_LABEL = { fat: 'FAT', saturates: 'SAT', sugars: 'SUG', salt: 'SALT' };

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'exports', 'social', 'daily');
const SITE = 'wehatefastfood.com';

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? 'true'];
  }),
);

/**
 * The angles, in the order they are tried.
 *
 * Each one only fires when the item carries the figure it needs, so an item
 * with no sugar figure never produces a sentence about sugar. `unit` is the
 * physical thing the site already draws that nutrient as, so the post and the
 * page agree without anybody keeping them in step by hand.
 */
const ANGLES = [
  {
    key: 'sugar',
    nutrient: 'sugars',
    field: 'sugarsG',
    unit: 4,
    noun: ['kostka cukru', 'kostky cukru', 'kostek cukru'],
    what: 'cukru',
  },
  {
    key: 'salt',
    nutrient: 'salt',
    field: 'saltG',
    unit: 6,
    noun: ['zarovnaná čajová lžička', 'zarovnané čajové lžičky', 'zarovnaných čajových lžiček'],
    what: 'soli',
  },
  {
    key: 'saturates',
    nutrient: 'saturates',
    field: 'saturatesG',
    unit: 5,
    noun: ['kostička másla', 'kostičky másla', 'kostiček másla'],
    what: 'nasycených tuků',
  },
];

const cz = (n) => String(n).replace('.', ',');

/** One decimal is as far as any of these figures is meaningful. */
const round1 = (v) => Math.round(v * 10) / 10;

/**
 * Czech counts in three shapes and getting it wrong is the fastest way to look
 * automated: one kostka, two kostky, five kostek, and anything with a decimal
 * takes the same shape as two.
 */
function plural(n, [one, few, many]) {
  if (n === 1) return one;
  if (!Number.isInteger(n)) return few;
  return n >= 2 && n <= 4 ? few : many;
}

/**
 * How many of the unit, to one decimal.
 *
 * The site's own drawing counts in quarters, which is right for a picture and
 * wrong for a sentence: two grams of salt is a third of a teaspoon, and
 * rounding that to a quarter is a 25% error printed as a fact.
 */
function units(value, per) {
  return Math.round((value / per) * 10) / 10;
}

async function eligible() {
  const repo = await createRepository({ contentRoot: path.join(ROOT, 'content') });
  const chains = await repo.listChains();
  const byChain = new Map(chains.map((c) => [c.slug, c]));
  const items = await repo.listItems();
  const thresholds = await repo.getFsaThresholds();

  const pool = [];
  for (const item of items) {
    for (const variant of item.variants) {
      const serving = pickBasis(variant.nutrition, 'per-serving') ?? null;
      const per100 = resolvePer100(variant.nutrition);
      const source = variant.sources[0];
      const chain = byChain.get(item.chainSlug);
      if (!serving || !per100 || !source || !chain || !thresholds) continue;

      /*
       * ONLY WHAT THE SITE ITSELF CALLS HIGH.
       *
       * The first version posted whatever figure an item happened to carry and
       * opened with a Pepsi holding 0.12 g of salt, which is not a finding, it
       * is a rounding error with a caption. Tying the pick to the same
       * thresholds that decide the traffic lights means a post is only made
       * about something the site is already prepared to show in red, and the
       * standard is one somebody else set rather than one we invented for
       * ourselves.
       */
      const bands = FSA_NUTRIENTS.map((n) =>
        bandFor(n, per100, serving, item.category === 'drink', thresholds),
      ).filter((b) => b !== null);

      const high = bands.find((b) => b.band === 'high');
      if (!high) continue;
      const angle = ANGLES.find((a) => a.nutrient === high.nutrient);
      if (!angle || serving[angle.field] == null || serving[angle.field] <= 0) continue;

      pool.push({ item, variant, panel: serving, angle, chain, source });
    }
  }
  pool.sort((a, b) =>
    `${a.item.chainSlug}/${a.item.slug}/${a.variant.market}`.localeCompare(
      `${b.item.chainSlug}/${b.item.slug}/${b.variant.market}`,
    ),
  );
  return pool;
}

/**
 * Which entry a given date gets.
 *
 * A date maps to a position by counting days from a fixed epoch, and the pool
 * is walked with a stride that is coprime with its length. That spreads
 * consecutive days across different chains instead of marching alphabetically
 * through one, and it still visits every entry exactly once before repeating.
 */
function pickFor(pool, date) {
  const EPOCH = Date.UTC(2026, 7, 20);
  const day = Math.floor((Date.parse(`${date}T00:00:00Z`) - EPOCH) / 86_400_000);
  let stride = Math.floor(pool.length / 7) || 1;
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  while (gcd(stride, pool.length) !== 1) stride += 1;
  const index = (((day * stride) % pool.length) + pool.length) % pool.length;
  return pool[index];
}

function caption(entry) {
  const { item, variant, panel, angle, chain } = entry;
  const grams = round1(panel[angle.field]);
  const n = units(panel[angle.field], angle.unit);
  const checked = new Date(variant.verifiedOn).toLocaleDateString('cs-CZ');

  return [
    `${item.name} od ${chain.name}.`,
    '',
    `V jedné porci je ${cz(grams)} g ${angle.what}. To je ${cz(n)} ${plural(n, angle.noun)}.`,
    '',
    'Číslo zveřejnila firma sama. My ho jen přepsali, uvedli, odkud je, a ' +
      `naposledy ověřili ${checked}.`,
    '',
    `Celý rozpis i zdroj najdeš na ${SITE}.`,
    '',
    '#fastfood #výživa #složení #etikety #aditiva #éčka #jídlo',
  ].join('\n');
}

async function build(date) {
  const pool = await eligible();
  if (!pool.length) throw new Error('zádná položka nemá porci, číslo a zdroj zároveň');
  const entry = pickFor(pool, date);

  /* Emptied first. Re-running after a data change used to leave the previous
   * item's PNG beside the new caption, which is a way to post the wrong
   * picture with the right words. */
  const dir = path.join(OUT, date);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });

  const tokens = JSON.parse(
    await readFile(path.join(ROOT, 'packages', 'design-tokens', 'tokens.export.json'), 'utf8'),
  ).css;
  const repo = await createRepository({ contentRoot: path.join(ROOT, 'content') });
  const thresholds = await repo.getFsaThresholds();

  const serving = pickBasis(entry.variant.nutrition, 'per-serving') ?? null;
  const per100 = resolvePer100(entry.variant.nutrition);
  const bands =
    per100 && thresholds
      ? FSA_NUTRIENTS.map((n) =>
          bandFor(n, per100, serving, entry.item.category === 'drink', thresholds),
        )
          .filter((b) => b !== null)
          .map((b) => ({
            label: NUTRIENT_LABEL[b.nutrient],
            word: BAND_WORD[b.band],
            band: b.band,
          }))
      : [];

  const card = {
    specimenId: `${entry.item.chainSlug.slice(0, 3).toUpperCase()}-${entry.variant.market}`,
    chainName: entry.chain.name,
    itemName: entry.item.name,
    market: entry.variant.market,
    verifiedOn: entry.variant.verifiedOn,
    sugarG: serving?.sugarsG ?? null,
    saltG: serving?.saltG ?? null,
    saturatesG: serving?.saturatesG ?? null,
    bands,
  };

  /* Portrait only. Instagram and Facebook get the SAME picture and the SAME
   * words, because one account speaking in two visual languages looks like two
   * accounts. */
  const svg = specimenCardSvg(card, 'portrait', tokens, 'paper');
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1080 },
    font: resvgFonts(),
  })
    .render()
    .asPng();

  const slug = `${entry.item.chainSlug}-${entry.item.slug}`;
  await writeFile(path.join(dir, `${slug}.png`), png);
  await writeFile(path.join(dir, 'caption.txt'), `${caption(entry)}\n`, 'utf8');
  await writeFile(
    path.join(dir, 'meta.json'),
    `${JSON.stringify(
      {
        date,
        angle: entry.angle.key,
        chain: entry.chain.name,
        item: entry.item.name,
        market: entry.variant.market,
        value: entry.panel[entry.angle.field],
        source: entry.source.title,
        publisher: entry.source.publisher,
        verifiedOn: entry.variant.verifiedOn,
        page: `https://www.${SITE}/cs/chains/${entry.item.chainSlug}/${entry.item.slug}/${entry.variant.market}/`,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  return { dir, entry, poolSize: pool.length };
}

const start = args.get('date') ?? new Date().toISOString().slice(0, 10);
const days = Number(args.get('days') ?? 1);

for (let i = 0; i < days; i += 1) {
  const date = new Date(`${start}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + i);
  const iso = date.toISOString().slice(0, 10);
  const { dir, entry, poolSize } = await build(iso);
  console.log(
    `${iso}  ${entry.chain.name} / ${entry.item.name} (${entry.variant.market}) ` +
      `${entry.angle.key} ${entry.panel[entry.angle.field]} g`,
  );
  console.log(`          ${path.relative(ROOT, dir)}`);
  if (i === 0) console.log(`          z ${poolSize} použitelných položek`);
}
