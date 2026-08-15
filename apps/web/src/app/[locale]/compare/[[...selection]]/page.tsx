import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { pickBasis, type MenuItem, type NutritionFacts } from '@wff/content';
import { AVAILABLE_LOCALES } from '@/i18n/routing';
import { getContent } from '@/lib/content';
import { itemPath, normaliseMarket } from '@/lib/url';
import { grams, num } from '@/lib/format';
import { Disclaimers, SiteFooter, SiteHeader } from '@/components/ui/Chrome';

/**
 * Compare, up to three items.
 *
 * The selection lives in the PATH so the comparison is shareable, which is the
 * whole point of the page:
 *
 *   /{locale}/compare/{market}/{chain}~{item}/{chain}~{item}
 *
 * This route is rendered on demand rather than prerendered. Item pages are
 * documents and are prerendered; a comparison is a query, and prerendering
 * every combination of items would be a combinatorial explosion for pages
 * almost none of which anyone will ever open. That is a deliberate exception
 * to "everything statically generated", not an oversight.
 *
 * The empty state IS prerendered, because that one is a document.
 *
 * Zero client JavaScript. Sticky row labels come from CSS, and the delta bars
 * are inline SVG-free divs sized on the server.
 */

const MAX_ITEMS = 3;
const SEPARATOR = '~';

export function generateStaticParams() {
  return AVAILABLE_LOCALES.map((locale) => ({ locale, selection: [] as string[] }));
}

type Row = {
  key: 'energy' | 'fat' | 'saturates' | 'sugars' | 'salt';
  read: (facts: NutritionFacts) => number | null;
  unit: 'kcal' | 'g';
};

const ROWS: Row[] = [
  { key: 'energy', read: (f) => f.energyKcal, unit: 'kcal' },
  { key: 'fat', read: (f) => f.fatG, unit: 'g' },
  { key: 'saturates', read: (f) => f.saturatesG, unit: 'g' },
  { key: 'sugars', read: (f) => f.sugarsG, unit: 'g' },
  { key: 'salt', read: (f) => f.saltG, unit: 'g' },
];

type Column = {
  slug: string;
  item: MenuItem | null;
  serving: NutritionFacts | null;
};

export default async function ComparePage({
  params,
}: {
  params: Promise<{ locale: string; selection?: string[] }>;
}) {
  const { locale, selection = [] } = await params;
  setRequestLocale(locale);

  const [marketSegment, ...itemSegments] = selection;
  const market = normaliseMarket(marketSegment);

  const repo = await getContent();
  const columns: Column[] = [];

  for (const segment of itemSegments.slice(0, MAX_ITEMS)) {
    const [chainSlug, itemSlug] = segment.split(SEPARATOR);
    const item =
      chainSlug !== undefined && itemSlug !== undefined
        ? ((await repo.getItem(chainSlug, itemSlug)) ?? null)
        : null;
    const variant = item?.variants.find((v) => v.market === market) ?? null;

    columns.push({
      slug: segment,
      item,
      serving: variant ? (pickBasis(variant.nutrition, 'per-serving') ?? null) : null,
    });
  }

  return (
    <CompareView
      locale={locale}
      market={market}
      columns={columns}
      truncated={itemSegments.length > MAX_ITEMS}
    />
  );
}

function CompareView({
  locale,
  market,
  columns,
  truncated,
}: {
  locale: string;
  market: string;
  columns: Column[];
  truncated: boolean;
}) {
  const t = useTranslations('compare');
  const tRow = useTranslations('compare.row');

  return (
    <>
      <SiteHeader locale={locale} />
      <main id="main" className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
        <h1 className="font-display text-4xl font-black">{t('title')}</h1>
        <p className="max-w-prose text-[var(--surface-muted)]">{t('subtitle')}</p>

        {columns.length === 0 ? (
          <div className="flex flex-col gap-2">
            <p>{t('empty')}</p>
            <p className="font-data text-sm text-[var(--surface-muted)]">{t('howTo')}</p>
          </div>
        ) : (
          <>
            <p className="font-data text-xs tracking-widest uppercase">
              {t('market')}
              {': '}
              <span data-numeric>{market}</span>
            </p>
            {truncated ? <p className="text-sm">{t('tooMany')}</p> : null}

            {/* Horizontal scroll with a sticky label column, down to 360 px. */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] border-collapse">
                <caption className="sr-only">{t('title')}</caption>
                <thead>
                  <tr>
                    <th
                      scope="col"
                      className="sticky start-0 z-10 bg-[var(--surface-bg)] py-2 pe-3 text-start"
                    >
                      <span className="font-data text-xs tracking-widest uppercase">
                        {t('nutrient')}
                      </span>
                    </th>
                    {columns.map((column) => (
                      <th key={column.slug} scope="col" className="py-2 pe-3 text-start">
                        {column.item === null ? (
                          <span className="text-sm">{t('unknownItem', { slug: column.slug })}</span>
                        ) : (
                          <Link
                            href={itemPath(locale, column.item.chainSlug, column.item.slug, market)}
                            className="font-display text-lg font-extrabold underline decoration-pink decoration-2"
                          >
                            {column.item.name}
                          </Link>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-[var(--surface-rule)]/40">
                    <th
                      scope="row"
                      className="sticky start-0 bg-[var(--surface-bg)] py-2 pe-3 text-start text-sm font-medium"
                    >
                      {tRow('serving')}
                    </th>
                    {columns.map((column) => (
                      <td key={column.slug} className="font-data py-2 pe-3 text-sm" data-numeric>
                        {column.serving?.servingSizeG != null
                          ? grams(locale, column.serving.servingSizeG)
                          : t('notPublished')}
                      </td>
                    ))}
                  </tr>

                  {ROWS.map((row) => {
                    const values = columns.map((c) => (c.serving ? row.read(c.serving) : null));
                    const max = Math.max(...values.map((v) => v ?? 0), 0);

                    return (
                      <tr key={row.key} className="border-t border-[var(--surface-rule)]/40">
                        <th
                          scope="row"
                          className="sticky start-0 bg-[var(--surface-bg)] py-3 pe-3 text-start text-sm font-medium"
                        >
                          {tRow(row.key)}
                        </th>
                        {columns.map((column, index) => {
                          const value = values[index] ?? null;
                          return (
                            <td key={column.slug} className="py-3 pe-3 align-top">
                              <span className="font-data block text-sm" data-numeric>
                                {value === null
                                  ? column.item === null
                                    ? ''
                                    : t('notPublished')
                                  : row.unit === 'g'
                                    ? grams(locale, value)
                                    : num(locale, value, 0)}
                              </span>
                              {value !== null && max > 0 ? (
                                <span
                                  data-viz
                                  aria-hidden="true"
                                  className="mt-1 block h-2 bg-pink"
                                  style={{ inlineSize: `${Math.max((value / max) * 100, 2)}%` }}
                                />
                              ) : null}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="rule-strike" aria-hidden="true" />
        <Disclaimers />
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
