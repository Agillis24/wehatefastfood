import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AVAILABLE_LOCALES } from '@/i18n/routing';
import { absoluteUrl, REPO_URL } from '@/lib/site';
import { StaticPage, toSections } from '@/components/content/StaticPage';

export function generateStaticParams() {
  return AVAILABLE_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'pages.about' });
  return {
    title: t('title'),
    description: t('lede'),
    alternates: { canonical: absoluteUrl(`/${locale}/about/`) },
  };
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AboutView locale={locale} />;
}

function AboutView({ locale }: { locale: string }) {
  const t = useTranslations('pages.about');

  return (
    <StaticPage
      locale={locale}
      path="/about"
      title={t('title')}
      lede={t('lede')}
      sections={toSections(t.raw('sections'))}
    >
      <p>
        <a
          href={REPO_URL}
          rel="noopener external"
          className="underline decoration-pink decoration-2 underline-offset-2"
        >
          {t('repoLink')}
        </a>
      </p>
    </StaticPage>
  );
}
