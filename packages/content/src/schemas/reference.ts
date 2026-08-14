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
    /** Values at or below this are LOW. */
    lowMax: z.number().positive(),
    /** Values above this are HIGH. Everything between the two is MEDIUM. */
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
    /** Portions larger than this also get the per-portion HIGH test applied. */
    portionAppliesAboveG: z.number().positive(),
    food: z.object({ per100g: NutrientBands, perPortionHigh: PortionHighs }).strict(),
    drink: z.object({ per100ml: NutrientBands, perPortionHigh: PortionHighs }).strict(),
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
