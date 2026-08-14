import type { FsaBand, FsaNutrient, NutritionFacts } from './schemas/nutrition.js';
import type { FsaThresholds, ReferenceIntakes } from './schemas/reference.js';

/**
 * Nutrition maths. Everything here is pure, total, and unit-tested at its
 * boundaries, because a wrong traffic light is a wrong claim about food.
 *
 * Nothing in this file rounds for display. Rounding is a presentation decision
 * and belongs at the edge, where it can say what it did.
 */

/**
 * EU FIC convention: salt equivalent = sodium x 2.5, so 1 g of salt is 400 mg
 * of sodium. The chemical ratio is 393.4 (Na is 22.99 of NaCl's 58.44), and the
 * two disagree by 1.7%.
 *
 * We use the regulatory constant because that is what the labels we transcribe
 * were computed with, and the page names the constant so a reader can check us.
 * US labels declare sodium; EU and UK labels declare salt.
 */
export const SODIUM_MG_PER_SALT_G = 400;

export const saltGFromSodiumMg = (mg: number): number => mg / SODIUM_MG_PER_SALT_G;
export const sodiumMgFromSaltG = (g: number): number => g * SODIUM_MG_PER_SALT_G;

/**
 * Salt, from whichever of the two the panel actually published.
 * Returns null when neither is published - never a guess.
 */
export function resolveSaltG(facts: NutritionFacts): number | null {
  if (facts.saltG !== null) return facts.saltG;
  if (facts.sodiumMg !== null) return saltGFromSodiumMg(facts.sodiumMg);
  return null;
}

/** True when the declared salt and sodium disagree by more than `tolerance`. */
export function saltSodiumDisagreement(
  facts: NutritionFacts,
  tolerance = 0.05,
): { expectedMg: number; declaredMg: number; ratio: number } | null {
  if (facts.saltG === null || facts.sodiumMg === null) return null;
  const expectedMg = sodiumMgFromSaltG(facts.saltG);
  if (expectedMg === 0)
    return facts.sodiumMg === 0
      ? null
      : { expectedMg, declaredMg: facts.sodiumMg, ratio: Infinity };
  const ratio = facts.sodiumMg / expectedMg;
  return Math.abs(ratio - 1) > tolerance ? { expectedMg, declaredMg: facts.sodiumMg, ratio } : null;
}

/**
 * Atwater energy check. EU panels declare carbohydrate excluding fibre, so
 * fibre is counted separately at 2 kcal/g.
 */
export const ATWATER = { proteinKcalPerG: 4, carbKcalPerG: 4, fatKcalPerG: 9, fibreKcalPerG: 2 };

export function atwaterKcal(facts: NutritionFacts): number | null {
  const { proteinG, carbohydrateG, fatG, fibreG } = facts;
  if (proteinG === null || carbohydrateG === null || fatG === null) return null;
  return (
    proteinG * ATWATER.proteinKcalPerG +
    carbohydrateG * ATWATER.carbKcalPerG +
    fatG * ATWATER.fatKcalPerG +
    (fibreG ?? 0) * ATWATER.fibreKcalPerG
  );
}

/** Relative discrepancy between declared and computed energy, or null. */
export function energyDiscrepancy(facts: NutritionFacts): number | null {
  const computed = atwaterKcal(facts);
  if (computed === null || facts.energyKcal === null || facts.energyKcal === 0) return null;
  return Math.abs(computed - facts.energyKcal) / facts.energyKcal;
}

// --------------------------------------------------------------- basis change

export const SCALED_FIELDS = [
  'energyKJ',
  'energyKcal',
  'fatG',
  'saturatesG',
  'carbohydrateG',
  'sugarsG',
  'fibreG',
  'proteinG',
  'saltG',
  'sodiumMg',
] as const;

/**
 * Rescale a per-serving panel to per 100 g.
 *
 * Returns null when the serving size is unknown - we do not estimate it, and a
 * traffic light computed from an estimated serving would be a fabricated claim.
 */
export function toPer100(facts: NutritionFacts): NutritionFacts | null {
  if (facts.basis === 'per-100g' || facts.basis === 'per-100ml') return facts;
  if (facts.servingSizeG === null || facts.servingSizeG <= 0) return null;

  const factor = 100 / facts.servingSizeG;
  const out: NutritionFacts = { ...facts, basis: 'per-100g', servingSizeG: 100 };
  for (const field of SCALED_FIELDS) {
    const value = facts[field];
    out[field] = value === null ? null : value * factor;
  }
  return out;
}

