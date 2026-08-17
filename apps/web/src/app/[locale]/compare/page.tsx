import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { AVAILABLE_LOCALES } from '@/i18n/routing';
import { CompareScript } from '@/components/ui/CompareScript';
import { Disclaimers, SiteFooter, SiteHeader } from '@/components/ui/Chrome';

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

export default async function ComparePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CompareView locale={locale} />;
}

function CompareView({ locale }: { locale: string }) {
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
        <h1 className="font-display text-4xl font-black">{t('title')}</h1>
        <p className="max-w-prose text-[var(--surface-muted)]">{t('subtitle')}</p>

        <div id="compare-empty" className="flex flex-col gap-2">
          <p>{t('empty')}</p>
          <p className="font-data text-sm text-[var(--surface-muted)]">{t('howTo')}</p>
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
