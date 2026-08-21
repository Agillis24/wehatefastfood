/**
 * One post a day, built from what the site already holds.
 *
 *   npm run social:daily                 today
 *   npm run social:daily -- --date=2026-08-20
 *   npm run social:daily -- --days=7     a week ahead, for review in one go
 *
 * WRITES, NEVER POSTS. Output lands in exports/social/daily/<date>/ as the
 * image and the caption side by side. Publishing stays a separate deliberate
 * act through social-publish.mjs, because a script that can post on its own is
 * a script that can post something wrong on its own.
 *
 * IT LOOKS FOR A FINDING, NOT A FIGURE. The first version picked an item and
 * stated a number off it, and produced "BBQ kuře od Subway. V jedné porci je
 * 2 g soli." Every word true and no reason on earth to read it. A number is not
 * a post. What makes one is a number that goes somewhere: past a limit somebody
 * else set, or against another number the same company published.
 *
 * Three kinds, ranked hardest first:
 *
 *   1. THE COMPANY CONTRADICTS ITSELF. Declared energy against what its own
 *      fat, carbohydrate and protein come to on the same row. This is the
 *      site's whole thesis in one image and it needs no adjectives.
 *   2. ONE PORTION PASSES A WHOLE DAILY REFERENCE INTAKE. Not our threshold,
 *      the one in Annex XIII of Regulation 1169/2011.
 *   3. THE LARGEST FIGURE ON THE SITE for a nutrient, worth saying precisely
 *      because it is the extreme and not a typical example.
 *
 * NOTHING IS WRITTEN THAT IS NOT IN THE DATA, and the arithmetic is shown so a
 * reader can redo it. Where two figures disagree the post says so and stops. It
 * never picks which one is wrong, because we do not know.
 *
 * VOICE RULES FROM docs/BRAND.md APPLY. Hostile to the company, never to the
 * person eating the food. No diets, no good and bad foods, no exercise
 * equivalents, nothing about anybody's body.
 */

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { resvgFonts } from './lib/fonts.mjs';
import { createRepository, pickBasis } from '@wff/content';
import { SLIDE, carouselSvg } from './lib/social-slides.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'exports', 'social', 'daily');
const SITE = 'wehatefastfood.com';
const TAGS = '#fastfood #výživa #složení #etikety #aditiva #éčka #jídlo';

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? 'true'];
  }),
);

const cz = (n) => String(n).replace('.', ',');
const round = (v, d = 0) => {
  const f = 10 ** d;
  return Math.round(v * f) / f;
};

/** Czech counts in three shapes; a decimal takes the same shape as two. */
function plural(n, [one, few, many]) {
  if (n === 1) return one;
  if (!Number.isInteger(n)) return few;
  return n >= 2 && n <= 4 ? few : many;
}

/* Atwater factors, the same ones the item pages cross-check a panel with. */
const ATWATER = { fatG: 37, carbohydrateG: 17, proteinG: 17 };

const NUTRIENTS = [
  {
    key: 'sugars',
    field: 'sugarsG',
    what: 'cukru',
    unit: 4,
    noun: ['kostka cukru', 'kostky cukru', 'kostek cukru'],
    reference: 'sugarsG',
    label: 'cukrů',
  },
  {
    key: 'salt',
    field: 'saltG',
    what: 'soli',
    unit: 6,
    noun: ['zarovnaná čajová lžička', 'zarovnané čajové lžičky', 'zarovnaných čajových lžiček'],
    reference: 'saltG',
    label: 'soli',
  },
  {
    key: 'saturates',
    field: 'saturatesG',
    what: 'nasycených tuků',
    unit: 5,
    noun: ['kostička másla', 'kostičky másla', 'kostiček másla'],
    reference: 'saturatesG',
    label: 'nasycených tuků',
  },
];

