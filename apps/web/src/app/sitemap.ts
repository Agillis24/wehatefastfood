import type { MetadataRoute } from 'next';
import { AVAILABLE_LOCALES } from '@/i18n/routing';
import { getContent } from '@/lib/content';
import { SITE_ORIGIN } from '@/lib/site';

/**
 * One entry per (locale, page). Item pages are per (locale, item, MARKET),
 * because each market is a distinct set of figures at a distinct URL.
 *
 * Every entry carries hreflang alternates for the other reviewed locales.
 * Tier-2 machine translations are deliberately absent: they are noindex, and
 * advertising a thin unreviewed rendering to a search engine would be the
 * opposite of what the sitemap is for.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const repo = await getContent();
  const chains = await repo.listChains();
  const items = await repo.listItems();
  const additives = await repo.listAdditives();

  const paths: string[] = [
    '',
    '/chains',
    '/decoder',
    '/compare',
    ...chains.map((chain) => `/chains/${chain.slug}`),
    ...additives.map((additive) => `/decoder/${additive.slug}`),
    ...items.flatMap((item) =>
      item.variants.map((v) => `/chains/${item.chainSlug}/${item.slug}/${v.market}`),
    ),
  ];

  return AVAILABLE_LOCALES.flatMap((locale) =>
    paths.map((path) => ({
      url: `${SITE_ORIGIN}/${locale}${path}`,
      alternates: {
        languages: Object.fromEntries(
          AVAILABLE_LOCALES.map((other) => [other, `${SITE_ORIGIN}/${other}${path}`]),
        ),
      },
    })),
  );
}
