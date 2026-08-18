import type { Metadata } from 'next';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Chain } from '@wff/content';
import { Wordmark } from '@/components/brand/Wordmark';
import { Disclaimers, SiteFooter, SiteHeader } from '@/components/ui/Chrome';
import { SiteStructuredData } from '@/components/content/StructuredData';
import { AVAILABLE_LOCALES } from '@/i18n/routing';
import { getContent } from '@/lib/content';
import { chainPath, chainsPath, itemPath } from '@/lib/url';
import { grams } from '@/lib/format';
import { pageMetadata } from '@/lib/metadata';

export function generateStaticParams() {
  return AVAILABLE_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'brand' });
  const home = await getTranslations({ locale, namespace: 'home' });

  return pageMetadata({
    locale,
    path: '',
    // Absolute, or the layout template makes it "We Hate Fast Food - We Hate Fast Food".
    title: t('name'),
    absoluteTitle: true,
    description: `${home('hero.leadIn')} ${home('hero.thesis')}`,
  });
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const repo = await getContent();
  const chains = await repo.listChains();

  /*
   * The single most sugar in one portion, anywhere in the repo, found rather
   * than chosen. Picking an item by hand would mean editing this file every
   * time a bigger one lands, and the version that is not edited is the version
   * that lies.
   */
  const items = await repo.listItems();
  let best: Highlight | null = null;
  let most = 0;
  for (const item of items) {
    for (const variant of item.variants) {
      const panel = variant.nutrition.find((n) => n.basis === 'per-serving');
      const sugars = panel?.sugarsG;
      if (sugars == null || sugars <= most) continue;
      const chain = chains.find((c) => c.slug === item.chainSlug);
      if (!chain) continue;
      most = sugars;
      best = {
        grams: grams(locale, sugars),
        item: item.name,
        chain: chain.name,
        market: variant.market,
        href: itemPath(locale, item.chainSlug, item.slug, variant.market),
      };
    }
  }

  return <HomeView locale={locale} chains={[...chains]} highlight={best} />;
}

type Highlight = {
  grams: string;
  item: string;
  chain: string;
  market: string;
  href: string;
};

function HomeView({
  locale,
  chains,
  highlight,
}: {
  locale: string;
  chains: Chain[];
  highlight: Highlight | null;
}) {
  const t = useTranslations('home');
  const brand = useTranslations('brand');
  const nav = useTranslations('nav');

  return (
    <>
      <SiteStructuredData locale={locale} name={brand('name')} description={brand('tagline')} />
      <SiteHeader locale={locale} />

      <main id="main" className="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-10">
        <section className="flex flex-col gap-5">
          <Wordmark className="w-full max-w-2xl" />
          <p className="max-w-prose text-xl">
            <span className="mark-pink">{brand('tagline')}</span>
          </p>
          <p className="max-w-prose text-lg">{t('hero.leadIn')}</p>
        </section>

        <div className="rule-strike" aria-hidden="true" />

        {/*
          The brief asks for one startling verified figure here, and for a long
          time there was not a single real figure in the repo, so the slot said
          so instead: "no content has been published and no figure on this page
          is real."

          That notice was correct and then stopped being correct, and it did not
          notice - it was unconditional, with the phase number written in by
          hand. So the site went on telling readers its figures were not real
          while serving two chains, 298 items and numbers checked twice against
          their sources. Understating is not modesty when it is false; a site
          whose whole claim is that its numbers are right cannot go around
          saying they are not.

          The figure is now COMPUTED from the repo, so it cannot be stale and
          cannot be invented, and the scaffold notice is what shows when there
          is genuinely nothing - which is the only state in which it is true.
        */}
        {highlight ? (
          <section className="flex flex-col gap-3">
            <p className="font-data text-xs tracking-widest uppercase">{t('highlight.label')}</p>
            <p className="max-w-prose font-display text-3xl font-extrabold">
              {t('highlight.sugar', { grams: highlight.grams, item: highlight.item })}
            </p>
            <p className="max-w-prose text-[var(--surface-muted)]">
              {t('highlight.caveat', { chain: highlight.chain, market: highlight.market })}
            </p>
            <Link href={highlight.href} className="underline underline-offset-4">
              {t('highlight.link')}
            </Link>
          </section>
        ) : (
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-3xl font-extrabold">{t('scaffold.title')}</h2>
            <p className="max-w-prose text-[var(--surface-muted)]">{t('scaffold.body')}</p>
          </section>
        )}

        <section className="flex flex-col gap-4">
          <h2 className="font-display text-3xl font-extrabold">{nav('chains')}</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {chains.map((chain) => (
              <li key={chain.slug}>
                <Link
                  href={chainPath(locale, chain.slug)}
                  className="flex flex-col gap-1 border-[1.5px] border-ink p-4"
                >
                  <span className="font-display text-xl font-extrabold">{chain.name}</span>
                  <span className="text-sm text-[var(--surface-muted)]">{chain.oneLiner}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={chainsPath(locale)}
            className="font-data self-start border-[1.5px] border-ink px-4 py-3 text-sm"
          >
            {t('hero.cta')}
          </Link>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-display text-3xl font-extrabold">{t('decoder.title')}</h2>
          <p className="max-w-prose text-[var(--surface-muted)]">{t('decoder.body')}</p>
        </section>

        {/* Reserved for the YouTube channel. Built now, empty until it exists. */}
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-3xl font-extrabold">{t('video.title')}</h2>
          <p className="border-[1.5px] border-dashed border-[var(--surface-rule)] p-4 text-[var(--surface-muted)]">
            {t('video.empty')}
          </p>
        </section>

        {/* Disabled rather than faked: we store nothing, so we ask for nothing. */}
        <section className="flex flex-col gap-2">
          <h2 className="font-display text-3xl font-extrabold">{t('newsletter.title')}</h2>
          <p className="border-[1.5px] border-dashed border-[var(--surface-rule)] p-4 text-[var(--surface-muted)]">
            {t('newsletter.disabled')}
          </p>
        </section>

        <div className="rule-strike" aria-hidden="true" />
        <Disclaimers withMedical={false} />
      </main>

      <SiteFooter locale={locale} path="" />
    </>
  );
}
