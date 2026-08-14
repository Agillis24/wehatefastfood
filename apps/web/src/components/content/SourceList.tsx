import { useTranslations } from 'next-intl';
import type { Source } from '@wff/content';
import { isoDate } from '@/lib/format';

/**
 * Every source, dated and linked. Never collapsed by default on desktop, and
 * never behind a toggle - this section is the difference between this site and
 * a rage blog, so it is not a footnote.
 */
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
      <h2 id="sources-title" className="font-display text-2xl font-extrabold">
        {t('title')}
      </h2>

      {groups.map((group) => (
        <div key={group.heading} className="flex flex-col gap-2">
          <h3 className="font-data text-xs tracking-widest uppercase">{group.heading}</h3>
          <ol className="flex flex-col gap-2">
            {group.sources.map((source) => (
              <li key={`${source.url}-${source.title}`} className="text-sm">
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
            ))}
          </ol>
        </div>
      ))}
    </section>
  );
}
