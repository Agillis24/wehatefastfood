import type { Metadata, Viewport } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { isRtl } from '@wff/i18n';
import { AVAILABLE_LOCALES, routing, type AvailableLocale } from '@/i18n/routing';
import { SITE_ORIGIN } from '@/lib/site';
import { isIndexable } from '@/lib/launch';
import '@/styles/globals.css';

export function generateStaticParams() {
  return AVAILABLE_LOCALES.map((locale) => ({ locale }));
}

/**
 * theme-color lives here and not in `metadata`, where Next has deprecated it
 * since v14 and where it is silently dropped rather than warned about.
 */
export const viewport: Viewport = {
  themeColor: '#16120F',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'brand' });
  const indexable = await isIndexable();

  return {
    metadataBase: new URL(SITE_ORIGIN),
    title: { default: t('name'), template: `%s - ${t('name')}` },
    description: t('tagline'),
    icons: { icon: '/favicon.svg' },
    // Belt as well as braces: robots.txt closes the site, and every page says
    // so itself. A crawler that ignores one is unlikely to ignore both.
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!(routing.locales as readonly string[]).includes(locale)) {
    notFound();
  }

  // Required for static rendering; without it every page opts into dynamic.
  setRequestLocale(locale as AvailableLocale);

  return (
    <html lang={locale} dir={isRtl(locale) ? 'rtl' : 'ltr'} data-surface="paper">
      {/*
        NO NextIntlClientProvider HERE, deliberately.
        Providing it at the layout serialises the ENTIRE message catalogue into
        every page, including the pages that use none of it - measured at +14 kB
        on the item page once the decoder and compare catalogues existed. Server
        components read messages directly from the request config and need no
        provider. The one client component that does need messages wraps itself
        in a provider carrying only its own namespace.
      */}
      <body>{children}</body>
    </html>
  );
}
