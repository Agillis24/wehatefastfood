import { getRequestConfig } from 'next-intl/server';
import { routing, type AvailableLocale } from './routing';

/**
 * Message catalogues are imported explicitly per locale rather than by template
 * literal. A dynamic `import(\`.../${locale}/...\`)` makes the bundler include
 * every locale in every bundle, which is exactly the kind of quiet weight the
 * 130 kB item-page budget cannot absorb.
 */
const CATALOGUES: Record<AvailableLocale, () => Promise<Record<string, unknown>>> = {
  en: async () => ({
    ...(await import('@wff/i18n/messages/en/common.json')).default,
    home: (await import('@wff/i18n/messages/en/home.json')).default,
    item: (await import('@wff/i18n/messages/en/item.json')).default,
    chains: (await import('@wff/i18n/messages/en/chains.json')).default,
    decoder: (await import('@wff/i18n/messages/en/decoder.json')).default,
    diff: (await import('@wff/i18n/messages/en/diff.json')).default,
    compare: (await import('@wff/i18n/messages/en/compare.json')).default,
  }),
  cs: async () => ({
    ...(await import('@wff/i18n/messages/cs/common.json')).default,
    home: (await import('@wff/i18n/messages/cs/home.json')).default,
    item: (await import('@wff/i18n/messages/cs/item.json')).default,
    chains: (await import('@wff/i18n/messages/cs/chains.json')).default,
    decoder: (await import('@wff/i18n/messages/cs/decoder.json')).default,
    diff: (await import('@wff/i18n/messages/cs/diff.json')).default,
    compare: (await import('@wff/i18n/messages/cs/compare.json')).default,
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
