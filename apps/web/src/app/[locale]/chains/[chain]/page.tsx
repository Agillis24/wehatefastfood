import Link from 'next/link';
import { notFound } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { pickBasis, type Chain, type MenuItem } from '@wff/content';
import { AVAILABLE_LOCALES } from '@/i18n/routing';
import { getContent } from '@/lib/content';
import { chainsPath, itemPath } from '@/lib/url';
import { num } from '@/lib/format';
import { Disclaimers, SiteFooter, SiteHeader } from '@/components/ui/Chrome';

/**
 * Chain page.
 *
 * Item cards show figures for the chain's PRIMARY market, named explicitly on
 * the page. Showing a number without saying which country it describes is the
 * error this whole architecture exists to prevent, and a per-market chain page
 * would multiply the route without adding anything the item page does not.
 */

export async function generateStaticParams() {
  const repo = await getContent();
  const chains = await repo.listChains();
  return AVAILABLE_LOCALES.flatMap((locale) =>
    chains.map((chain) => ({ locale, chain: chain.slug })),
  );
}

export default async function ChainPage({
  params,
}: {
  params: Promise<{ locale: string; chain: string }>;
}) {
  const { locale, chain: chainSlug } = await params;
  setRequestLocale(locale);

  const repo = await getContent();
  const chain = await repo.getChain(chainSlug);
  if (!chain) notFound();

  const items = await repo.listItemsForChain(chainSlug);
  const primaryMarket = chain.marketsCovered[0] ?? 'GB';

  return (
    <ChainView locale={locale} chain={chain} items={[...items]} primaryMarket={primaryMarket} />
  );
}

function ChainView({
  locale,
  chain,
  items,
  primaryMarket,
}: {
  locale: string;
  chain: Chain;
  items: MenuItem[];
  primaryMarket: string;
}) {
  const t = useTranslations('chains.chain');
  const tMarket = useTranslations('market');

  return (
    <>
      <SiteHeader locale={locale} />
      <main id="main" className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
        <Link href={chainsPath(locale)} className="font-data text-sm underline">
          {t('backToChains')}
        </Link>

        <h1 className="font-display text-4xl font-black sm:text-6xl">{chain.name}</h1>
        <p className="max-w-prose">{chain.longIntro}</p>

        <div className="rule-strike" aria-hidden="true" />

        <h2 className="font-display text-2xl font-extrabold">{t('items')}</h2>
        <p className="font-data text-xs tracking-widest uppercase">
          {tMarket('label')}
          {': '}
          <span data-numeric>{primaryMarket}</span>
        </p>

        {items.length === 0 ? (
          <p>{t('noItems')}</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {items.map((item) => {
              const variant =
                item.variants.find((v) => v.market === primaryMarket) ?? item.variants[0];
              const serving = variant ? pickBasis(variant.nutrition, 'per-serving') : undefined;
              const kcal = serving?.energyKcal ?? null;
              const market = variant?.market ?? primaryMarket;

              return (
                <li key={item.slug}>
                  <Link
                    href={itemPath(locale, chain.slug, item.slug, market)}
                    className="flex h-full flex-col gap-1 border-[1.5px] border-ink p-4"
                  >
                    <span className="font-display text-xl font-extrabold">{item.name}</span>
                    <span className="font-data text-sm" data-numeric>
                      {kcal === null ? t('notPublished') : `${num(locale, kcal, 0)} ${t('kcal')}`}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <div className="rule-strike" aria-hidden="true" />
        <Disclaimers withMedical={false} />
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
