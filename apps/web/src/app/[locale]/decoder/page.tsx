import type { Metadata } from 'next';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { FUNCTIONAL_CLASSES, type Additive } from '@wff/content';
import { AVAILABLE_LOCALES } from '@/i18n/routing';
import { getContent } from '@/lib/content';
import { DecoderFilterScript } from '@/components/ui/DecoderFilterScript';
import { SiteFooter, SiteHeader } from '@/components/ui/Chrome';
import { pageMetadata } from '@/lib/metadata';

/**
 * The decoder index.
 *
 * The whole list is server-rendered and complete without JavaScript. The filter
 * script only hides and shows what is already here, so a reader with no JS gets
 * every entry and simply cannot filter. The controls stay hidden until the
 * script un-hides them, so nobody is shown a control that does nothing.
 *
 * Zero client components on this route, and therefore on the whole site - which
 * is worth 11 kB on every other page. See DecoderFilterScript for the numbers.
 */

const EVIDENCE_LEVELS = ['well-established', 'mixed', 'emerging', 'contested'] as const;

const COMBINING_MARKS = /[̀-ͯ]/g;

export function generateStaticParams() {
  return AVAILABLE_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'decoder.index' });
  return pageMetadata({
    locale,
    path: '/decoder',
    title: t('title'),
    description: t('subtitle'),
  });
}

export default async function DecoderPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const repo = await getContent();
  const additives = await repo.listAdditives();

  const usage = new Map<string, number>();
  for (const additive of additives) {
    usage.set(additive.slug, (await repo.listItemsUsingAdditive(additive.slug)).length);
  }

  return <DecoderView locale={locale} additives={[...additives]} usage={[...usage.entries()]} />;
}

function DecoderView({
  locale,
  additives,
  usage,
}: {
  locale: string;
  additives: Additive[];
  usage: [string, number][];
}) {
  const t = useTranslations('decoder.index');
  const tClass = useTranslations('decoder.class');
  const tEvidence = useTranslations('decoder.evidence');
  const usageMap = new Map(usage);

  /** Precomputed on the server so the browser never normalises anything. */
  const haystack = (a: Additive) =>
    [a.names.join(' '), a.eNumber ?? '', a.whatItIs, a.whyItIsInYourFood, ...a.functionalClass]
      .join(' ')
      .toLowerCase()
      .normalize('NFD')
      .replace(COMBINING_MARKS, '');

  return (
    <>
      <SiteHeader locale={locale} />
      <main id="main" className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
        <h1 className="font-display text-4xl font-black">{t('title')}</h1>
        <p className="max-w-prose text-[var(--surface-muted)]">{t('subtitle')}</p>

        <div id="decoder">
          <div id="decoder-controls" hidden className="mb-6 flex flex-col gap-3">
            <label className="flex flex-col gap-1" htmlFor="decoder-query">
              <span className="font-data text-xs tracking-widest uppercase">{t('search')}</span>
              <input
                id="decoder-query"
                type="search"
                placeholder={t('searchHint')}
                className="min-h-11 pill bg-transparent px-3"
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <label className="flex flex-col gap-1" htmlFor="decoder-class">
                <span className="font-data text-xs tracking-widest uppercase">
                  {t('filterClass')}
                </span>
                <select
                  id="decoder-class"
                  defaultValue=""
                  className="min-h-11 pill bg-transparent px-2"
                >
                  <option value="">{t('filterAll')}</option>
                  {FUNCTIONAL_CLASSES.map((value) => (
                    <option key={value} value={value}>
                      {tClass(value)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1" htmlFor="decoder-evidence">
                <span className="font-data text-xs tracking-widest uppercase">
                  {t('filterEvidence')}
                </span>
                <select
                  id="decoder-evidence"
                  defaultValue=""
                  className="min-h-11 pill bg-transparent px-2"
                >
                  <option value="">{t('filterAll')}</option>
                  {EVIDENCE_LEVELS.map((value) => (
                    <option key={value} value={value}>
                      {tEvidence(value)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <p
              id="decoder-count"
              className="font-data text-sm"
              aria-live="polite"
              data-numeric
              data-template={t('results', { count: 0 }).replace('0', '{n}')}
            />
          </div>

          <p className="mb-6 max-w-prose border-s-4 border-[var(--surface-rule)] ps-3 text-xs text-[var(--surface-muted)]">
            {tEvidence('caveat')}
          </p>

          {additives.length === 0 ? (
            <p>{t('empty')}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {additives.map((additive) => (
                <li
                  key={additive.slug}
                  data-entry=""
                  data-search={haystack(additive)}
                  data-classes={additive.functionalClass.join(' ')}
                  data-evidence={additive.evidenceStrength}
                >
                  <Link
                    href={`/${locale}/decoder/${additive.slug}`}
                    className="flex flex-col gap-2 card p-4"
                  >
                    <span className="flex flex-wrap items-baseline gap-2">
                      {additive.eNumber !== null ? (
                        <span className="font-data pill bg-pink px-1 text-sm text-ink">
                          {additive.eNumber}
                        </span>
                      ) : null}
                      <span className="font-display text-xl font-extrabold">
                        {additive.names[0]}
                      </span>
                    </span>
                    <span className="text-sm">{additive.whyItIsInYourFood}</span>
                    <span className="font-data flex flex-wrap gap-2 text-xs tracking-widest uppercase">
                      {additive.functionalClass.map((cls) => (
                        <span key={cls} className="pill border-[var(--surface-rule)] px-2 py-1">
                          {tClass(cls)}
                        </span>
                      ))}
                      <span className="pill border-[var(--surface-rule)] px-2 py-1">
                        {tEvidence(additive.evidenceStrength)}
                      </span>
                      <span className="px-2 py-1" data-numeric>
                        {t('foundInCount', { count: usageMap.get(additive.slug) ?? 0 })}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DecoderFilterScript />
      </main>
      <SiteFooter locale={locale} path="/decoder" />
    </>
  );
}
