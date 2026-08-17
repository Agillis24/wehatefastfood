/**
 * Turn a nutrition panel you copied out of a browser into a content record.
 *
 *   npm run import -- --chain=mcdonalds --market=US --item="Big Mac"
 *
 * Paste the nutrition block, press Ctrl+Z (Windows) or Ctrl+D, and it writes a
 * draft into content/ with every figure it could read and `null` for every one
 * it could not.
 *
 * WHY A PASTE TOOL RATHER THAN A FETCHER. mcdonalds.com does not answer a
 * non-browser client - a plain request times out rather than being refused -
 * and getting round that would mean defeating bot protection, which is not on
 * the table whoever asks. A person with the page open is not blocked, so the
 * figures come through them. This exists to make that cost twenty seconds an
 * item instead of five minutes.
 *
 * It also keeps the project's own rule intact without anybody having to
 * remember it: a person decides each item is worth documenting, one at a time,
 * and every record carries the URL it came from and the date it was read.
 * docs/LEGAL.md §2.
 *
 * NOTHING IS INVENTED. A figure that is not in the pasted text is written as
 * null with status "unpublished", never estimated, never carried over from a
 * similar product. That is the first rule in CLAUDE.md and this is the file
 * most likely to be asked to break it.
 */

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value ?? 'true'];
  }),
);

function die(message, hint) {
  console.error(`\nimport: ${message}`);
  if (hint) console.error(`\n${hint}`);
  process.exit(1);
}

/**
 * Every figure we take, with the labels the source actually prints.
 *
 * `unit` is what the panel shows, NOT what we store: US panels give sodium in
 * mg and the schema wants mg, but they give energy as "Cal." meaning kcal, and
 * conflating the two is how a nutrition site loses its reason to exist.
 */
const FIELDS = [
  { key: 'energyKcal', labels: ['calories', 'cal'], unit: 'kcal' },
  { key: 'fatG', labels: ['total fat', 'fat'], unit: 'g' },
  { key: 'saturatesG', labels: ['saturated fat', 'saturates'], unit: 'g' },
  { key: 'transFatG', labels: ['trans fat'], unit: 'g' },
  {
    key: 'carbohydrateG',
    // Longest first: "carbohydrate" would match "Carbohydrates:" up to the
    // "s" and then fail on the colon, so the plural has to be tried before it.
    labels: [
      'total carbs',
      'total carbohydrates',
      'carbohydrates',
      'total carbohydrate',
      'carbohydrate',
    ],
    unit: 'g',
  },
  { key: 'sugarsG', labels: ['total sugars', 'sugars', 'sugar'], unit: 'g' },
  { key: 'addedSugarsG', labels: ['added sugars'], unit: 'g' },
  { key: 'fibreG', labels: ['dietary fibre', 'dietary fiber', 'fibre', 'fiber'], unit: 'g' },
  { key: 'proteinG', labels: ['protein'], unit: 'g' },
  { key: 'sodiumMg', labels: ['sodium'], unit: 'mg' },
];

/**
 * Read "Saturated Fat: 20g (98 % DV)" and take the 20.
 *
 * The percentage is deliberately discarded. It is computed against a reference
 * intake this project holds its own copy of, and storing somebody else's
 * arithmetic means storing their reference table by implication.
 */
/**
 * Words that turn one nutrient into a different one.
 *
 * "Fat" as a bare label matched inside "Saturated Fat:13g" and silently
 * recorded 13 g of total fat for an item that has 27 - the saturated figure
 * wearing the total's name. Caught on the first real item, which is the only
 * reason it is not in the content now.
 *
 * So a label never matches when one of these sits immediately before it.
 */
const QUALIFIERS = ['saturated', 'trans', 'added', 'total', 'monounsaturated', 'polyunsaturated'];

