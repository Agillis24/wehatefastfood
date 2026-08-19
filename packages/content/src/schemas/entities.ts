import { z } from 'zod';
import { COUNTRY, MARKET, SLUG, SourceSchema } from './source.js';
import { AllergenSchema, allergenParent } from './allergens.js';
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
/**
 * One named part of a product, with the ingredient statement as the company
 * printed it.
 *
 * VERBATIM, and that is the point. The alternative - splitting a declaration
 * into entities with their own records - means deciding where "Enriched Flour
 * (bleached Wheat Flour, Niacin, Reduced Iron)" stops being one ingredient and
 * starts being four, and every one of those decisions is ours rather than the
 * source's. docs/CONTENT_GUIDE.md says copy, do not interpret. A transcription
 * is a fact we can stand behind today; a taxonomy is a project.
 *
 * It also means the reader sees what is on the label rather than our summary of
 * it, which for the one question this site exists to answer is the whole thing.
 *
 * COMPONENTS RATHER THAN ONE BLOB because that is how the declarations arrive
 * and because it carries real information: McDonald's prints the biscuit, the
 * egg, the cheese and the sauce separately, and knowing that the 7 g of added
 * sugar is in the sauce and not the bread is exactly the kind of thing a reader
 * cannot work out from a merged list.
 */
export const ComponentSchema = z
  .object({
    /** As printed: "Biscuit", "Folded Egg", "Burger Bun". */
    name: z.string().min(1),
    /** The ingredient statement, transcribed. Never summarised or reordered. */
    declaration: z.string().min(1),
    /**
     * Allergens declared for THIS component. Kept per component rather than
     * rolled up, because a reader avoiding milk needs to know it is the cheese
     * and not the bun.
     */
    allergens: z.array(AllergenSchema).default([]),
    mayContain: z.array(AllergenSchema).default([]),
  })
  .strict();

export type Component = z.infer<typeof ComponentSchema>;

export const MarketVariantSchema = z
  .object({
    market: MARKET,
    nutrition: z.array(NutritionFactsSchema).min(1),
    /*
     * The declaration, as published. `ingredientRefs` and `additiveRefs` below
     * are the DECODER links - the substances we have written an entry for - and
     * are a strict subset of what these components name. One is the record, the
     * other is what we can explain so far.
     */
    components: z.array(ComponentSchema).default([]),
    ingredientRefs: z.array(SLUG),
    additiveRefs: z.array(SLUG),
    /*
     * DECLARED allergens: named in the recipe. Not the same claim as
     * `mayContain`, and the two are never merged - see below.
     */
    allergens: z.array(AllergenSchema),
    /*
     * Allergens that MAY be present, from shared equipment or a shared kitchen.
     * Czech menus print this as "MO", against "A" for declared.
     *
     * Folding this into `allergens` would turn a cross-contamination warning
     * into an ingredient. For a reader with a mild intolerance that is a meal
     * needlessly refused; for a reader who learns the site overstates, it is a
     * reason to stop believing the declared list too - which is the list that
     * matters most.
     */
    mayContain: z.array(AllergenSchema).default([]),
    sources: z.array(SourceSchema).min(1),
    verifiedOn: z.string().date(),
    status: DataStatus,
  })
  .strict()
  .superRefine((v, ctx) => {
    /*
     * An allergen cannot be both declared and merely possible. A source saying
     * both is a source we have misread, and the safe-looking resolution - keep
     * the stronger claim - would hide the misreading.
     */
    const declared = new Set<string>(v.allergens);
    for (const a of v.mayContain) {
      if (declared.has(a)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['mayContain'],
          message: `"${a}" is both declared and listed as possible traces`,
        });
      }
    }
    /*
     * Nor may a category and one of its own members sit in the same list. "Nuts
     * and hazelnuts" is not two facts; it is one fact recorded twice at two
     * different precisions, and it makes any count of allergens wrong.
     */
    for (const list of [v.allergens, v.mayContain]) {
      for (const a of list) {
        const p = allergenParent(a);
        if (p !== a && list.includes(p)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['allergens'],
            message: `"${a}" is listed alongside its own category "${p}"`,
          });
        }
      }
    }

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
