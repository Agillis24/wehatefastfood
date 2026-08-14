import { z } from 'zod';

/**
 * Every factual assertion in this repo carries at least one of these.
 * Additives carry at least two, from different publishers.
 *
 * `retrievedOn` is the date WE looked at the document, not the date they
 * published it. That distinction is the whole point: chains reformulate
 * quietly, so what matters for trust is when a human last checked.
 */
export const SourceSchema = z
  .object({
    title: z.string().min(1),
    publisher: z.string().min(1),
    url: z.string().url(),
    retrievedOn: z.string().date(),
    publishedOn: z.string().date().optional(),
    type: z.enum(['company-disclosure', 'regulator', 'peer-reviewed', 'journalism', 'database']),
  })
  .strict()
  .superRefine((s, ctx) => {
    if (s.publishedOn && s.publishedOn > s.retrievedOn) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['publishedOn'],
        message: 'publishedOn is after retrievedOn - we cannot have read it before it existed',
      });
    }
  });

export type Source = z.infer<typeof SourceSchema>;

/** Two sources are "independent" when their publishers differ. */
export function hasIndependentSources(sources: readonly Source[], minimum: number): boolean {
  return new Set(sources.map((s) => s.publisher.trim().toLowerCase())).size >= minimum;
}

export const SLUG = z
  .string()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'must be kebab-case: lowercase letters, digits and single hyphens',
  );

/** ISO 3166-1 alpha-2, uppercase. */
export const MARKET = z.string().regex(/^[A-Z]{2}$/, 'must be a 2-letter uppercase country code');
