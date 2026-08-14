import { describe, expect, it } from 'vitest';
import {
  ATWATER,
  SODIUM_MG_PER_SALT_G,
  atwaterKcal,
  bandFor,
  energyDiscrepancy,
  pickBasis,
  referenceIntakePercent,
  resolvePer100,
  resolveSaltG,
  saltGFromSodiumMg,
  saltSodiumDisagreement,
  sodiumMgFromSaltG,
  toPer100,
} from '../nutrition.js';
import type { NutritionFacts } from '../schemas/nutrition.js';
import type { FsaThresholds, ReferenceIntakes } from '../schemas/reference.js';

const facts = (over: Partial<NutritionFacts> = {}): NutritionFacts => ({
  basis: 'per-100g',
  servingSizeG: 100,
  energyKJ: null,
  energyKcal: null,
  fatG: null,
  saturatesG: null,
  carbohydrateG: null,
  sugarsG: null,
  fibreG: null,
  proteinG: null,
  saltG: null,
  sodiumMg: null,
  ...over,
});

/**
 * Synthetic thresholds with round numbers. The algorithm is tested here; the
 * real published values are third-party data and live in content/reference/,
 * where they carry a source and a verification status of their own.
 */
const T: FsaThresholds = {
  status: 'verified',
  note: 'test fixture',
  verifiedOn: '2026-01-01',
  sources: [
    {
      title: 'fixture',
      publisher: 'fixture',
      url: 'https://example.invalid/fixture',
      retrievedOn: '2026-01-01',
      type: 'regulator',
    },
  ],
  portionAppliesAboveG: 100,
  food: {
    per100g: {
      fat: { lowMax: 3, highMin: 17.5 },
      saturates: { lowMax: 1.5, highMin: 5 },
      sugars: { lowMax: 5, highMin: 22.5 },
      salt: { lowMax: 0.3, highMin: 1.5 },
    },
    perPortionHigh: { fat: 21, saturates: 6, sugars: 27, salt: 1.8 },
  },
  drink: {
    per100ml: {
      fat: { lowMax: 1.5, highMin: 8.75 },
      saturates: { lowMax: 0.75, highMin: 2.5 },
      sugars: { lowMax: 2.5, highMin: 11.25 },
      salt: { lowMax: 0.3, highMin: 0.75 },
    },
    perPortionHigh: { fat: 10.5, saturates: 3, sugars: 13.5, salt: 0.9 },
  },
};

describe('salt and sodium', () => {
  it('uses the EU regulatory constant, not the chemical one', () => {
    // salt = sodium x 2.5, so 1 g salt is 400 mg sodium. The chemical ratio is
    // 393.4; we deliberately use the constant the labels were computed with.
    expect(SODIUM_MG_PER_SALT_G).toBe(400);
    expect(sodiumMgFromSaltG(1)).toBe(400);
    expect(saltGFromSodiumMg(400)).toBe(1);
  });

  it('round-trips', () => {
    expect(saltGFromSodiumMg(sodiumMgFromSaltG(2.3))).toBeCloseTo(2.3, 10);
  });

  it('prefers declared salt, falls back to sodium, never guesses', () => {
    expect(resolveSaltG(facts({ saltG: 1.2, sodiumMg: 999 }))).toBe(1.2);
    expect(resolveSaltG(facts({ sodiumMg: 800 }))).toBe(2);
    expect(resolveSaltG(facts())).toBeNull();
  });

  it('flags a declared pair that disagrees beyond tolerance', () => {
    expect(saltSodiumDisagreement(facts({ saltG: 1, sodiumMg: 400 }))).toBeNull();
    expect(saltSodiumDisagreement(facts({ saltG: 1, sodiumMg: 415 }))).toBeNull(); // 3.75%, inside 5%
    const bad = saltSodiumDisagreement(facts({ saltG: 1, sodiumMg: 1000 }));
    expect(bad).not.toBeNull();
    expect(bad?.ratio).toBeCloseTo(2.5, 6);
  });
});

describe('Atwater energy check', () => {
  it('counts fibre separately, because EU carbohydrate excludes it', () => {
    expect(ATWATER).toEqual({
      proteinKcalPerG: 4,
      carbKcalPerG: 4,
      fatKcalPerG: 9,
      fibreKcalPerG: 2,
    });
    // 10*4 + 20*4 + 5*9 + 3*2 = 40 + 80 + 45 + 6
    expect(atwaterKcal(facts({ proteinG: 10, carbohydrateG: 20, fatG: 5, fibreG: 3 }))).toBe(171);
  });

  it('returns null rather than a partial guess when a macro is missing', () => {
    expect(atwaterKcal(facts({ proteinG: 10, carbohydrateG: 20 }))).toBeNull();
  });

  it('measures discrepancy against the declared energy', () => {
    const f = facts({ proteinG: 10, carbohydrateG: 20, fatG: 5, energyKcal: 165 });
    expect(energyDiscrepancy(f)).toBeCloseTo(0, 6);
    const off = facts({ proteinG: 10, carbohydrateG: 20, fatG: 5, energyKcal: 100 });
    expect(energyDiscrepancy(off)).toBeCloseTo(0.65, 6);
  });
});

