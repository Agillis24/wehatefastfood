import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import type { Chain } from '@wff/content';
import { Wordmark } from '@/components/brand/Wordmark';
import { Disclaimers, SiteFooter, SiteHeader } from '@/components/ui/Chrome';
import { AVAILABLE_LOCALES } from '@/i18n/routing';
import { getContent } from '@/lib/content';
import { chainPath, chainsPath } from '@/lib/url';

export function generateStaticParams() {
  return AVAILABLE_LOCALES.map((locale) => ({ locale }));
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
          The brief asks for one startling verified figure here. There is not a
          single real figure in the repo yet, and inventing one to fill a hero
          slot is precisely the failure this project cannot survive. The slot
          stays empty and says so until a real chain lands.
        */}
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-3xl font-extrabold">{t('scaffold.title')}</h2>
          <p className="max-w-prose text-[var(--surface-muted)]">{t('scaffold.body')}</p>
          <p className="font-data text-sm" data-numeric>
            {t('scaffold.phase', { n: 3 })}
          </p>
        </section>

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

      <SiteFooter locale={locale} />
    </>
  );
}
