import { defineRouting } from 'next-intl/routing';
import { DEFAULT_LOCALE } from '@wff/i18n';

/**
 * Locales that actually have a message catalogue on disk right now.
 *
 * This is NOT the same list as CORE_LOCALES in @wff/i18n. That list is the
 * target - the eight tier-1 languages plus the source. This list is the truth,
 * and it grows only when `npm run i18n:translate` has produced a catalogue that
 * a human has looked at. Routing to a locale we cannot render would give the
 * reader an English page wearing a foreign flag, which is worse than not
 * offering it. Phase 5 turns the pilot (cs) on first.
 */
export const AVAILABLE_LOCALES = ['en'] as const;

export type AvailableLocale = (typeof AVAILABLE_LOCALES)[number];

/**
 * The default locale has to be one we can actually render. Asserting it here
 * means a Phase 5 mistake - promoting a default before its catalogue exists -
 * fails the build immediately rather than serving English under a foreign URL.
 */
function requireAvailable(locale: string): AvailableLocale {
  if (!(AVAILABLE_LOCALES as readonly string[]).includes(locale)) {
    throw new Error(
      `Default locale "${locale}" has no message catalogue. ` +
        `Available: ${AVAILABLE_LOCALES.join(', ')}.`,
    );
  }
  return locale as AvailableLocale;
}

export const routing = defineRouting({
  locales: AVAILABLE_LOCALES,
  defaultLocale: requireAvailable(DEFAULT_LOCALE),
  localePrefix: 'always',
});
