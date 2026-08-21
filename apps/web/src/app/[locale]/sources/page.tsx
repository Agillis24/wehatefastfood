import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Source } from '@wff/content';
import { AVAILABLE_LOCALES } from '@/i18n/routing';
import { getContent } from '@/lib/content';
import { SourceEntry } from '@/components/content/SourceList';
import { pageMetadata } from '@/lib/metadata';
import { StaticPage } from '@/components/content/StaticPage';

/**
 * Every document behind every figure, in one place.
 *
 * Generated from the content graph rather than maintained by hand, for the same
 * reason the decoder's back-links are: a hand-kept bibliography is a promise
 * that quietly stops being true, and this is the page a sceptical reader checks
 * first. If it is not derived from the same records the pages render from, it
 * is decoration.
 */

type Group = { key: string; sources: Source[] };

export function generateStaticParams() {
  return AVAILABLE_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pages.sources' });
  return pageMetadata({ locale, path: '/sources', title: t('title'), description: t('lede') });
}

export default async function SourcesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const repo = await getContent();
  const [chains, items, additives, ingredients] = await Promise.all([
    repo.listChains(),
    repo.listItems(),
    repo.listAdditives(),
    repo.listIngredients(),
  ]);

  /**
   * Deduplicated by URL across the whole site, first appearance winning, so a
   * regulator's page cited by nine additives is one entry rather than nine.
   * Groups are walked in a fixed order, which is what makes "first" mean
   * something stable rather than whatever the filesystem returned today.
   */
  const seen = new Set<string>();
  const collect = (sources: readonly Source[]): Source[] =>
    sources.filter((source) => {
      if (seen.has(source.url)) return false;
      seen.add(source.url);
      return true;
    });

  const byTitle = (a: Source, b: Source) => a.publisher.localeCompare(b.publisher);

  const groups: Group[] = [
    { key: 'groupChains', sources: collect(chains.flatMap((c) => c.sources)).sort(byTitle) },
    {
      key: 'groupItems',
      sources: collect(items.flatMap((i) => i.variants.flatMap((v) => v.sources))).sort(byTitle),
    },
    { key: 'groupAdditives', sources: collect(additives.flatMap((a) => a.sources)).sort(byTitle) },
    {
      key: 'groupIngredients',
      sources: collect(ingredients.flatMap((i) => i.sources)).sort(byTitle),
    },
  ].filter((group) => group.sources.length > 0);

  return <SourcesView locale={locale} groups={groups} total={seen.size} />;
}

function SourcesView({
  locale,
  groups,
  total,
}: {
  locale: string;
  groups: Group[];
  total: number;
}) {
  const t = useTranslations('pages.sources');

  return (
    <StaticPage locale={locale} path="/sources" title={t('title')} lede={t('lede')} sections={[]}>
      <p className="font-data text-xs tracking-widest uppercase" data-numeric>
        {t('count', { count: total })}
      </p>

      {groups.length === 0 ? (
        <p className="text-[var(--surface-muted)]">{t('empty')}</p>
      ) : (
        groups.map((group) => (
          <section key={group.key} className="flex flex-col gap-2">
            <h2 className="font-display text-3xl font-extrabold tracking-tight">
              {t(group.key as 'groupChains')}
            </h2>
            <ol className="flex flex-col gap-2">
              {group.sources.map((source) => (
                <SourceEntry key={source.url} source={source} locale={locale} />
              ))}
            </ol>
          </section>
        ))
      )}

      <p className="text-sm text-[var(--surface-muted)]">{t('note')}</p>
    </StaticPage>
  );
}
