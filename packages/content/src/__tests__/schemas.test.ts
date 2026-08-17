import { describe, expect, it } from 'vitest';
import {
  AdditiveSchema,
  ChainSchema,
  MarketVariantSchema,
  MenuItemSchema,
} from '../schemas/entities.js';
import { NutritionFactsSchema } from '../schemas/nutrition.js';
import { toPer100 } from '../nutrition.js';
import { SourceSchema, hasIndependentSources } from '../schemas/source.js';

/**
 * Every rule in docs/PLAN.md §6 gets a passing fixture and a failing one.
 * A validator nobody has watched fail is a validator nobody knows works.
 */

const source = (over: Record<string, unknown> = {}) => ({
  title: 'Example',
  publisher: 'Example Publisher',
  url: 'https://example.invalid/x',
  retrievedOn: '2026-08-14',
  type: 'company-disclosure',
  ...over,
});

const panel = (over: Record<string, unknown> = {}) => ({
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

describe('Source', () => {
  it('accepts a complete source', () => {
    expect(SourceSchema.safeParse(source()).success).toBe(true);
  });

  it('rejects a malformed URL', () => {
    expect(SourceSchema.safeParse(source({ url: 'not-a-url' })).success).toBe(false);
  });

  it('rejects a document published after we read it', () => {
    const bad = source({ retrievedOn: '2026-01-01', publishedOn: '2026-06-01' });
    expect(SourceSchema.safeParse(bad).success).toBe(false);
  });

  it('counts independence by publisher, so the same one twice is one source', () => {
    const twice = [source(), source({ title: 'Other' })].map((s) => SourceSchema.parse(s));
    expect(hasIndependentSources(twice, 2)).toBe(false);

    const two = [source(), source({ publisher: 'Someone Else' })].map((s) => SourceSchema.parse(s));
    expect(hasIndependentSources(two, 2)).toBe(true);
  });
});

describe('NutritionFacts', () => {
  it('accepts nulls as a first-class "not published"', () => {
    expect(NutritionFactsSchema.safeParse(panel()).success).toBe(true);
  });

  it('rejects saturates above total fat', () => {
    expect(NutritionFactsSchema.safeParse(panel({ fatG: 5, saturatesG: 6 })).success).toBe(false);
    expect(NutritionFactsSchema.safeParse(panel({ fatG: 5, saturatesG: 5 })).success).toBe(true);
  });

  it('rejects sugars above carbohydrate', () => {
    expect(NutritionFactsSchema.safeParse(panel({ carbohydrateG: 10, sugarsG: 11 })).success).toBe(
      false,
    );
  });

  /*
   * This asserted the opposite until McDonald's USA turned up: it publishes
   * figures per portion and no weight at all, and refusing that means holding
   * nothing about the largest chain in its largest market.
   *
   * Without a weight there is no per-100 g figure and therefore no traffic
   * light - which is a reason to show no bands, not a reason to reject the
   * data. The layers below already do the right thing on their own, so the
   * schema was the only thing standing in the way.
   */
  it('accepts a per-serving panel with no serving size, because sources do that', () => {
    expect(
      NutritionFactsSchema.safeParse(panel({ basis: 'per-serving', servingSizeG: null })).success,
    ).toBe(true);
  });

  it('and then nothing can be computed per 100 g, which is the honest outcome', () => {
    const parsed = NutritionFactsSchema.parse(panel({ basis: 'per-serving', servingSizeG: null }));
    expect(toPer100(parsed)).toBeNull();
  });

  it('rejects negative quantities', () => {
    expect(NutritionFactsSchema.safeParse(panel({ fatG: -1 })).success).toBe(false);
  });

  it('rejects unknown fields, so a typo cannot silently vanish', () => {
    expect(NutritionFactsSchema.safeParse({ ...panel(), sugarG: 5 }).success).toBe(false);
  });
});

describe('MarketVariant', () => {
  const variant = (over: Record<string, unknown> = {}) => ({
    market: 'GB',
    nutrition: [panel()],
    ingredientRefs: [],
    additiveRefs: [],
    allergens: [],
    sources: [source()],
    verifiedOn: '2026-08-14',
    status: 'partial',
    ...over,
  });

  it('accepts a minimal variant', () => {
    expect(MarketVariantSchema.safeParse(variant()).success).toBe(true);
  });

  it('requires at least one source', () => {
    expect(MarketVariantSchema.safeParse(variant({ sources: [] })).success).toBe(false);
  });

  it('rejects a lowercase market code', () => {
    expect(MarketVariantSchema.safeParse(variant({ market: 'gb' })).success).toBe(false);
  });

  it('rejects an "unpublished" variant that nonetheless carries figures', () => {
    const lying = variant({ status: 'unpublished', nutrition: [panel({ fatG: 12 })] });
    expect(MarketVariantSchema.safeParse(lying).success).toBe(false);

    const honest = variant({ status: 'unpublished', nutrition: [panel()] });
    expect(MarketVariantSchema.safeParse(honest).success).toBe(true);
  });

  it('rejects two panels on the same basis', () => {
    expect(MarketVariantSchema.safeParse(variant({ nutrition: [panel(), panel()] })).success).toBe(
      false,
    );
  });
});

describe('MenuItem and Chain', () => {
  const item = (over: Record<string, unknown> = {}) => ({
    slug: 'example-item',
    chainSlug: 'example-chain',
    name: 'Example',
    category: 'burger',
    variants: [
      {
        market: 'GB',
        nutrition: [panel()],
        ingredientRefs: [],
        additiveRefs: [],
        allergens: [],
        sources: [source()],
        verifiedOn: '2026-08-14',
        status: 'partial',
      },
    ],
    ...over,
  });

  it('rejects a non-kebab-case slug, because slugs are permanent URLs', () => {
    for (const slug of ['Example_Item', 'example item', 'example--item', '-example', 'example-']) {
      expect(MenuItemSchema.safeParse(item({ slug })).success).toBe(false);
    }
    expect(MenuItemSchema.safeParse(item({ slug: 'example-item-2' })).success).toBe(true);
  });

  it('rejects two variants for the same market', () => {
    const base = item();
    const dup = item({ variants: [base.variants[0], base.variants[0]] });
    expect(MenuItemSchema.safeParse(dup).success).toBe(false);
  });

  it('constrains accentToken to our own rotation, never a brand colour', () => {
    const chain = (accentToken: string) => ({
      slug: 'example-chain',
      name: 'Example',
      marketsCovered: ['GB'],
      oneLiner: 'x',
      longIntro: 'x',
      accentToken,
      dataStatus: 'unpublished',
      sources: [source()],
    });
    expect(ChainSchema.safeParse(chain('accent-1')).success).toBe(true);
    expect(ChainSchema.safeParse(chain('#FFC72C')).success).toBe(false);
    expect(ChainSchema.safeParse(chain('brand-yellow')).success).toBe(false);
  });
});

describe('Additive', () => {
  const additive = (over: Record<string, unknown> = {}) => ({
    slug: 'e621-example',
    eNumber: 'E621',
    names: ['Example'],
    functionalClass: ['flavour-enhancer'],
    whatItIs: 'x',
    whyItIsInYourFood: 'x',
    evidenceSummary: 'x',
    evidenceStrength: 'mixed',
    regulatoryStatus: { eu: 'x', us: 'x', uk: 'x' },
    notableDivergence: null,
    sources: [source(), source({ publisher: 'Other' })],
    ...over,
  });

  it('requires two sources', () => {
    expect(AdditiveSchema.safeParse(additive()).success).toBe(true);
    expect(AdditiveSchema.safeParse(additive({ sources: [source()] })).success).toBe(false);
  });

  it('accepts a null E-number for an additive that has none', () => {
    expect(AdditiveSchema.safeParse(additive({ eNumber: null })).success).toBe(true);
  });

  it('rejects a malformed E-number', () => {
    expect(AdditiveSchema.safeParse(additive({ eNumber: '621' })).success).toBe(false);
    expect(AdditiveSchema.safeParse(additive({ eNumber: 'E1442' })).success).toBe(false);
    expect(AdditiveSchema.safeParse(additive({ eNumber: 'E160a' })).success).toBe(true);
  });
});