function findValue(text, labels, unit) {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    /*
     * The value can sit AFTER a parenthetical: the US pages print
     * "Total Carbs (14 % Daily Value)39g", so requiring the number to follow
     * the label immediately finds nothing and falls through to a looser label
     * that finds the wrong number. Allowing one optional bracketed group is
     * what makes the specific label win over the general one.
     */
    const qualifier = label.includes(' ')
      ? '' // already specific - "saturated fat" needs no guard
      : QUALIFIERS.map((q) => `(?<!${q}\\s)(?<!${q})`).join('');

    const pattern = new RegExp(
      /*
       * A LETTER guard after the label, not a word boundary.
       *
       * These pages run the value straight onto the label - "Calories490",
       * "Protein17g" - and \b between "s" and "4" does not exist, so requiring
       * one silently found nothing. (?![a-z]) still stops "cal" matching inside
       * "calories" while letting a digit follow immediately.
       */
      // The separator allows a full stop, because these pages write "Cal.460".
      // The value must still START with a digit, or that same full stop is read
      // as a decimal point and 460 becomes 0.46.
      `${qualifier}\\b${escaped}(?![a-z])[\\s:.]*(?:\\([^)]*\\)[\\s.]*)?(\\d[\\d.,]*)\\s*` +
        (unit === 'kcal'
          ? '(?:cal|kcal)?'
          : `(?:${unit}|${unit === 'g' ? 'grams?' : 'milligrams?'})`),
      'i',
    );

    /*
     * The number MUST start with a digit.
     *
     * It did not have to, and "460 Cal.460" was read as 0.46: the full stop
     * ending "Cal." fell inside the character class and became a decimal point.
     * Four hundred and sixty calories recorded as under half of one, and every
     * other figure on the record correct - which is what makes it dangerous.
     */

    const match = pattern.exec(text);
    if (match?.[1]) {
      const value = Number(match[1].replace(',', '.'));
      if (Number.isFinite(value)) return value;
    }

    /*
     * Then the other way round. These pages write the value before the label as
     * often as after - "460 Cal.", "27grams Total Fat" - so a parser that only
     * reads one order finds nothing on half the fields and, worse, falls through
     * to a vaguer label that finds the wrong number somewhere else.
     */
    const reversed = new RegExp(
      `(\\d[\\d.,]*)\\s*` +
        (unit === 'kcal' ? '(?:cal|kcal)\\.?' : `(?:${unit}|grams?|milligrams?)`) +
        `\\s*${qualifier}\\b${escaped}(?![a-z])`,
      'i',
    );
    const back = reversed.exec(text);
    if (back?.[1]) {
      const value = Number(back[1].replace(',', '.'));
      if (Number.isFinite(value)) return value;
    }
  }
  return null;
}

const chain = args.get('chain');
const market = (args.get('market') ?? '').toUpperCase();
const itemName = args.get('item');
const sourceUrl = args.get('url');

if (!chain || !market || !itemName) {
  die(
    'need --chain, --market and --item',
    'npm run import -- --chain=mcdonalds --market=US --item="Big Mac" \\\n' +
      '                 --url="https://www.mcdonalds.com/..."',
  );
}
/** The schema's enum. A wrong one fails validation rather than mislabelling. */
const CATEGORIES = [
  'burger',
  'chicken',
  'fries-sides',
  'pizza',
  'wrap',
  'breakfast',
  'dessert',
  'drink',
  'sauce',
  'other',
];
const category = args.get('category') ?? '';
if (!CATEGORIES.includes(category)) {
  die(`--category must be one of: ${CATEGORIES.join(', ')}`);
}

if (!sourceUrl) {
  die(
    'need --url',
    'The URL of the page you read the figures on. Every figure in this project\n' +
      'carries its source and the date a person read it - a record without one\n' +
      'cannot be published and the content gate will reject it.',
  );
}

console.log(`
Paste the nutrition panel for "${itemName}", then press Ctrl+Z and Enter
(Windows) or Ctrl+D (macOS/Linux).

Copy the whole block - labels and numbers. Order does not matter and extra
text is ignored.
`);

const pasted = await new Promise((resolve) => {
  let buffer = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => (buffer += chunk));
  process.stdin.on('end', () => resolve(buffer));
});

if (pasted.trim() === '') die('nothing was pasted');

const facts = {};
const missing = [];
for (const field of FIELDS) {
  const value = findValue(pasted, field.labels, field.unit);
  facts[field.key] = value;
  if (value === null) missing.push(field.key);
}

/*
 * Serving size in grams, which the US calculator does not always print and
 * which everything per-100g depends on. Without it the traffic lights cannot be
 * computed at all, so its absence is reported loudly rather than defaulted.
 */
const servingSizeG = findValue(pasted, ['serving size', 'weight'], 'g');

console.log('  read from the paste:');
for (const field of FIELDS) {
  const value = facts[field.key];
  console.log(`    ${field.key.padEnd(16)} ${value === null ? '- not found' : value}`);
}
console.log(
  `    ${'servingSizeG'.padEnd(16)} ${servingSizeG === null ? '- not found' : servingSizeG}`,
);

if (facts.energyKcal === null) {
  die(
    'no calorie figure was found',
    'That usually means the paste was not the nutrition panel. Nothing written.',
  );
}

/*
 * A menu item is between 1 and 3000 kcal.
 *
 * Not a guess about food - a guard against the parse. "460 Cal.460" was once
 * read as 0.46 and nothing else on the record looked wrong. A range this wide
 * rejects nothing real and catches a decimal point that came from a full stop.
 */
