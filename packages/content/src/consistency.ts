import type { NutritionFacts } from './schemas/nutrition.js';

/**
 * Whether a published panel agrees with itself.
 *
 * This is not a judgement about a company and it is not our opinion. It is
 * arithmetic on figures the company printed, and a reader can redo every line
 * of it with the same numbers on the same page. That distinction is the whole
 * licence for showing it: we are not asserting that a figure is wrong, we are
 * showing that two figures in one panel cannot both be right.
 *
 * It is DERIVED, never stored. Storing it would mean a flag that can drift away
 * from the data it describes, and a chain imported before the check existed
 * would never acquire one. Computed at render time it applies to everything the
 * repo holds, retroactively and permanently.
 *
 * Note what it deliberately does NOT do: it never says which figure is wrong.
 * When energy and macronutrients disagree, either could be the error, and
 * picking one would be inventing a fact to explain another.
 */

export type ConsistencyFinding =
  | {
      kind: 'energy-mismatch';
      /** kcal the panel states. */
      stated: number;
      /** kcal its own fat, carbohydrate and protein come to. */
      implied: number;
      /** Signed, as a percentage of the stated figure. */
      deviationPercent: number;
    }
  | { kind: 'saturates-exceeds-fat'; saturates: number; fat: number }
  | { kind: 'sugars-exceed-carbohydrate'; sugars: number; carbohydrate: number };

/**
 * Atwater factors: 9 kcal per gram of fat, 4 per gram of carbohydrate and of
 * protein. Fibre is left out because regimes differ on whether it counts and by
 * how much, and including it either way would make this check an opinion.
 */
const KCAL_PER_G = { fat: 9, carbohydrate: 4, protein: 4 } as const;

/**
 * How far apart the two may be before it stops being rounding.
 *
 * Both a proportion AND an absolute floor have to be exceeded. Proportion alone
 * fails small items - a 16 kcal portion of jalapeños is 95% out on rounding
 * alone and means nothing. An absolute floor alone would let a 1,500 kcal
 * platter drift by 300 unremarked.
 */
const TOLERANCE_FRACTION = 0.2;
const TOLERANCE_KCAL = 40;

export function panelConsistency(panel: NutritionFacts): ConsistencyFinding[] {
  const findings: ConsistencyFinding[] = [];

  const { energyKcal, fatG, carbohydrateG, proteinG, saturatesG, sugarsG } = panel;

  if (
    energyKcal !== null &&
    energyKcal > 0 &&
    fatG !== null &&
    carbohydrateG !== null &&
    proteinG !== null
  ) {
    const implied =
      KCAL_PER_G.fat * fatG +
      KCAL_PER_G.carbohydrate * carbohydrateG +
      KCAL_PER_G.protein * proteinG;
    const gap = Math.abs(implied - energyKcal);
    if (gap > TOLERANCE_KCAL && gap / energyKcal > TOLERANCE_FRACTION) {
      findings.push({
        kind: 'energy-mismatch',
        stated: energyKcal,
        implied: Math.round(implied),
        deviationPercent: Math.round(((implied - energyKcal) / energyKcal) * 100),
      });
    }
  }

  /*
   * These two are read off `sourceContradictions` rather than recomputed. The
   * schema refuses an impossible panel unless the contradiction is declared, so
   * by the time a panel is loaded the flag IS the record that somebody read the
   * document and found it there.
   */
  const declared = new Set(panel.sourceContradictions);
  if (declared.has('saturates-exceeds-fat') && saturatesG !== null && fatG !== null) {
    findings.push({ kind: 'saturates-exceeds-fat', saturates: saturatesG, fat: fatG });
  }
  if (declared.has('sugars-exceed-carbohydrate') && sugarsG !== null && carbohydrateG !== null) {
    findings.push({
      kind: 'sugars-exceed-carbohydrate',
      sugars: sugarsG,
      carbohydrate: carbohydrateG,
    });
  }

  return findings;
}
