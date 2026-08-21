import type { Metadata } from 'next';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Chain, MenuItem } from '@wff/content';
import { AVAILABLE_LOCALES } from '@/i18n/routing';
import { getContent } from '@/lib/content';
import { chainPath } from '@/lib/url';
import { SiteFooter, SiteHeader } from '@/components/ui/Chrome';
import { pageMetadata } from '@/lib/metadata';

/** All chains, with honest coverage badges. The gaps are the point. */

export function generateStaticParams() {
  return AVAILABLE_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'chains.index' });
  return pageMetadata({
    locale,
    path: '/chains',
    title: t('title'),
    description: t('subtitle'),
  });
}

export default async function ChainsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const repo = await getContent();
  const chains = await repo.listChains();
  const items = await repo.listItems();

  return <ChainsView locale={locale} chains={[...chains]} items={[...items]} />;
}

function ChainsView({
  locale,
  chains,
  items,
}: {
  locale: string;
  chains: Chain[];
  items: MenuItem[];
}) {
  const t = useTranslations('chains.index');
  const tStatus = useTranslations('chains.status');

  return (
    <>
      <SiteHeader locale={locale} />
      <main id="main" className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
        <h1 className="font-display text-4xl font-black tracking-tight">{t('title')}</h1>
        <p className="text-[var(--surface-muted)]">{t('subtitle')}</p>

        {chains.length === 0 ? (
          <p>{t('empty')}</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {chains.map((chain) => {
              const own = items.filter((i) => i.chainSlug === chain.slug);
              return (
                <li key={chain.slug}>
                  <Link
                    href={chainPath(locale, chain.slug)}
                    className="flex h-full flex-col gap-2 card p-4"
                  >
                    <span className="font-display text-3xl font-extrabold tracking-tight">
                      {chain.name}
                    </span>
                    <span className="text-sm text-[var(--surface-muted)]">{chain.oneLiner}</span>
                    <span className="font-data mt-auto flex flex-wrap gap-2 pt-2 text-xs tracking-widest uppercase">
                      <span className="pill px-2 py-1">{tStatus(chain.dataStatus)}</span>
                      <span className="pill border-[var(--surface-rule)] px-2 py-1">
                        {t('itemsDocumented', { count: own.length })}
                      </span>
                      <span className="pill border-[var(--surface-rule)] px-2 py-1">
                        {chain.marketsCovered.join(' ')}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <SiteFooter locale={locale} path="/chains" />
    </>
  );
}