if (facts.energyKcal !== null && (facts.energyKcal < 1 || facts.energyKcal > 3000)) {
  die(
    `${facts.energyKcal} kcal is not a plausible figure for one item`,
    'Nothing was written. This is a parsing fault rather than a source fault -\nalmost always a stray full stop read as a decimal point.',
  );
}

/*
 * Figures that cannot be true together.
 *
 * A parser that reads the wrong number is worse than one that reads none: the
 * record looks complete and the site publishes it. That happened here - "Fat"
 * matched inside "Saturated Fat" and wrote 13 g where the item has 27 - and
 * nothing about the output looked wrong.
 *
 * These are arithmetic, not judgement. Saturates are a subset of fat, sugars a
 * subset of carbohydrate, and a component cannot exceed its whole. Any of them
 * failing means the parse is wrong, so nothing is written.
 */
const contradictions = [
  ['saturatesG', 'fatG', 'saturated fat cannot exceed total fat'],
  ['transFatG', 'fatG', 'trans fat cannot exceed total fat'],
  ['sugarsG', 'carbohydrateG', 'sugars cannot exceed total carbohydrate'],
  ['addedSugarsG', 'sugarsG', 'added sugars cannot exceed total sugars'],
  ['fibreG', 'carbohydrateG', 'fibre cannot exceed total carbohydrate'],
]
  .filter(([part, whole]) => facts[part] !== null && facts[whole] !== null)
  .filter(([part, whole]) => facts[part] > facts[whole])
  .map(([part, whole, why]) => `${why} (${part} ${facts[part]} > ${whole} ${facts[whole]})`);

if (contradictions.length > 0) {
  die(
    `the figures contradict each other:\n  - ${contradictions.join('\n  - ')}`,
    'Nothing was written. This almost always means a label matched the wrong\nnumber rather than that the source is wrong - check the paste, and if it\nlooks right, the parser needs the label adding.',
  );
}

const dir = path.join(ROOT, 'content', 'items', chain);
await mkdir(dir, { recursive: true });

const slug = itemName
  .toLowerCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const today = new Date().toISOString().slice(0, 10);
const file = path.join(dir, `${slug}.json`);

const existing = await readFile(file, 'utf8').catch(() => null);
if (existing && args.get('force') !== 'true') {
  die(
    `${path.relative(ROOT, file)} already exists`,
    'Pass --force to overwrite. Overwriting discards any hand-written analysis\nalready on that record, which is the part a person wrote.',
  );
}

const record = {
  slug,
  chainSlug: chain,
  name: itemName,
  category,
  variants: [
    {
      market,
      verifiedOn: today,
      /*
       * energyKJ and saltG are left null on purpose, not because they are
       * unknown. The schema is explicit: "Do not derive, interpolate or convert
       * on the way in - the display layer converts, and says which constant it
       * used." kJ from kcal and salt from sodium are both defined conversions,
       * and both belong to the layer that can show its working.
       *
       * transFatG and addedSugarsG are parsed for the contradiction checks and
       * then dropped: the schema is strict and does not carry them. They are
       * real published figures, so adding the fields is a fair change - just
       * not one to make silently while importing.
       */
      nutrition: [
        {
          basis: 'per-serving',
          servingSizeG,
          energyKJ: null,
          energyKcal: facts.energyKcal,
          fatG: facts.fatG,
          saturatesG: facts.saturatesG,
          carbohydrateG: facts.carbohydrateG,
          sugarsG: facts.sugarsG,
          fibreG: facts.fibreG,
          proteinG: facts.proteinG,
          saltG: null,
          sodiumMg: facts.sodiumMg,
        },
      ],
      status: 'partial',
      ingredientRefs: [],
      additiveRefs: [],
      allergens: [],
      sources: [
        {
          title: `${itemName} - nutrition information`,
          publisher: "McDonald's",
          url: sourceUrl,
          retrievedOn: today,
          type: 'company-disclosure',
        },
      ],
    },
  ],
};

await writeFile(file, `${JSON.stringify(record, null, 2)}\n`, 'utf8');

console.log(`
  written: ${path.relative(ROOT, file)}

STILL TO DO BY HAND, and the record will not validate until they are:
  - ingredientRefs and additiveRefs, from the ingredients list
  - allergens
  - ourTake, if this item deserves one
${servingSizeG === null ? '  - servingSizeG: NOT PUBLISHED on that page. Without it there is no\n    per-100g figure and therefore no traffic light. Find it or leave the\n    bands off this item.\n' : ''}${missing.length > 0 ? `\nNot in the paste, written as null: ${missing.join(', ')}` : ''}

Then: npm run content:validate`);
