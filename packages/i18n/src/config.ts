/**
 * Locale and market configuration.
 *
 * These are two different axes and they must never be conflated:
 *   locale - the language of the prose. Lives in the URL path: /cs/...
 *   market - the jurisdiction the FIGURES describe. Lives in the URL query: ?m=GB
 *
 * A German speaker may legitimately want UK data. If market lived only in a
 * cookie, a shared link would show different numbers to different readers under
 * the same URL, which on this site is disqualifying. See docs/PLAN.md §2.2.
 */

/** Content is authored in this locale. Everything else is translated from it. */
export const SOURCE_LOCALE = 'en' as const;

/**
 * Tier 1: pre-translated at build time, committed to the repo, statically
 * rendered, indexable. `cs` runs first and alone as the pilot - it is the only
 * locale the team can personally review, so it is the acceptance test for the
 * whole pipeline before a token is spent on the other seven.
 */
export const CORE_LOCALES = ['en', 'cs', 'de', 'es', 'fr', 'it', 'pl', 'pt', 'nl'] as const;

export const PILOT_LOCALE = 'cs' as const;

export type CoreLocale = (typeof CORE_LOCALES)[number];

export const DEFAULT_LOCALE: CoreLocale = 'en';

/** Right-to-left locales. Only reachable via tier 2 today; `ar` is in the e2e suite. */
export const RTL_LOCALES = new Set(['ar', 'he', 'fa', 'ur']);

export function isRtl(locale: string): boolean {
  return RTL_LOCALES.has(locale.split('-')[0] ?? locale);
}

/**
 * Markets we are set up to hold data for. A market appearing here does NOT mean
 * we have figures for it - that is per item, and absence is always stated
 * explicitly rather than filled in from a neighbouring market.
 */
export const SUPPORTED_MARKETS = ['GB', 'US', 'DE', 'FR', 'PL', 'CZ'] as const;

export type Market = (typeof SUPPORTED_MARKETS)[number];

/**
 * GB, decided 2026-08-14. The FSA front-of-pack thresholds and the EU/UK
 * reference intakes are the primary set; US figures are converted for display
 * with the constant named on the page.
 */
export const DEFAULT_MARKET: Market = 'GB';

export const MARKET_QUERY_PARAM = 'm';

export function isCoreLocale(value: string): value is CoreLocale {
  return (CORE_LOCALES as readonly string[]).includes(value);
}

export function isSupportedMarket(value: string): value is Market {
  return (SUPPORTED_MARKETS as readonly string[]).includes(value);
}
