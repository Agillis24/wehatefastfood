import { z } from 'zod';
import { SourceSchema } from './source.js';

/**
 * Regulatory reference data - FSA front-of-pack thresholds and EU reference
 * intakes.
 *
 * These live in content/reference/ rather than hard-coded in TypeScript,
 * because they are third-party published facts exactly like a nutrition panel
 * is. The project's rule applies to them too: sourced, dated, and carrying an
 * explicit verification status. A traffic light computed from an unverified
 * threshold is an unverified traffic light, and the UI has to say so.
 */

const Band = z
  .object({
    /**
     * Values at or below this are LOW. INCLUSIVE - the guidance prints the
     * green cell as "<= 3.0g/100g".
     */
    lowMax: z.number().positive(),
    /**
     * Values STRICTLY above this are HIGH. EXCLUSIVE - the guidance prints the
     * red cell as "> 17.5g/100g" and the amber band as "> 3.0g to <= 17.5g",
     * so a food at exactly 17.5 g fat per 100 g is AMBER, not red.
     *
     * The name reads like "the minimum value that counts as high", which is the
     * opposite of what the document says. It is kept because renaming a field
     * that decides whether a food shows red is a worse risk than the misleading
     * name, and because bandFor() and its tests pin the behaviour. Read the
     * operator, not the name. Verified against the source PDF on 2026-08-17.
     */
    highMin: z.number().positive(),
  })
  .strict()
  .superRefine((b, ctx) => {
    if (b.lowMax >= b.highMin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `lowMax (${b.lowMax}) must be below highMin (${b.highMin}), or MEDIUM cannot exist`,
      });
    }
  });

const NutrientBands = z.object({ fat: Band, saturates: Band, sugars: Band, salt: Band }).strict();

/** Per-portion rules only set a HIGH floor; there is no per-portion LOW. */
const PortionHighs = z
  .object({
    fat: z.number().positive(),
    saturates: z.number().positive(),
    sugars: z.number().positive(),
    salt: z.number().positive(),
  })
  .strict();

export const FsaThresholdsSchema = z
  .object({
    status: z.enum(['verified', 'unverified']),
    note: z.string().min(1),
    sources: z.array(SourceSchema).min(1),
    verifiedOn: z.string().date().nullable(),
    /**
     * The per-portion test applies to portions STRICTLY LARGER than this, and
     * the figure is NOT the same for the two categories: the guidance says
     * "portion size criteria apply to portions/serving sizes greater than 100g"
     * under the food table and "greater than 150ml" under the drinks table.
     *
     * This was one number for both until 2026-08-17, which made every drink
     * portion between 100 ml and 150 ml eligible for a red it had not earned.
     */
    food: z
      .object({
        per100g: NutrientBands,
        perPortionHigh: PortionHighs,
        portionAppliesAboveG: z.number().positive(),
      })
      .strict(),
    drink: z
      .object({
        per100ml: NutrientBands,
        perPortionHigh: PortionHighs,
        portionAppliesAboveMl: z.number().positive(),
      })
      .strict(),
  })
  .strict();

export type FsaThresholds = z.infer<typeof FsaThresholdsSchema>;

export const ReferenceIntakesSchema = z
  .object({
    status: z.enum(['verified', 'unverified']),
    note: z.string().min(1),
    sources: z.array(SourceSchema).min(1),
    verifiedOn: z.string().date().nullable(),
    energyKJ: z.number().positive(),
    energyKcal: z.number().positive(),
    fatG: z.number().positive(),
    saturatesG: z.number().positive(),
    carbohydrateG: z.number().positive(),
    sugarsG: z.number().positive(),
    proteinG: z.number().positive(),
    saltG: z.number().positive(),
  })
  .strict();

export type ReferenceIntakes = z.infer<typeof ReferenceIntakesSchema>;
