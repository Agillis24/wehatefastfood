/**
 * Locale and market configuration.
 *
 * These are two different axes and they must never be conflated:
 *   locale - the language of the prose. Lives in the URL path: /cs/...
 *   market - the jurisdiction the FIGURES describe. ALSO lives in the path:
 *            /{locale}/chains/{chain}/{item}/{MARKET}
 *
 * A German speaker may legitimately want UK data. If market lived only in a
 * cookie, a shared link would show different numbers to different readers under
 * the same URL, which on this site is disqualifying.
 *
 * This comment used to say market lived in a query string, `?m=GB`, and cited
 * docs/PLAN.md §2.2 while doing so - which is the section that OVERTURNED that
 * decision, because Next cannot statically prerender one page per query value.
 * It had been wrong for as long as the route has existed. See apps/web/src/lib/
 * url.ts, which has carried the correct account the whole time.
 */

/**
 * Content is authored in this locale.
 *
 * Czech, since 2026-08-18, and the reason is not sentiment about the home
 * market. This project's first rule is that a fact is never invented, and the
 * only person who can check the prose reads Czech natively. Authoring in
 * English meant the one available reviewer was reviewing a translation - the
 * least rewarding form of checking there is - and the Czech shipped flagged
 * `reviewedByHuman: false` because of it. Source-language prose is prose
 * somebody can actually hold to account.
 *
 * English is not deleted, only withdrawn: the machinery stays, and the market
 * axis keeps the American and Canadian figures, which are the comparison the
 * Czech pages are FOR.
 */
export const SOURCE_LOCALE = 'cs' as const;

/**
 * Tier 1: pre-translated at build time, committed to the repo, statically
 * rendered, indexable. `cs` runs first and alone as the pilot - it is the only
 * locale the team can personally review, so it is the acceptance test for the
 * whole pipeline before a token is spent on the other seven.
 */
export const CORE_LOCALES = ['en', 'cs', 'de', 'es', 'fr', 'it', 'pl', 'pt', 'nl'] as const;

export type CoreLocale = (typeof CORE_LOCALES)[number];

export const DEFAULT_LOCALE: CoreLocale = 'cs';

/** Right-to-left locales. Only reachable via tier 2 today; `ar` is in the e2e suite. */
export const RTL_LOCALES = new Set(['ar', 'he', 'fa', 'ur']);

export function isRtl(locale: string): boolean {
  return RTL_LOCALES.has(locale.split('-')[0] ?? locale);
}

/*
 * SUPPORTED_MARKETS and isSupportedMarket now live in @wff/content, beside the
 * schema that enforces them, and are re-exported here so every existing import
 * of @wff/i18n keeps working. The move is the point: while the list lived here
 * nothing validated against it, and it quietly omitted CA for as long as the
 * repo held Canadian data.
 */
export { SUPPORTED_MARKETS, isSupportedMarket, type Market } from '@wff/content';
import type { Market } from '@wff/content';

/**
 * The market this site is primarily ABOUT, which is not the same as a fallback
 * and must never be used as one.
 *
 * It was GB, decided 2026-08-14, and the repo has never held a single British
 * figure. Worse, the one function that read it - `normaliseMarket` in
 * apps/web/src/lib/url.ts - turned any unrecognised market into GB, so a
 * Canadian item would have been answered with a market we hold nothing for. It
 * was never called, so the bug stayed latent; it is deleted rather than fixed,
 * because a function that invents a jurisdiction for a figure is not one this
 * codebase should own.
 *
 * CZ now, and we hold nothing for it yet either - that is the next content
 * push, and the honest position until then is that Czech pages carry American
 * and Canadian figures and say which country each set describes.
 */
export const DEFAULT_MARKET: Market = 'CZ';

export function isCoreLocale(value: string): value is CoreLocale {
  return (CORE_LOCALES as readonly string[]).includes(value);
}
