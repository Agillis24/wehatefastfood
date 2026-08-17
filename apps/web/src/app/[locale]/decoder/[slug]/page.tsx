import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Additive, MenuItem, Source } from '@wff/content';
import { AVAILABLE_LOCALES } from '@/i18n/routing';
import { getContent } from '@/lib/content';
import { itemPath } from '@/lib/url';
import { SourceList } from '@/components/content/SourceList';
import { Disclaimers, SiteFooter, SiteHeader } from '@/components/ui/Chrome';
import { pageMetadata } from '@/lib/metadata';

/**
 * A decoder entry, plus the "found in" back-links generated from the content
 * graph rather than maintained by hand - which is the whole reason the reverse
 * index exists in @wff/content.
 */

export const dynamicParams = false;

export async function generateStaticParams() {
  const repo = await getContent();
  const additives = await repo.listAdditives();
  return AVAILABLE_LOCALES.flatMap((locale) =>
    additives.map((additive) => ({ locale, slug: additive.slug })),
  );
}

/**
 * These pages answer "what is E621 and why is it in my food", which is the
 * question an assistant is most likely to be asked and to quote an answer for.
 * They shipped with no generateMetadata at all: no title, no description, no
 * canonical - invisible to every consumer that reads a head rather than a body.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const repo = await getContent();
  const additive = await repo.getAdditive(slug);

  const t = await getTranslations({ locale, namespace: 'brand' });
  if (!additive) return { title: t('name') };

  const name = additive.names[0] ?? slug;

  return pageMetadata({
    locale,
    path: `/decoder/${additive.slug}`,
    // The E-number is what people search for, so it leads.
    title: additive.eNumber === null ? name : `${additive.eNumber} - ${name}`,
    description: additive.whatItIs,
  });
}

export default async function DecoderEntryPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const repo = await getContent();
  const additive = await repo.getAdditive(slug);
  if (!additive) notFound();

  const usedBy = await repo.listItemsUsingAdditive(slug);

  // Each back-link needs a market to point at, and it must be one we actually
  // hold for that item rather than a default guessed on its behalf.
  const links = usedBy.map((item) => ({
    item,
    market:
      item.variants.find((v) => v.additiveRefs.includes(slug))?.market ??
      item.variants[0]?.market ??
      'GB',
  }));

  return <EntryView locale={locale} additive={additive} links={links} />;
}

function EntryView({
  locale,
  additive,
  links,
}: {
  locale: string;
  additive: Additive;
  links: { item: MenuItem; market: string }[];
}) {
  const t = useTranslations('decoder.entry');
  const tClass = useTranslations('decoder.class');
  const tEvidence = useTranslations('decoder.evidence');
  const tSources = useTranslations('item.sources');

  return (
    <>
      <SiteHeader locale={locale} />
      <main id="main" className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
        <Link href={`/${locale}/decoder`} className="font-data text-sm underline">
          {t('back')}
        </Link>

        <header className="flex flex-col gap-2">
          {additive.eNumber !== null ? (
            <span className="font-data self-start border-[1.5px] border-ink bg-pink px-2 py-1 text-sm text-ink">
              {additive.eNumber}
            </span>
          ) : null}
          <h1 className="font-display text-4xl font-black sm:text-5xl">{additive.names[0]}</h1>
          {additive.names.length > 1 ? (
            <p className="text-sm text-[var(--surface-muted)]">
              <span className="font-data text-xs tracking-widest uppercase">
                {t('alsoKnownAs')}
              </span>
              <span className="ms-2">{additive.names.slice(1).join(', ')}</span>
            </p>
          ) : null}
          <p className="font-data flex flex-wrap gap-2 text-xs tracking-widest uppercase">
            {additive.functionalClass.map((cls) => (
              <span key={cls} className="border-[1.5px] border-ink px-2 py-1">
                {tClass(cls)}
              </span>
            ))}
          </p>
        </header>

        <div className="rule-strike" aria-hidden="true" />

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-2xl font-extrabold">{t('whatItIs')}</h2>
          <p>{additive.whatItIs}</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-2xl font-extrabold">{t('whyItIsHere')}</h2>
          <p>{additive.whyItIsInYourFood}</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-2xl font-extrabold">{t('evidence')}</h2>
          <p className="font-data text-xs tracking-widest uppercase">
            {t('evidenceStrength')}
            {': '}
            {tEvidence(additive.evidenceStrength)}
          </p>
          <p>{additive.evidenceSummary}</p>
          <p className="border-s-4 border-[var(--surface-rule)] ps-3 text-xs text-[var(--surface-muted)]">
            {tEvidence('caveat')}
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-2xl font-extrabold">{t('regulatory')}</h2>
          <dl className="flex flex-col gap-2">
            {(
              [
                ['eu', additive.regulatoryStatus.eu],
                ['uk', additive.regulatoryStatus.uk],
                ['us', additive.regulatoryStatus.us],
              ] as const
            ).map(([key, value]) => (
              <div key={key} className="flex flex-col">
                <dt className="font-data text-xs tracking-widest uppercase">{t(key)}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <h3 className="font-data mt-2 text-xs tracking-widest uppercase">{t('divergence')}</h3>
          <p>{additive.notableDivergence ?? t('noDivergence')}</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-2xl font-extrabold">{t('foundIn')}</h2>
          {links.length === 0 ? (
            <p className="text-[var(--surface-muted)]">{t('notFoundIn')}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {links.map(({ item, market }) => (
                <li key={`${item.chainSlug}-${item.slug}`}>
                  <Link
                    href={itemPath(locale, item.chainSlug, item.slug, market)}
                    className="flex items-baseline gap-2 border-[1.5px] border-ink p-3"
                  >
                    <span>{item.name}</span>
                    <span className="font-data ms-auto text-xs" data-numeric>
                      {market}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <SourceList
          locale={locale}
          groups={[{ heading: tSources('title'), sources: additive.sources as Source[] }]}
        />

        <div className="rule-strike" aria-hidden="true" />
        <Disclaimers withMedical={true} />
      </main>
      <SiteFooter locale={locale} path={`/decoder/${additive.slug}`} />
    </>
  );
}
