import type { Metadata } from 'next';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AVAILABLE_LOCALES } from '@/i18n/routing';
import { CompareScript } from '@/components/ui/CompareScript';
import { Disclaimers, SiteFooter, SiteHeader } from '@/components/ui/Chrome';
import { getContent } from '@/lib/content';
import { comparePath } from '@/lib/url';
import { pageMetadata } from '@/lib/metadata';

/**
 * Compare, up to three items.
 *
 * One static page for every possible selection, because the selection lives in
 * the URL hash and a hash never reaches the server. See CompareScript for why.
 *
 * The comparison is still shareable - that was the whole point of putting it in
 * the URL - it is simply assembled in the browser from a build-time index
 * rather than rendered per request.
 */

export function generateStaticParams() {
  return AVAILABLE_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'compare' });
  return pageMetadata({
    locale,
    path: '/compare',
    title: t('title'),
    description: t('subtitle'),
  });
}

/**
 * Ready-made comparisons for the empty state.
 *
 * The page used to answer "nothing selected" with the URL syntax and an
 * invitation to type it. That is a manual, not an offer, and the syntax it
 * printed was wrong anyway - it omitted the hash, so anyone who followed it
 * landed right back on the empty page.
 *
 * These are BUILT FROM THE REPO rather than written down, so they cannot rot
 * into links to items that no longer exist. Pairs come from within one chain,
 * because comparing two things from the same menu is the question people
 * actually have, and only from items that carry a per-serving panel - a
 * comparison of two unpublished panels shows nothing.
 */
async function suggestions(locale: string) {
  const repo = await getContent();
  const items = await repo.listItems();
  const chains = await repo.listChains();

  const byChain = new Map<string, { slug: string; name: string; market: string; kj: number }[]>();
  for (const item of items) {
    for (const variant of item.variants) {
      const panel = variant.nutrition.find((n) => n.basis === 'per-serving' && n.energyKJ != null);
      if (!panel?.energyKJ) continue;
      const list = byChain.get(item.chainSlug) ?? [];
      list.push({ slug: item.slug, name: item.name, market: variant.market, kj: panel.energyKJ });
      byChain.set(item.chainSlug, list);
      break;
    }
  }

  const out: { href: string; label: string }[] = [];
  for (const chain of chains) {
    /*
     * The BIGGEST against the SMALLEST, not the first two the loop happened to
     * meet. Sorted alphabetically this offered "7UP zero sugar and Americano",
     * which answers a question nobody has. A comparison is worth clicking when
     * the two sides differ, and the widest gap in a menu is the one that shows
     * what the menu is doing.
     */
    const list = [...(byChain.get(chain.slug) ?? [])].sort((x, y) => y.kj - x.kj);
    const a = list[0];
    const b = list[list.length - 1];
    /* Both halves must sit in the same market, or the table has a column the
     * other side cannot answer and the comparison shows nothing. */
    if (!a || !b || a.slug === b.slug || a.market !== b.market) continue;
    out.push({
      href: comparePath(locale, a.market, [
        { chain: chain.slug, item: a.slug },
        { chain: chain.slug, item: b.slug },
      ]),
      label: `${chain.name} ${a.name} a ${b.name}`,
    });
    if (out.length === 3) break;
  }
  return out;
}

export default async function ComparePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CompareView locale={locale} picks={await suggestions(locale)} />;
}

function CompareView({
  locale,
  picks,
}: {
  locale: string;
  picks: { href: string; label: string }[];
}) {
  const t = useTranslations('compare');
  const tRow = useTranslations('compare.row');

  // Handed to the script as data, so every string still comes from the
  // catalogue and nothing is hard-coded in the browser.
  const labels = {
    title: t('title'),
    market: t('market'),
    nutrient: t('nutrient'),
    notPublished: t('notPublished'),
    unknown: t('unknownItem', { slug: '{slug}' }),
    rows: {
      energy: tRow('energy'),
      fat: tRow('fat'),
      saturates: tRow('saturates'),
      sugars: tRow('sugars'),
      salt: tRow('salt'),
    },
  };

  return (
    <>
      <SiteHeader locale={locale} />
      <main id="main" className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
        <h1 className="font-display text-4xl font-black tracking-tight">{t('title')}</h1>
        <p className="max-w-prose text-[var(--surface-muted)]">{t('subtitle')}</p>

        <div id="compare-empty" className="flex flex-col gap-3">
          <p>{t('empty')}</p>
          {picks.length ? (
            <>
              <p className="text-sm text-[var(--surface-muted)]">{t('suggestions')}</p>
              <ul className="flex flex-col gap-2">
                {picks.map((pick) => (
                  <li key={pick.href}>
                    <Link href={pick.href} className="underline underline-offset-4">
                      {pick.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>

        <div id="compare-result" data-labels={JSON.stringify(labels)} />

        <CompareScript />

        <div className="rule-strike" aria-hidden="true" />
        <Disclaimers />
      </main>
      <SiteFooter locale={locale} path="/compare" />
    </>
  );
}
