import { z } from 'zod';

/**
 * A published nutrition panel, transcribed.
 *
 * Every field is nullable and null is a first-class answer meaning "the company
 * does not publish this". It is never a placeholder for a value we could work
 * out. Do not derive, interpolate or convert on the way in - the display layer
 * converts, and says which constant it used.
 */
export const NutritionFactsSchema = z
  .object({
    basis: z.enum(['per-serving', 'per-100g', 'per-100ml']),
    servingSizeG: z.number().positive().nullable(),
    energyKJ: z.number().nonnegative().nullable(),
    energyKcal: z.number().nonnegative().nullable(),
    fatG: z.number().nonnegative().nullable(),
    saturatesG: z.number().nonnegative().nullable(),
    /*
     * transFatG and addedSugarsG are here because the panels carry them and
     * dropping a published figure is a decision, not a default.
     *
     * Added sugars in particular is the single most editorially useful number
     * on an American panel: it is the only one that separates sugar that came
     * with the food from sugar the company put in, and it is the reason a
     * savoury-sounding item can be shown to carry more of it than a soft drink.
     * The importer parsed both from the start and threw them away, because the
     * schema was strict and did not carry them.
     *
     * They stay nullable and stay null where the market does not publish them.
     * Canada's panels give trans fat and no added sugars; that asymmetry is a
     * fact about the two disclosure regimes and must not be smoothed over by
     * deriving one from the other.
     */
    transFatG: z.number().nonnegative().nullable(),
    carbohydrateG: z.number().nonnegative().nullable(),
    sugarsG: z.number().nonnegative().nullable(),
    addedSugarsG: z.number().nonnegative().nullable(),
    fibreG: z.number().nonnegative().nullable(),
    proteinG: z.number().nonnegative().nullable(),
    saltG: z.number().nonnegative().nullable(),
    sodiumMg: z.number().nonnegative().nullable(),
    /*
     * Contradictions THE SOURCE ITSELF PRINTS, named one at a time.
     *
     * The checks below exist to catch our transcription errors, and they must
     * stay hard for that. But a company can publish an impossible panel, and
     * when it does, the impossibility is the story - Burger King ČR states 58 g
     * of fat and 62 g of saturates for the same product, in the document it
     * serves today as its current nutrition information. Refusing to record
     * that would be hiding a company's mistake behind our own validator.
     *
     * The escape is deliberately awkward. It names the specific check being
     * overridden, so it cannot blanket-disable anything; and naming a check
     * that is NOT actually contradicted is itself an error, so it cannot be
     * pasted in defensively "just in case". Setting one is a claim: we read
     * this, it really says this, and here it is.
     */
    sourceContradictions: z
      .array(z.enum(['saturates-exceeds-fat', 'sugars-exceed-carbohydrate']))
      .default([]),
  })
  .strict()
  .superRefine((n, ctx) => {
    const declared = new Set(n.sourceContradictions);
    const satOverFat = n.saturatesG !== null && n.fatG !== null && n.saturatesG > n.fatG;
    const sugarOverCarb =
      n.sugarsG !== null && n.carbohydrateG !== null && n.sugarsG > n.carbohydrateG;

    // A declared contradiction that is not there is a lie in the other
    // direction, and would let the flag be pasted everywhere pre-emptively.
    if (declared.has('saturates-exceeds-fat') && !satOverFat) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sourceContradictions'],
        message: 'declares "saturates-exceeds-fat" but saturates do not exceed fat',
      });
    }
    if (declared.has('sugars-exceed-carbohydrate') && !sugarOverCarb) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sourceContradictions'],
        message: 'declares "sugars-exceed-carbohydrate" but sugars do not exceed carbohydrate',
      });
    }

    // Hard failures unless the source is on record as printing them: these are
    // not "unusual products", they are transcription errors. A food cannot
    // contain more saturated fat than fat.
    if (satOverFat && !declared.has('saturates-exceeds-fat')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['saturatesG'],
        message: `saturates (${n.saturatesG} g) exceeds total fat (${n.fatG} g)`,
      });
    }
    if (sugarOverCarb && !declared.has('sugars-exceed-carbohydrate')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sugarsG'],
        message: `sugars (${n.sugarsG} g) exceeds carbohydrate (${n.carbohydrateG} g)`,
      });
    }
    // Same shape of impossibility for the two components: each is a named part
    // of the total above it, so neither can be larger than what contains it.
    // They are checked separately rather than summed - published panels round
    // each row on its own, and a sum that lands a tenth over is rounding, not a
    // transcription error.
    if (n.transFatG !== null && n.fatG !== null && n.transFatG > n.fatG) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['transFatG'],
        message: `trans fat (${n.transFatG} g) exceeds total fat (${n.fatG} g)`,
      });
    }
    if (n.addedSugarsG !== null && n.sugarsG !== null && n.addedSugarsG > n.sugarsG) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['addedSugarsG'],
        message: `added sugars (${n.addedSugarsG} g) exceeds total sugars (${n.sugarsG} g)`,
      });
    }
    /*
     * A per-serving panel WITHOUT a serving size is allowed, and used to not be.
     *
     * The rule was right about the consequence and wrong about what to do with
     * it. Without a weight there is no per-100 g figure and therefore no traffic
     * light - true - but that is a reason to show no bands, not a reason to
     * refuse the data. McDonald's USA publishes calories, fat, sugars and sodium
     * per portion and no weight at all; rejecting that means the site holds
     * nothing about the largest chain in its largest market.
     *
     * The display layer already degrades correctly on its own: toPer100 returns
     * null without a serving size, and bandFor returns null on a null per-100.
     * So the honest outcome - figures shown, bands absent, and the page saying
     * why - was already reachable and only the schema stood in the way.
     */
  });

export type NutritionFacts = z.infer<typeof NutritionFactsSchema>;

/** The four nutrients the FSA front-of-pack scheme covers. */
export const FSA_NUTRIENTS = ['fat', 'saturates', 'sugars', 'salt'] as const;
export type FsaNutrient = (typeof FSA_NUTRIENTS)[number];

export type FsaBand = 'low' | 'medium' | 'high';
