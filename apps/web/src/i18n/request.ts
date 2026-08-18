import { getRequestConfig } from 'next-intl/server';
import { routing, type AvailableLocale } from './routing';

/**
 * Message catalogues are imported explicitly per locale rather than by template
 * literal. A dynamic `import(\`.../${locale}/...\`)` makes the bundler include
 * every locale in every bundle, which is exactly the kind of quiet weight the
 * 130 kB item-page budget cannot absorb.
 */
/*
 * The English catalogue block was removed when `en` was withdrawn from
 * AVAILABLE_LOCALES, because this Record is keyed by AvailableLocale and a
 * key for a locale nobody can reach is a bundle nobody needs. The English
 * message FILES stay exactly where they are - withdrawing a locale is not
 * deleting its translations, and they are what the Czech was drafted from.
 */
const CATALOGUES: Record<AvailableLocale, () => Promise<Record<string, unknown>>> = {
  cs: async () => ({
    ...(await import('@wff/i18n/messages/cs/common.json')).default,
    home: (await import('@wff/i18n/messages/cs/home.json')).default,
    item: (await import('@wff/i18n/messages/cs/item.json')).default,
    chains: (await import('@wff/i18n/messages/cs/chains.json')).default,
    decoder: (await import('@wff/i18n/messages/cs/decoder.json')).default,
    diff: (await import('@wff/i18n/messages/cs/diff.json')).default,
    compare: (await import('@wff/i18n/messages/cs/compare.json')).default,
    pages: (await import('@wff/i18n/messages/cs/pages.json')).default,
  }),
};

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;

  const locale: AvailableLocale =
    requested && (routing.locales as readonly string[]).includes(requested)
      ? (requested as AvailableLocale)
      : routing.defaultLocale;

  return { locale, messages: await CATALOGUES[locale]() };
});
