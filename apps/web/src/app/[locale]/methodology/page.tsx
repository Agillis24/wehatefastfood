import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AVAILABLE_LOCALES } from '@/i18n/routing';
import { pageMetadata } from '@/lib/metadata';
import { StaticPage, toSections } from '@/components/content/StaticPage';

/**
 * The page that separates this from a rage blog. It states the rules the rest
 * of the site is held to - including the ones that are not yet satisfied, which
 * is the section that makes the others worth anything.
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
  const t = await getTranslations({ locale, namespace: 'pages.methodology' });
  return pageMetadata({ locale, path: '/methodology', title: t('title'), description: t('lede') });
}

export default async function MethodologyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <MethodologyView locale={locale} />;
}

function MethodologyView({ locale }: { locale: string }) {
  const t = useTranslations('pages.methodology');

  return (
    <StaticPage
      locale={locale}
      path="/methodology"
      title={t('title')}
      lede={t('lede')}
      sections={toSections(t.raw('sections'))}
    />
  );
}
