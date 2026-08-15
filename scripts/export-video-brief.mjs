/**
 * The contract with the YouTube pipeline, per BRIEF §11.
 *
 *   npm run export:video-brief -- --item=chain/item --market=GB
 *
 * Writes exports/video-briefs/<chain>-<item>-<market>.json: the verified facts,
 * their sources, the comparisons worth putting on screen, suggested narrative
 * beats, and the design tokens.
 *
 * THE POINT OF THIS FILE IS THAT THE VIDEO CANNOT INVENT A NUMBER EITHER.
 * Every figure carries the source it came from and the date it was verified,
 * and `provisional` is true whenever anything on the page is computed from
 * reference data a human has not checked. A script written from this brief can
 * be checked against it line by line.
 *
 * Schema documented in docs/ARCHITECTURE.md. Seed content is excluded unless
 * --seed=true, because a brief is a publishable artefact.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FSA_NUTRIENTS,
  bandFor,
  createRepository,
  pickBasis,
  referenceIntakePercent,
  resolvePer100,
} from '@wff/content';
import { UNITS } from './lib/specimen-card.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'exports', 'video-briefs');
const SCHEMA_VERSION = 1;

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value ?? 'true'];
  }),
);

const tokens = JSON.parse(
  await readFile(path.join(ROOT, 'packages', 'design-tokens', 'tokens.export.json'), 'utf8'),
);

const repo = await createRepository({
  contentRoot: path.join(ROOT, 'content'),
  includeSeed: args.get('seed') === 'true',
  now: new Date(),
});

const thresholds = await repo.getFsaThresholds();
const intakes = await repo.getReferenceIntakes();
const wantedItem = args.get('item');
const wantedMarket = args.get('market');

await mkdir(OUT, { recursive: true });

let written = 0;

for (const item of await repo.listItems()) {
  const key = `${item.chainSlug}/${item.slug}`;
  if (wantedItem !== undefined && wantedItem !== key) continue;

  const chain = await repo.getChain(item.chainSlug);
  if (!chain) continue;

  for (const variant of item.variants) {
    if (wantedMarket !== undefined && wantedMarket !== variant.market) continue;

    const serving = pickBasis(variant.nutrition, 'per-serving') ?? null;
    const per100 = resolvePer100(variant.nutrition);
    const isDrink = item.category === 'drink';

    const bands =
      per100 && thresholds
        ? FSA_NUTRIENTS.map((n) => bandFor(n, per100, serving, isDrink, thresholds)).filter(
            (b) => b !== null,
          )
        : [];

    const additives = [];
    for (const ref of variant.additiveRefs) {
      const additive = await repo.getAdditive(ref);
      if (!additive) continue;
      additives.push({
        slug: additive.slug,
        eNumber: additive.eNumber,
        name: additive.names[0],
        whyItIsInYourFood: additive.whyItIsInYourFood,
        evidenceStrength: additive.evidenceStrength,
        sources: additive.sources,
      });
    }

    // What differs from the other markets. This is the most watchable thing on
    // the site, so it is handed to the video pipeline already worked out.
    const here = new Set([...variant.ingredientRefs, ...variant.additiveRefs]);
    const marketDifferences = item.variants
      .filter((other) => other.market !== variant.market)
      .map((other) => {
        const there = new Set([...other.ingredientRefs, ...other.additiveRefs]);
        return {
          otherMarket: other.market,
          onlyHere: [...here].filter((slug) => !there.has(slug)),
          onlyThere: [...there].filter((slug) => !here.has(slug)),
        };
      });

    const stack = (kind, grams) =>
      grams === null || grams === undefined
        ? null
        : { grams, unitGrams: UNITS[kind], units: Math.round((grams / UNITS[kind]) * 100) / 100 };

    const provisional = thresholds?.status !== 'verified' || intakes?.status !== 'verified';

    const brief = {
      schemaVersion: SCHEMA_VERSION,
      generatedFrom: 'wehatefastfood content repository',

      // Everything a script may state, and nothing else.
      subject: {
        chain: { slug: chain.slug, name: chain.name },
        item: { slug: item.slug, name: item.name, category: item.category },
        market: variant.market,
        verifiedOn: variant.verifiedOn,
        status: variant.status,
      },

      /**
       * True when anything here derives from reference data no human has
       * checked. A video made from a provisional brief must say so, exactly as
       * the web page does.
       */
      provisional,
      provisionalReason: provisional
        ? 'FSA thresholds and/or reference intakes are marked unverified in content/reference/'
        : null,

      facts: {
        servingSizeG: serving?.servingSizeG ?? null,
        perServing: serving,
        per100: per100,
        quantityStack: {
          sugar: stack('sugar', serving?.sugarsG ?? null),
          salt: stack('salt', serving?.saltG ?? null),
          saturates: stack('saturates', serving?.saturatesG ?? null),
        },
        trafficLights: bands.map((b) => ({
          nutrient: b.nutrient,
          band: b.band,
          per100: b.per100,
          perPortion: b.perPortion,
          drivenByPortion: b.drivenByPortion,
          thresholds: b.thresholds,
        })),
        referenceIntakePercent:
          serving && intakes
            ? {
                energyKcal: referenceIntakePercent(serving, 'energyKcal', intakes),
                fatG: referenceIntakePercent(serving, 'fatG', intakes),
                saturatesG: referenceIntakePercent(serving, 'saturatesG', intakes),
                sugarsG: referenceIntakePercent(serving, 'sugarsG', intakes),
                saltG: referenceIntakePercent(serving, 'saltG', intakes),
              }
            : null,
        allergens: variant.allergens,
      },

      additives,
      marketDifferences,

      editorial: {
        ourTake: item.ourTake ?? null,
        // Beats, not a script. The words are a human's job.
        suggestedBeats: [
          'Open on the Specimen Card. State the market and the verification date before any figure.',
          bands.some((b) => b.drivenByPortion)
            ? 'A band is HIGH because of portion size, not concentration. Show both numbers and the threshold - this is the most misunderstood thing on a label.'
            : 'Walk the quantity stack: sugar cubes, salt teaspoons, butter pats, at true relative scale.',
          marketDifferences.some((d) => d.onlyHere.length + d.onlyThere.length > 0)
            ? 'Same product, different country. Show the difference, then say plainly that a declaration difference is not necessarily a recipe difference.'
            : 'No market difference to show for this item.',
          additives.length > 0
            ? `Take one additive - ${additives[0].name} - and answer only the interesting question: why did the company put it there?`
            : 'No additives recorded for this market.',
          'Close on the sources. Never state a figure without the market and the date.',
        ],
        forbidden: [
          'No exercise equivalents, ever.',
          'No good/bad food framing, no calorie shaming, no advice about what the viewer should eat.',
          'Aim every criticism at the company and at regulation, never at the person eating.',
          'No chain logos, no packaging footage, no brand colours used to identify a company.',
          'Never state a figure that is not in this brief.',
        ],
      },

      sources: { forThisMarket: variant.sources, forTheChain: chain.sources },
      design: { tokens: tokens.css, angle: tokens.css['--angle-strike'] },
      assets: {
        cardSvg: `exports/social/${item.chainSlug}-${item.slug}-${variant.market}-video.svg`,
        cardPng: `exports/social/${item.chainSlug}-${item.slug}-${variant.market}-video.png`,
        note: 'Run `npm run social:cards` to produce these.',
      },
    };

    const file = path.join(OUT, `${item.chainSlug}-${item.slug}-${variant.market}.json`);
    await writeFile(file, `${JSON.stringify(brief, null, 2)}\n`, 'utf8');
    console.log(`  ${path.relative(ROOT, file).split(path.sep).join('/')}`);
    written += 1;
  }
}

console.log(
  written === 0
    ? 'video-brief: nothing to export. Pass --seed=true to exercise the pipeline against seed data.'
    : `\nvideo-brief: ${written} brief(s) -> exports/video-briefs/`,
);
