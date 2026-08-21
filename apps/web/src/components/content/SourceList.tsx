import { useTranslations } from 'next-intl';
import type { Source } from '@wff/content';
import { isoDate } from '@/lib/format';

/**
 * Every source, dated and linked. Never collapsed by default on desktop, and
 * never behind a toggle - this section is the difference between this site and
 * a rage blog, so it is not a footnote.
 */
/**
 * One source, rendered identically wherever it appears.
 *
 * Extracted because /sources lists every document on the site and would
 * otherwise be a second copy of this markup - and the two copies would drift,
 * so the same document would be dated one way on an item page and another way
 * on the index of all sources.
 */
export function SourceEntry({ source, locale }: { source: Source; locale: string }) {
  const t = useTranslations('item.sources');

  return (
    <li className="text-sm">
      <a
        href={source.url}
        rel="nofollow noopener external"
        className="underline decoration-pink decoration-2 underline-offset-2"
      >
        {source.title}
      </a>
      <span className="block text-[var(--surface-muted)]">
        {source.publisher}
        {' · '}
        {t('retrieved', { date: isoDate(locale, source.retrievedOn) })}
        {source.publishedOn !== undefined
          ? ` · ${t('published', { date: isoDate(locale, source.publishedOn) })}`
          : ''}
      </span>
    </li>
  );
}

export function SourceList({
  groups,
  locale,
}: {
  groups: { heading: string; sources: readonly Source[] }[];
  locale: string;
}) {
  const t = useTranslations('item.sources');

  return (
    <section aria-labelledby="sources-title" className="flex flex-col gap-4">
      <h2 id="sources-title" className="font-display text-3xl font-extrabold tracking-tight">
        {t('title')}
      </h2>

      {groups.map((group) => (
        <div key={group.heading} className="flex flex-col gap-2">
          <h3 className="font-data text-xs tracking-widest uppercase">{group.heading}</h3>
          <ol className="flex flex-col gap-2">
            {group.sources.map((source) => (
              <SourceEntry key={`${source.url}-${source.title}`} source={source} locale={locale} />
            ))}
          </ol>
        </div>
      ))}
    </section>
  );
}
