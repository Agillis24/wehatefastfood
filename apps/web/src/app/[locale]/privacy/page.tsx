import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AVAILABLE_LOCALES } from '@/i18n/routing';
import { HOST_PRIVACY_URL } from '@/lib/site';
import { pageMetadata } from '@/lib/metadata';
import { StaticPage, toSections } from '@/components/content/StaticPage';

/**
 * Every claim on this page was verified against the built site before it was
 * written: no cookies, nothing in browser storage, and not one request to any
 * origin other than our own, across the home, item, decoder and compare pages.
 *
 * If you add an analytics snippet, a hosted font, an embed or anything else
 * that reaches off this domain, this page is wrong the moment you do, and it is
 * the page a reader is most entitled to rely on. Change it in the same commit.
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
  const t = await getTranslations({ locale, namespace: 'pages.privacy' });
  return pageMetadata({ locale, path: '/privacy', title: t('title'), description: t('lede') });
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PrivacyView locale={locale} />;
}

function PrivacyView({ locale }: { locale: string }) {
  const t = useTranslations('pages.privacy');

  return (
    <StaticPage
      locale={locale}
      path="/privacy"
      title={t('title')}
      lede={t('lede')}
      sections={toSections(t.raw('sections'))}
    >
      <p>
        <a
          href={HOST_PRIVACY_URL}
          rel="nofollow noopener external"
          className="underline decoration-pink decoration-2 underline-offset-2"
        >
          {t('hostLink')}
        </a>
      </p>
    </StaticPage>
  );
}