/** Pick the panel published on a given basis, if there is one. */
export function pickBasis(
  panels: readonly NutritionFacts[],
  basis: NutritionFacts['basis'],
): NutritionFacts | undefined {
  return panels.find((p) => p.basis === basis);
}

/**
 * The per-100 panel for a variant: the published one if there is one, otherwise
 * derived from the per-serving panel. Null when neither is possible.
 */
export function resolvePer100(panels: readonly NutritionFacts[]): NutritionFacts | null {
  const published = pickBasis(panels, 'per-100g') ?? pickBasis(panels, 'per-100ml');
  if (published) return published;
  const serving = pickBasis(panels, 'per-serving');
  return serving ? toPer100(serving) : null;
}

// ------------------------------------------------------------- traffic lights

const NUTRIENT_FIELD: Record<FsaNutrient, keyof NutritionFacts> = {
  fat: 'fatG',
  saturates: 'saturatesG',
  sugars: 'sugarsG',
  salt: 'saltG',
};

function valueOf(facts: NutritionFacts, nutrient: FsaNutrient): number | null {
  if (nutrient === 'salt') return resolveSaltG(facts);
  const raw = facts[NUTRIENT_FIELD[nutrient]];
  return typeof raw === 'number' ? raw : null;
}

export type BandResult = {
  nutrient: FsaNutrient;
  band: FsaBand;
  per100: number;
  perPortion: number | null;
  /** True when the per-portion rule, not the per-100 value, drove it to HIGH. */
  drivenByPortion: boolean;
  thresholds: { lowMax: number; highMin: number; portionHigh: number };
};

/**
 * FSA front-of-pack band for one nutrient.
 *
 * Boundary semantics, which is where this gets got wrong:
 *   value <= lowMax          -> LOW
 *   value >  highMin         -> HIGH
 *   anything between         -> MEDIUM
 * So a value exactly equal to highMin is MEDIUM, not HIGH.
 *
 * The per-portion rule is an escalation only, applied when the portion is
 * larger than `portionAppliesAboveG`. It can push a band up to HIGH; it can
 * never pull one down.
 */
export function bandFor(
  nutrient: FsaNutrient,
  per100Facts: NutritionFacts,
  servingFacts: NutritionFacts | null,
  isDrink: boolean,
  thresholds: FsaThresholds,
): BandResult | null {
  const per100 = valueOf(per100Facts, nutrient);
  if (per100 === null) return null;

  const limits = isDrink ? thresholds.drink.per100ml[nutrient] : thresholds.food.per100g[nutrient];
  const portionHigh = (isDrink ? thresholds.drink : thresholds.food).perPortionHigh[nutrient];

  let band: FsaBand = per100 <= limits.lowMax ? 'low' : per100 > limits.highMin ? 'high' : 'medium';

  const portionSize = servingFacts?.servingSizeG ?? null;
  const perPortion = servingFacts ? valueOf(servingFacts, nutrient) : null;

  let drivenByPortion = false;
  if (
    portionSize !== null &&
    portionSize > thresholds.portionAppliesAboveG &&
    perPortion !== null &&
    perPortion > portionHigh &&
    band !== 'high'
  ) {
    band = 'high';
    drivenByPortion = true;
  }

  return {
    nutrient,
    band,
    per100,
    perPortion,
    drivenByPortion,
    thresholds: { lowMax: limits.lowMax, highMin: limits.highMin, portionHigh },
  };
}

// ---------------------------------------------------------- reference intakes

const RI_FIELD = {
  energyKcal: 'energyKcal',
  fatG: 'fatG',
  saturatesG: 'saturatesG',
  carbohydrateG: 'carbohydrateG',
  sugarsG: 'sugarsG',
  proteinG: 'proteinG',
  saltG: 'saltG',
} as const;

export type RiKey = keyof typeof RI_FIELD;

/**
 * Percentage of the adult reference intake. Presented neutrally, as a number
 * next to an arc. Never phrased as a budget the reader has spent.
 */
export function referenceIntakePercent(
  facts: NutritionFacts,
  key: RiKey,
  ri: ReferenceIntakes,
): number | null {
  const value = key === 'saltG' ? resolveSaltG(facts) : facts[RI_FIELD[key]];
  if (typeof value !== 'number') return null;
  const reference = ri[key];
  if (reference <= 0) return null;
  return (value / reference) * 100;
}
