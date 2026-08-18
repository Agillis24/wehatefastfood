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

/**
 * Markets this site is set up to hold figures for.
 *
 * It lives here, beside the schema, rather than in @wff/i18n where it used to,
 * because a list nothing validates against is decoration. It WAS decoration:
 * it omitted CA while the repo held thirty-seven Canadian variants, and nothing
 * anywhere noticed, because `market` was checked against a two-letter pattern
 * and never against the list. @wff/i18n re-exports it.
 *
 * Being listed here does NOT mean we hold figures for that market. That is per
 * item, and absence is always stated rather than filled in from a neighbour.
 */
export const SUPPORTED_MARKETS = ['CZ', 'US', 'CA', 'GB', 'DE', 'FR', 'PL'] as const;

export type Market = (typeof SUPPORTED_MARKETS)[number];

export function isSupportedMarket(value: string): value is Market {
  return (SUPPORTED_MARKETS as readonly string[]).includes(value);
}

/**
 * The jurisdiction a set of FIGURES describes.
 *
 * Constrained to the list, not merely to the shape. A typo that produced a
 * well-formed but unheld market used to validate and then render a page nobody
 * could have data for.
 */
export const MARKET = z
  .string()
  .regex(/^[A-Z]{2}$/, 'must be a 2-letter uppercase country code')
  .refine(isSupportedMarket, (v) => ({
    message: `"${v}" is not a market this site holds data for. Add it to SUPPORTED_MARKETS first.`,
  }));

/**
 * Where a company is headquartered, which is a plain country code and NOT a
 * market. A chain may be headquartered somewhere we will never hold figures for
 * and that must not be a validation error.
 */
export const COUNTRY = z.string().regex(/^[A-Z]{2}$/, 'must be a 2-letter uppercase country code');
