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
import { chainPath, chainsPath, decoderPath } from '@/lib/url';
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

  return <HomeView locale={locale} chains={[...chains]} />;
}

function HomeView({ locale, chains }: { locale: string; chains: Chain[] }) {
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

        <section className="flex flex-col gap-4">
          <p className="eyebrow">{nav('chains')}</p>
          <h2 className="font-display text-3xl font-extrabold tracking-tight">
            {t('hero.thesis')}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {chains.map((chain) => (
              <li key={chain.slug}>
                <Link href={chainPath(locale, chain.slug)} className="card flex flex-col gap-1 p-5">
                  <span className="font-display text-xl font-extrabold tracking-tight">
                    {chain.name}
                  </span>
                  <span className="text-sm text-[var(--surface-muted)]">{chain.oneLiner}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href={chainsPath(locale)} className="font-data pill self-start px-5 py-3 text-sm">
            {t('hero.cta')}
          </Link>
        </section>

        {/*
          A DARK BAND, for rhythm down the page.

          The page was one flat cream from the wordmark to the footer, which
          makes every section weigh the same and gives the eye nowhere to land.
          One inverted block breaks that, and it lands on the decoder because
          the decoder is the part of this site nobody arrives looking for.
        */}
        <section className="band-ink flex flex-col gap-3 p-8">
          <p className="eyebrow">{nav('decoder')}</p>
          <h2 className="font-display text-3xl font-extrabold tracking-tight">
            {t('decoder.title')}
          </h2>
          <p className="max-w-prose text-[var(--color-grey-light)]">{t('decoder.body')}</p>
          <Link
            href={decoderPath(locale)}
            className="font-data mt-2 self-start rounded-[var(--radius-pill)] bg-pink px-5 py-3 text-sm text-ink"
          >
            {nav('decoder')}
          </Link>
        </section>

        <div className="rule-strike" aria-hidden="true" />
        <Disclaimers withMedical={false} />
      </main>

      <SiteFooter locale={locale} path="" />
    </>
  );
}
