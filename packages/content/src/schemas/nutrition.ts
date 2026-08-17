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
    carbohydrateG: z.number().nonnegative().nullable(),
    sugarsG: z.number().nonnegative().nullable(),
    fibreG: z.number().nonnegative().nullable(),
    proteinG: z.number().nonnegative().nullable(),
    saltG: z.number().nonnegative().nullable(),
    sodiumMg: z.number().nonnegative().nullable(),
  })
  .strict()
  .superRefine((n, ctx) => {
    // Hard failures: these are not "unusual products", they are transcription
    // errors. A food cannot contain more saturated fat than fat.
    if (n.saturatesG !== null && n.fatG !== null && n.saturatesG > n.fatG) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['saturatesG'],
        message: `saturates (${n.saturatesG} g) exceeds total fat (${n.fatG} g)`,
      });
    }
    if (n.sugarsG !== null && n.carbohydrateG !== null && n.sugarsG > n.carbohydrateG) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sugarsG'],
        message: `sugars (${n.sugarsG} g) exceeds carbohydrate (${n.carbohydrateG} g)`,
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
