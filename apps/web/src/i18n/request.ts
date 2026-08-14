import { getRequestConfig } from 'next-intl/server';
import { routing, type AvailableLocale } from './routing';

/**
 * Message catalogues are imported explicitly rather than by template literal.
 * A dynamic `import(\`.../${locale}/...\`)` makes the bundler include every
 * locale in every bundle, which is exactly the kind of quiet weight the 130 kB
 * item-page budget cannot absorb.
 */
const CATALOGUES = {
  en: async () => ({
    ...(await import('@wff/i18n/messages/en/common.json')).default,
    home: (await import('@wff/i18n/messages/en/home.json')).default,
  }),
} satisfies Record<AvailableLocale, () => Promise<Record<string, unknown>>>;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;

  const locale: AvailableLocale =
    requested && (routing.locales as readonly string[]).includes(requested)
      ? (requested as AvailableLocale)
      : routing.defaultLocale;

  return {
    locale,
    messages: await CATALOGUES[locale](),
  };
});
