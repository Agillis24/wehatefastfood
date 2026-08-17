import type { Chain, MenuItem, NutritionFacts } from '@wff/content';
import { canonicalUrl, SITE_ORIGIN, SOCIAL } from '@/lib/site';
import { itemPath } from '@/lib/url';

/**
 * schema.org JSON-LD.
 *
 * Only fields we actually hold are emitted. A structured-data block is a claim
 * made to a machine, and an invented or padded value there is the same failure
 * as one on the page - it is just harder to notice.
 *
 * No `aggregateRating`, no `offers`, no `image` of a product we have not drawn.
 */

type Props = {
  locale: string;
  chain: Chain;
  item: MenuItem;
  market: string;
  serving: NutritionFacts | null;
  verifiedOn: string | null;
};

const round = (value: number, digits = 1) => Math.round(value * 10 ** digits) / 10 ** digits;

export function ItemStructuredData({ locale, chain, item, market, serving, verifiedOn }: Props) {
  const url = canonicalUrl(itemPath(locale, chain.slug, item.slug, market));

  const nutrition: Record<string, string> = {};
  if (serving) {
    if (serving.servingSizeG !== null) nutrition.servingSize = `${round(serving.servingSizeG)} g`;
    if (serving.energyKcal !== null) nutrition.calories = `${round(serving.energyKcal, 0)} kcal`;
    if (serving.fatG !== null) nutrition.fatContent = `${round(serving.fatG)} g`;
    if (serving.saturatesG !== null)
      nutrition.saturatedFatContent = `${round(serving.saturatesG)} g`;
    if (serving.carbohydrateG !== null)
      nutrition.carbohydrateContent = `${round(serving.carbohydrateG)} g`;
    if (serving.sugarsG !== null) nutrition.sugarContent = `${round(serving.sugarsG)} g`;
    if (serving.fibreG !== null) nutrition.fiberContent = `${round(serving.fibreG)} g`;
    if (serving.proteinG !== null) nutrition.proteinContent = `${round(serving.proteinG)} g`;
    if (serving.sodiumMg !== null) nutrition.sodiumContent = `${round(serving.sodiumMg, 0)} mg`;
  }

  const graph: Record<string, unknown>[] = [
    {
      '@type': 'MenuItem',
      '@id': url,
      name: item.name,
      url,
      ...(Object.keys(nutrition).length > 0
        ? { nutrition: { '@type': 'NutritionInformation', ...nutrition } }
        : {}),
      ...(verifiedOn !== null ? { dateModified: verifiedOn } : {}),
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Chains',
          item: canonicalUrl(`/${locale}/chains`),
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: chain.name,
          item: canonicalUrl(`/${locale}/chains/${chain.slug}`),
        },
        { '@type': 'ListItem', position: 3, name: item.name, item: url },
      ],
    },
  ];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }),
      }}
    />
  );
}

/**
 * Site-level identity: who publishes this, and how to tell that the site, the
 * YouTube channel and the Instagram account are one publisher.
 *
 * `sameAs` is the property that does that work, and it is the reason this
 * exists at all - not because Organization markup wins a rich result, which it
 * mostly does not, but because it is the machine-readable form of "these
 * accounts are the same people". Both a search engine and an assistant use it
 * to attribute a claim to a publisher rather than to a stray page.
 *
 * Rendered on the home page only. One Organization per site is the convention;
 * repeating it on every page states the same fact several thousand times and
 * gives a consumer more copies to reconcile rather than more confidence.
 *
 * NOT emitted: `foundingDate`, `numberOfEmployees`, `address`, `logo` beyond
 * the share image, or anything else we would be inventing to fill a field.
 */
export function SiteStructuredData({
  locale,
  name,
  description,
}: {
  locale: string;
  name: string;
  description: string;
}) {
  const home = canonicalUrl(`/${locale}`);
  const organisation = canonicalUrl('/#organisation');

  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': organisation,
        name,
        description,
        url: canonicalUrl('/'),
        logo: `${SITE_ORIGIN}/og/wff-share.png`,
        sameAs: SOCIAL.map((account) => account.url),
      },
      {
        '@type': 'WebSite',
        '@id': canonicalUrl('/#website'),
        name,
        description,
        url: home,
        inLanguage: locale,
        publisher: { '@id': organisation },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
