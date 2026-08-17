import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AVAILABLE_LOCALES } from '@/i18n/routing';
import { REPO_URL } from '@/lib/site';
import { pageMetadata } from '@/lib/metadata';
import { StaticPage, toSections } from '@/components/content/StaticPage';

/** The public statement of the position documented for the project in docs/LEGAL.md. */

export function generateStaticParams() {
  return AVAILABLE_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pages.legal' });
  return pageMetadata({ locale, path: '/legal', title: t('title'), description: t('lede') });
}

export default async function LegalPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalView locale={locale} />;
}

function LegalView({ locale }: { locale: string }) {
  const t = useTranslations('pages.legal');

  return (
    <StaticPage
      locale={locale}
      path="/legal"
      title={t('title')}
      lede={t('lede')}
      sections={toSections(t.raw('sections'))}
    >
      <p>
        <a
          href={`${REPO_URL}/issues`}
          rel="noopener external"
          className="underline decoration-pink decoration-2 underline-offset-2"
        >
          {t('repoLink')}
        </a>
      </p>
    </StaticPage>
  );
}