describe('rescaling to per 100', () => {
  it('scales every field by the serving size', () => {
    const serving = facts({
      basis: 'per-serving',
      servingSizeG: 250,
      energyKcal: 700,
      fatG: 40,
      saltG: 2.5,
      sodiumMg: 1000,
    });
    const per100 = toPer100(serving);
    expect(per100?.basis).toBe('per-100g');
    expect(per100?.energyKcal).toBeCloseTo(280, 6);
    expect(per100?.fatG).toBeCloseTo(16, 6);
    expect(per100?.saltG).toBeCloseTo(1, 6);
    expect(per100?.sodiumMg).toBeCloseTo(400, 6);
  });

  it('refuses rather than estimating when the serving size is unknown', () => {
    expect(toPer100(facts({ basis: 'per-serving', servingSizeG: null, fatG: 10 }))).toBeNull();
  });

  it('leaves nulls null instead of turning them into zero', () => {
    const out = toPer100(facts({ basis: 'per-serving', servingSizeG: 50, fatG: 10 }));
    expect(out?.fatG).toBeCloseTo(20, 6);
    expect(out?.proteinG).toBeNull();
  });

  it('prefers a published per-100 panel over a derived one', () => {
    const published = facts({ basis: 'per-100g', fatG: 11 });
    const serving = facts({ basis: 'per-serving', servingSizeG: 200, fatG: 40 });
    expect(resolvePer100([serving, published])?.fatG).toBe(11);
    expect(pickBasis([serving, published], 'per-serving')).toBe(serving);
  });
});

describe('FSA bands - boundary behaviour', () => {
  const band = (per100Value: number) =>
    bandFor('saturates', facts({ saturatesG: per100Value }), null, false, T)?.band;

  it('treats a value exactly on lowMax as LOW', () => {
    expect(band(1.5)).toBe('low');
  });

  it('treats a value just above lowMax as MEDIUM', () => {
    expect(band(1.51)).toBe('medium');
  });

  it('treats a value exactly on highMin as MEDIUM, not HIGH', () => {
    // The guidance says "greater than", so the boundary itself is not HIGH.
    expect(band(5)).toBe('medium');
  });

  it('treats a value just above highMin as HIGH', () => {
    expect(band(5.01)).toBe('high');
  });

  it('uses drink thresholds for drinks', () => {
    const sugars = facts({ sugarsG: 10 });
    expect(bandFor('sugars', sugars, null, false, T)?.band).toBe('medium');
    // 10 g/100 ml is below the drink HIGH floor of 11.25 but well above LOW.
    expect(bandFor('sugars', sugars, null, true, T)?.band).toBe('medium');
    expect(bandFor('sugars', facts({ sugarsG: 12 }), null, true, T)?.band).toBe('high');
    expect(bandFor('sugars', facts({ sugarsG: 12 }), null, false, T)?.band).toBe('medium');
  });

  it('returns null when the nutrient is not published', () => {
    expect(bandFor('fat', facts(), null, false, T)).toBeNull();
  });

  it('derives salt from sodium when only sodium is declared', () => {
    const result = bandFor('salt', facts({ sodiumMg: 800 }), null, false, T);
    expect(result?.per100).toBe(2);
    expect(result?.band).toBe('high');
  });
});

describe('FSA bands - the per-portion escalation', () => {
  const serving = (over: Partial<NutritionFacts>) =>
    facts({ basis: 'per-serving', servingSizeG: 250, ...over });

  it('escalates to HIGH when a large portion exceeds the portion threshold', () => {
    // 16 g/100 g is MEDIUM, but 40 g in a 250 g portion is over the 21 g floor.
    const result = bandFor('fat', facts({ fatG: 16 }), serving({ fatG: 40 }), false, T);
    expect(result?.band).toBe('high');
    expect(result?.drivenByPortion).toBe(true);
  });

  it('never de-escalates a band that is already HIGH per 100 g', () => {
    const result = bandFor('fat', facts({ fatG: 30 }), serving({ fatG: 5 }), false, T);
    expect(result?.band).toBe('high');
    expect(result?.drivenByPortion).toBe(false);
  });

  it('does not apply the portion rule to portions at or below the cut-off', () => {
    const small = facts({ basis: 'per-serving', servingSizeG: 100, fatG: 40 });
    const result = bandFor('fat', facts({ fatG: 16 }), small, false, T);
    expect(result?.band).toBe('medium');
    expect(result?.drivenByPortion).toBe(false);
  });

  it('reports the thresholds it used so a reader can check the maths', () => {
    const result = bandFor('salt', facts({ saltG: 1 }), null, false, T);
    expect(result?.thresholds).toEqual({ lowMax: 0.3, highMin: 1.5, portionHigh: 1.8 });
  });
});

describe('reference intakes', () => {
  const RI: ReferenceIntakes = {
    status: 'verified',
    note: 'fixture',
    verifiedOn: '2026-01-01',
    sources: [
      {
        title: 'fixture',
        publisher: 'fixture',
        url: 'https://example.invalid/fixture',
        retrievedOn: '2026-01-01',
        type: 'regulator',
      },
    ],
    energyKJ: 8400,
    energyKcal: 2000,
    fatG: 70,
    saturatesG: 20,
    carbohydrateG: 260,
    sugarsG: 90,
    proteinG: 50,
    saltG: 6,
  };

  it('computes a plain percentage', () => {
    expect(referenceIntakePercent(facts({ energyKcal: 700 }), 'energyKcal', RI)).toBeCloseTo(35, 6);
    expect(referenceIntakePercent(facts({ saltG: 3 }), 'saltG', RI)).toBeCloseTo(50, 6);
  });

  it('derives salt from sodium here too', () => {
    expect(referenceIntakePercent(facts({ sodiumMg: 1200 }), 'saltG', RI)).toBeCloseTo(50, 6);
  });

  it('returns null for an unpublished value', () => {
    expect(referenceIntakePercent(facts(), 'fatG', RI)).toBeNull();
  });
});
