import { z } from 'zod';
import { COUNTRY, MARKET, SLUG, SourceSchema } from './source.js';
import { NutritionFactsSchema } from './nutrition.js';

const DataStatus = z.enum(['verified', 'partial', 'unpublished']);

/**
 * Accent tokens are a fixed rotation of OUR colours, assigned by slug hash.
 *
 * Constrained to an enum on purpose. A free string invites someone to reach for
 * the company's own brand colour, and a per-chain accent that happens to match
 * their identity is trade dress however we label the variable. See docs/LEGAL.md.
 */
export const ACCENT_TOKENS = ['accent-1', 'accent-2', 'accent-3', 'accent-4'] as const;

export const ChainSchema = z
  .object({
    slug: SLUG,
    name: z.string().min(1),
    foundedYear: z.number().int().min(1800).max(2100).optional(),
    hqCountry: COUNTRY.optional(),
    marketsCovered: z.array(MARKET).min(1),
    oneLiner: z.string().min(1).max(140),
    longIntro: z.string().min(1),
    accentToken: z.enum(ACCENT_TOKENS),
    dataStatus: DataStatus,
    sources: z.array(SourceSchema).min(1),
  })
  .strict();

export type Chain = z.infer<typeof ChainSchema>;

/**
 * The same product is formulated differently per market. That is one of the
 * most interesting stories this site can tell, so it is first-class from day one.
 */
export const MarketVariantSchema = z
  .object({
    market: MARKET,
    nutrition: z.array(NutritionFactsSchema).min(1),
    ingredientRefs: z.array(SLUG),
    additiveRefs: z.array(SLUG),
    allergens: z.array(z.string().min(1)),
    sources: z.array(SourceSchema).min(1),
    verifiedOn: z.string().date(),
    status: DataStatus,
  })
  .strict()
  .superRefine((v, ctx) => {
    // The rule that protects the whole project: an "unpublished" variant must
    // not carry figures. If it has numbers, it is not unpublished.
    if (v.status === 'unpublished') {
      // servingSizeG is a portion size, not a nutrition figure. Knowing that a
      // product weighs 250 g while its panel is unpublished is perfectly honest.
      const NOT_A_FIGURE = new Set(['basis', 'servingSizeG']);
      const hasFigures = v.nutrition.some((n) =>
        Object.entries(n).some(
          ([key, value]) => !NOT_A_FIGURE.has(key) && typeof value === 'number' && value > 0,
        ),
      );
      if (hasFigures) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['status'],
          message: 'status is "unpublished" but the variant carries figures - one of them is a lie',
        });
      }
    }
    const bases = v.nutrition.map((n) => n.basis);
    if (new Set(bases).size !== bases.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['nutrition'],
        message: `duplicate nutrition basis: ${bases.join(', ')}`,
      });
    }
  });

export type MarketVariant = z.infer<typeof MarketVariantSchema>;

export const MenuItemSchema = z
  .object({
    slug: SLUG,
    chainSlug: SLUG,
    name: z.string().min(1),
    category: z.enum([
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
    ]),
    ourTake: z.string().min(1).optional(),
    variants: z.array(MarketVariantSchema).min(1),
    illustration: z.string().min(1).optional(),
  })
  .strict()
  .superRefine((item, ctx) => {
    const markets = item.variants.map((v) => v.market);
    if (new Set(markets).size !== markets.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['variants'],
        message: `duplicate market variant: ${markets.join(', ')}`,
      });
    }
  });

export type MenuItem = z.infer<typeof MenuItemSchema>;

export const FUNCTIONAL_CLASSES = [
  'preservative',
  'emulsifier',
  'stabiliser',
  'colour',
  'flavour-enhancer',
  'sweetener',
  'acidity-regulator',
  'anticaking',
  'antioxidant',
  'raising-agent',
  'thickener',
  'humectant',
  'other',
] as const;

export const AdditiveSchema = z
  .object({
    slug: SLUG,
    eNumber: z
      .string()
      .regex(/^E\d{3}[a-z]?(\([iv]+\))?$/i, 'E-number looks malformed')
      .nullable(),
    names: z.array(z.string().min(1)).min(1),
    functionalClass: z.array(z.enum(FUNCTIONAL_CLASSES)).min(1),
    whatItIs: z.string().min(1),
    whyItIsInYourFood: z.string().min(1),
    evidenceSummary: z.string().min(1),
    evidenceStrength: z.enum(['well-established', 'mixed', 'emerging', 'contested']),
    regulatoryStatus: z
      .object({ eu: z.string().min(1), us: z.string().min(1), uk: z.string().min(1) })
      .strict(),
    notableDivergence: z.string().min(1).nullable(),
    // Two, and the graph check additionally requires two DIFFERENT publishers.
    sources: z.array(SourceSchema).min(2),
  })
  .strict();

export type Additive = z.infer<typeof AdditiveSchema>;

export const IngredientSchema = z
  .object({
    slug: SLUG,
    names: z.array(z.string().min(1)).min(1),
    whatItIs: z.string().min(1),
    whyItIsInYourFood: z.string().min(1).optional(),
    isAdditive: z.literal(false).default(false),
    sources: z.array(SourceSchema).min(1),
  })
  .strict();

export type Ingredient = z.infer<typeof IngredientSchema>;
