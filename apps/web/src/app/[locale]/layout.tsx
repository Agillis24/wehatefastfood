import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { isRtl } from '@wff/i18n';
import { AVAILABLE_LOCALES, routing, type AvailableLocale } from '@/i18n/routing';
import { SITE_ORIGIN } from '@/lib/site';
import '@/styles/globals.css';

export function generateStaticParams() {
  return AVAILABLE_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'brand' });

  return {
    metadataBase: new URL(SITE_ORIGIN),
    title: { default: t('name'), template: `%s - ${t('name')}` },
    description: t('tagline'),
    icons: { icon: '/favicon.svg' },
    robots: { index: true, follow: true },
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

  const messages = await getMessages();

  return (
    <html lang={locale} dir={isRtl(locale) ? 'rtl' : 'ltr'} data-surface="paper">
      <body>
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
