import { describe, expect, it } from 'vitest';

import { panelConsistency } from '../consistency.js';
import { NutritionFactsSchema } from '../schemas/nutrition.js';

const panel = (over: Record<string, unknown> = {}) =>
  NutritionFactsSchema.parse({
    basis: 'per-serving',
    servingSizeG: 200,
    energyKJ: null,
    energyKcal: null,
    fatG: null,
    saturatesG: null,
    transFatG: null,
    carbohydrateG: null,
    sugarsG: null,
    addedSugarsG: null,
    fibreG: null,
    proteinG: null,
    saltG: null,
    sodiumMg: null,
    ...over,
  });

describe('panelConsistency', () => {
  it('says nothing about a panel that adds up', () => {
    // McDonald's Big Breakfast, US: 48 g fat, 131 g carbohydrate, 26 g protein
    // comes to exactly the 1060 kcal it states. Its oddity is elsewhere.
    expect(
      panelConsistency(panel({ energyKcal: 1060, fatG: 48, carbohydrateG: 131, proteinG: 26 })),
    ).toEqual([]);
  });

  it('says nothing when a figure the check needs is missing', () => {
    expect(panelConsistency(panel({ energyKcal: 500, fatG: 20 }))).toEqual([]);
  });

  it('finds energy that its own macronutrients cannot account for', () => {
    // Burger King ČR, Double Whopper: 1506 kcal stated, 830 implied.
    const found = panelConsistency(
      panel({ energyKcal: 1506, fatG: 50, carbohydrateG: 50, proteinG: 45 }),
    );
    expect(found).toEqual([
      { kind: 'energy-mismatch', stated: 1506, implied: 830, deviationPercent: -45 },
    ]);
  });

  it('does not report rounding on a small portion', () => {
    // 16 kcal of jalapeños is 95% out on rounding alone, and means nothing.
    expect(
      panelConsistency(panel({ energyKcal: 16, fatG: 0, carbohydrateG: 0.1, proteinG: 0.1 })),
    ).toEqual([]);
  });

  it('does not report a large item drifting within tolerance', () => {
    // 1000 kcal stated against 1100 implied: 10%, and rounding across ten rows.
    expect(
      panelConsistency(panel({ energyKcal: 1000, fatG: 50, carbohydrateG: 100, proteinG: 62.5 })),
    ).toEqual([]);
  });

  it('needs BOTH thresholds crossed, not either', () => {
    // 30 kcal apart is 30% of 100 but under the absolute floor.
    expect(
      panelConsistency(panel({ energyKcal: 100, fatG: 0, carbohydrateG: 32.5, proteinG: 0 })),
    ).toEqual([]);
  });

  it('reports a component larger than its total, but only once the source is on record', () => {
    // Burger King ČR, Big King XXL: 58 g fat, 62 g saturates.
    const figures = { fatG: 58, saturatesG: 62 };

    // Undeclared, the schema refuses it outright - the panel cannot even exist.
    expect(NutritionFactsSchema.safeParse({ ...panel(), ...figures }).success).toBe(false);

    const declared = panel({ ...figures, sourceContradictions: ['saturates-exceeds-fat'] });
    expect(panelConsistency(declared)).toEqual([
      { kind: 'saturates-exceeds-fat', saturates: 62, fat: 58 },
    ]);
  });

  it('refuses a declared contradiction that is not in the figures', () => {
    // Otherwise the flag could be pasted in everywhere pre-emptively, and would
    // stop meaning "somebody read this and it really says so".
    expect(
      NutritionFactsSchema.safeParse({
        ...panel(),
        fatG: 20,
        saturatesG: 5,
        sourceContradictions: ['saturates-exceeds-fat'],
      }).success,
    ).toBe(false);
  });

  it('never says which of the two figures is the wrong one', () => {
    const found = panelConsistency(
      panel({ energyKcal: 878, fatG: 74, carbohydrateG: 106, proteinG: 66 }),
    );
    // Only the two numbers and the gap. Choosing a culprit would be inventing a
    // fact in order to explain another one.
    expect(found[0]).toMatchObject({ kind: 'energy-mismatch', stated: 878, implied: 1354 });
    expect(JSON.stringify(found)).not.toMatch(/wrong|error|incorrect/i);
  });
});