async function findings() {
  const repo = await createRepository({ contentRoot: path.join(ROOT, 'content') });
  const chains = await repo.listChains();
  const byChain = new Map(chains.map((c) => [c.slug, c]));
  const items = await repo.listItems();
  const intakes = await repo.getReferenceIntakes();

  const rows = [];
  for (const item of items) {
    const chain = byChain.get(item.chainSlug);
    if (!chain) continue;
    for (const variant of item.variants) {
      const serving = pickBasis(variant.nutrition, 'per-serving');
      if (!serving || !variant.sources[0]) continue;
      rows.push({ item, variant, chain, serving });
    }
  }

  const out = [];

  for (const row of rows) {
    const s = row.serving;
    if (s.energyKJ == null || s.fatG == null || s.carbohydrateG == null || s.proteinG == null) {
      continue;
    }
    const macro = Object.entries(ATWATER).reduce((sum, [f, k]) => sum + s[f] * k, 0);
    const gap = Math.abs(macro - s.energyKJ);
    /*
     * BOTH a proportion and an absolute floor. A dressing declaring 9 kJ where
     * its macros come to 5 is out by 44% and by four kilojoules, which is
     * rounding rather than a finding.
     */
    if (gap < s.energyKJ * 0.2 || gap < 300) continue;
    out.push({ kind: 'contradiction', row, macro: round(macro), gap: round(gap) });
  }

  if (intakes) {
    for (const row of rows) {
      for (const n of NUTRIENTS) {
        const value = row.serving[n.field];
        const reference = intakes[n.reference];
        if (value == null || !reference || value < reference) continue;
        out.push({ kind: 'reference', row, nutrient: n, value, reference });
      }
    }
  }

  for (const n of NUTRIENTS) {
    let best = null;
    for (const row of rows) {
      const value = row.serving[n.field];
      if (value == null) continue;
      if (!best || value > best.value) best = { kind: 'record', row, nutrient: n, value };
    }
    if (best) out.push(best);
  }

  const rank = { contradiction: 0, reference: 1, record: 2 };
  out.sort(
    (a, b) =>
      rank[a.kind] - rank[b.kind] ||
      `${a.row.item.chainSlug}/${a.row.item.slug}`.localeCompare(
        `${b.row.item.chainSlug}/${b.row.item.slug}`,
      ),
  );

  /*
   * INTERLEAVED BY CHAIN, round robin.
   *
   * Findings are not spread evenly: 43 of the 56 daily-intake ones are Pizza
   * Hut, because a whole pizza passes the salt and saturates reference and a
   * sandwich mostly does not. Sorted by chain that gives a feed which is
   * basically a pizza account, and the point of the site is the comparison
   * across companies. Taking one chain at a time in turn keeps every chain in
   * rotation without dropping a single finding.
   */
  /*
   * ONE FINDING PER ITEM. A pizza that passes both the salt and the saturates
   * reference produced two entries, so the same product came round twice in a
   * fortnight with a different nutrient. The sort above already puts the
   * strongest kind first, so the first one seen is the one kept.
   */
  const seen = new Set();
  const unique = out.filter((f) => {
    const key = `${f.row.item.chainSlug}/${f.row.item.slug}/${f.row.variant.market}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const queues = new Map();
  for (const f of unique) {
    const key = f.row.item.chainSlug;
    if (!queues.has(key)) queues.set(key, []);
    queues.get(key).push(f);
  }
  const woven = [];
  const lists = [...queues.values()];
  for (let i = 0; woven.length < unique.length; i += 1) {
    for (const list of lists) if (list[i]) woven.push(list[i]);
  }
  return woven;
}

function caption(f) {
  const { item, chain, variant, serving } = f.row;
  const checked = new Date(variant.verifiedOn).toLocaleDateString('cs-CZ');
  const tail = [
    '',
    `Údaje zveřejňuje ${chain.name}. Naposledy ověřeno ${checked}. ` +
      `Výpočet i zdroj najdete na ${SITE}.`,
    '',
    TAGS,
  ];

  if (f.kind === 'contradiction') {
    const pct = Math.round((f.gap / serving.energyKJ) * 100);
    return [
      'Tohle číslo nesedí na to vedlejší.',
      '',
      `${item.name} od ${chain.name}. Firma u něj uvádí ${cz(round(serving.energyKJ))} kJ.`,
      '',
      `Z tuků, sacharidů a bílkovin na tomtéž řádku ale vychází ${cz(f.macro)} kJ. ` +
        `Rozdíl je ${cz(f.gap)} kJ, tedy ${pct} procent.`,
      '',
      'Které z těch dvou čísel je špatně, nevíme. Obě uvádí sama společnost ' +
        'a dohadovat se za ni nebudeme.',
      ...tail,
    ].join('\n');
  }

  if (f.kind === 'reference') {
    const n = f.nutrient;
    const times = round(f.value / f.reference, 1);
    const cubes = round(f.value / n.unit, 1);
    return [
      `Jedna porce. Celý denní příjem ${n.label}.`,
      '',
      `${item.name} od ${chain.name} má ${cz(round(f.value, 1))} g ${n.what}. ` +
        `To je ${cz(cubes)} ${plural(cubes, n.noun)}.`,
      '',
      `Referenční příjem pro dospělého je ${cz(f.reference)} g na celý den. ` +
        `Tohle je ${cz(times)}násobek, v jedné porci.`,
      '',
      'Nepřepočítáváme to ani nezaokrouhlujeme. Je to jejich číslo, tak jak ho uvádějí.',
      ...tail,
    ].join('\n');
  }

  const n = f.nutrient;
  const cubes = round(f.value / n.unit, 1);
  return [
    `Nejvíc ${n.what} v jedné porci, co na webu máme.`,
    '',
    `${item.name} od ${chain.name}. ${cz(round(f.value, 1))} g, tedy ${cz(cubes)} ` +
      `${plural(cubes, n.noun)}.`,
    '',
    'Není to typický příklad. Je to ten nejzazší, a proto stojí za ukázání.',
    ...tail,
  ].join('\n');
}

async function build(date, all) {
  /*
   * Walked one at a time, because the list is already interleaved by chain.
   * An earlier version strode through it to break up runs, which was right
   * when the list was sorted by chain and actively unhelpful once the
   * round robin was doing that job properly.
   */
  const EPOCH = Date.UTC(2026, 7, 19);
  const day = Math.floor((Date.parse(`${date}T00:00:00Z`) - EPOCH) / 86_400_000);
  const f = all[((day % all.length) + all.length) % all.length];

  const dir = path.join(OUT, date);
  /* Emptied first, or a re-run after a data change leaves the previous item's
   * PNG beside the new caption. That is how you post the right words with the
   * wrong picture. */
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });

  const tokens = JSON.parse(
    await readFile(path.join(ROOT, 'packages', 'design-tokens', 'tokens.export.json'), 'utf8'),
  ).css;

  const { item, chain, variant, serving } = f.row;
  const checked = new Date(variant.verifiedOn).toLocaleDateString('cs-CZ');

  /*
   * The slides carry the SAME finding the caption argues, which the Specimen
   * Card could not. That card drew whichever three nutrients the item happened
   * to hold, so a post about 838 kJ against 51 kJ was illustrated with
   * "SUGAR 0.065 g". Here picture and words come from one object.
   */
  const attribution = `Údaje zveřejnila ${chain.name}. Naposledy ověřeno ${checked}.`;
  let slides;
  if (f.kind === 'contradiction') {
    const pct = Math.round((f.gap / serving.energyKJ) * 100);
    slides = {
      hero: `${pct} %`,
      heroSub: 'Tak moc se liší dvě čísla, která firma uvádí na jednom řádku.',
      title: 'Dvě čísla, jeden výrobek',
      rows: [
        { label: 'FIRMA UVÁDÍ', value: `${cz(round(serving.energyKJ))} kJ` },
        { label: 'Z TUKŮ, SACHARIDŮ A BÍLKOVIN VYCHÁZÍ', value: `${cz(f.macro)} kJ`, accent: true },
      ],
      note: 'Které z nich je špatně, nevíme. Obě uvádí sama společnost.',
      chain: chain.name,
      item: item.name,
      source: attribution,
    };
  } else if (f.kind === 'reference') {
    const n = f.nutrient;
    const times = round(f.value / f.reference, 1);
    slides = {
      hero: `${cz(times)}×`,
      heroSub: `Tolikrát denní příjem ${n.label}. V jedné porci.`,
      title: 'Jedna porce proti celému dni',
      rows: [
        { label: 'V JEDNÉ PORCI', value: `${cz(round(f.value, 1))} g`, accent: true },
        { label: 'REFERENČNÍ PŘÍJEM NA CELÝ DEN', value: `${cz(f.reference)} g` },
      ],
      note: 'Referenční příjem je z přílohy XIII nařízení 1169/2011. Není to doporučení mířené na vás.',
      chain: chain.name,
      item: item.name,
      source: attribution,
    };
  } else {
    const n = f.nutrient;
    slides = {
      hero: `${cz(round(f.value, 1))} g`,
      heroSub: `Nejvíc ${n.what} v jedné porci, co na webu máme.`,
      title: 'Nejzazší případ, ne typický',
      rows: [
        {
          label: `${n.label.toUpperCase()} V PORCI`,
          value: `${cz(round(f.value, 1))} g`,
          accent: true,
        },
      ],
      note: 'Je to extrém, a proto stojí za ukázání.',
      chain: chain.name,
      item: item.name,
      source: attribution,
    };
  }

  const fonts = resvgFonts();
  const svgs = carouselSvg(slides, tokens);
  for (const [i, svg] of svgs.entries()) {
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: SLIDE.width }, font: fonts })
      .render()
      .asPng();
    await writeFile(path.join(dir, `${i + 1}-${item.chainSlug}-${item.slug}.png`), png);
  }

  await writeFile(path.join(dir, 'caption.txt'), `${caption(f)}\n`, 'utf8');
  await writeFile(
    path.join(dir, 'meta.json'),
    `${JSON.stringify(
      {
        date,
        kind: f.kind,
        chain: chain.name,
        item: item.name,
        market: variant.market,
        page: `https://www.${SITE}/cs/chains/${item.chainSlug}/${item.slug}/${variant.market}/`,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  return f;
}

const all = await findings();
if (!all.length) throw new Error('žádný nález, ze kterého by se dal postavit příspěvek');

const start = args.get('date') ?? new Date().toISOString().slice(0, 10);
const days = Number(args.get('days') ?? 1);
const kinds = all.reduce((acc, f) => ({ ...acc, [f.kind]: (acc[f.kind] ?? 0) + 1 }), {});
console.log(`nálezů: ${all.length}  ${JSON.stringify(kinds)}`);

for (let i = 0; i < days; i += 1) {
  const d = new Date(`${start}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + i);
  const iso = d.toISOString().slice(0, 10);
  const f = await build(iso, all);
  console.log(`${iso}  ${f.kind.padEnd(14)} ${f.row.chain.name} / ${f.row.item.name}`);
}
