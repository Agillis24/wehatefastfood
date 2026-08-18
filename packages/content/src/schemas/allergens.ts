import { z } from 'zod';

/**
 * The fourteen allergens of Annex II to Regulation (EU) No 1169/2011, plus the
 * sub-items the two cereal and nut categories are broken into.
 *
 * WHY A CONTROLLED VOCABULARY. `allergens` used to be `z.array(z.string())`,
 * which meant every source could spell its own list its own way: KFC's table
 * has a column headed "Gluten (pšenice)", McDonald's price list writes "1a",
 * and a British source would say "wheat". Three spellings of one fact cannot be
 * compared, cannot be filtered, and cannot be translated - and a reader who
 * cannot filter on their own allergen is a reader this data does not serve.
 *
 * WHY BOTH LEVELS. The law lists "cereals containing gluten" as one allergen
 * and names the cereals inside it; declarations differ in how far down they go.
 * McDonald's says 1a, meaning wheat specifically. KFC's grid has a column for
 * wheat and one for rye. Some sources say only "gluten". Storing whichever the
 * source actually said is the rule this project already applies to figures, and
 * it applies here for a sharper reason: telling someone a product contains
 * "nuts" when the label says "hazelnut" is a different claim, and telling them
 * "hazelnut" when the label said "nuts" is one we invented.
 *
 * The display layer widens - anything under `nuts-` implies `nuts` - because
 * widening is safe. Narrowing never happens anywhere.
 */
export const ALLERGENS = [
  // 1: cereals containing gluten
  'cereals-gluten',
  'cereals-gluten-wheat',
  'cereals-gluten-rye',
  'cereals-gluten-barley',
  'cereals-gluten-oats',
  'cereals-gluten-spelt',
  'cereals-gluten-kamut',
  // 2-7
  'crustaceans',
  'eggs',
  'fish',
  'peanuts',
  'soybeans',
  'milk',
  // 8: tree nuts
  'nuts',
  'nuts-almond',
  'nuts-hazelnut',
  'nuts-walnut',
  'nuts-cashew',
  'nuts-pecan',
  'nuts-brazil',
  'nuts-pistachio',
  'nuts-macadamia',
  // 9-14
  'celery',
  'mustard',
  'sesame',
  'sulphur-dioxide',
  'lupin',
  'molluscs',
] as const;

export type Allergen = (typeof ALLERGENS)[number];

export const AllergenSchema = z.enum(ALLERGENS);

/** The Annex II category a specific item belongs to, for display only. */
export function allergenParent(a: Allergen): Allergen {
  if (a.startsWith('cereals-gluten-')) return 'cereals-gluten';
  if (a.startsWith('nuts-')) return 'nuts';
  return a;
}

/**
 * The numeric codes Czech menus print, as in "A:1a,9,10 / MO:1c,6,7,11".
 *
 * These come from the legend the price list prints beside the table, not from
 * anybody's memory of the regulation. Codes outside this map are a parse error
 * rather than something to guess at.
 */
export const CZ_ALLERGEN_CODES: Readonly<Record<string, Allergen>> = {
  '1': 'cereals-gluten',
  '1a': 'cereals-gluten-wheat',
  '1b': 'cereals-gluten-rye',
  '1c': 'cereals-gluten-barley',
  '1d': 'cereals-gluten-oats',
  '1e': 'cereals-gluten-spelt',
  '1f': 'cereals-gluten-kamut',
  '2': 'crustaceans',
  '3': 'eggs',
  '4': 'fish',
  '5': 'peanuts',
  '6': 'soybeans',
  '7': 'milk',
  '8': 'nuts',
  '8a': 'nuts-almond',
  '8b': 'nuts-hazelnut',
  '8c': 'nuts-walnut',
  '8d': 'nuts-cashew',
  '8e': 'nuts-pecan',
  '8f': 'nuts-brazil',
  '8g': 'nuts-pistachio',
  '8h': 'nuts-macadamia',
  '9': 'celery',
  '10': 'mustard',
  '11': 'sesame',
  '12': 'sulphur-dioxide',
  '13': 'lupin',
  '14': 'molluscs',
};
