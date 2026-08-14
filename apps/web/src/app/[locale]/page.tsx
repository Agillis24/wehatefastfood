import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Wordmark } from '@/components/brand/Wordmark';
import { AVAILABLE_LOCALES } from '@/i18n/routing';

export function generateStaticParams() {
  return AVAILABLE_LOCALES.map((locale) => ({ locale }));
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  // Required for static rendering; without it the page opts into dynamic.
  setRequestLocale(locale);
  return <HomeContent />;
}

function HomeContent() {
  const t = useTranslations('home');
  const common = useTranslations('brand');
  const disclaimer = useTranslations('disclaimer');

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-8 px-4 py-12">
      <header className="flex flex-col gap-4">
        <Wordmark className="w-full max-w-xl" />
        <p className="text-[var(--surface-muted)]">{common('tagline')}</p>
      </header>

      <section className="flex flex-col gap-3">
        <p className="text-xl">{t('hero.leadIn')}</p>
        <p className="text-xl">
          <span className="mark-pink">{t('hero.thesis')}</span>
        </p>
      </section>

      <div className="rule-strike my-6" aria-hidden="true" />

      <section className="flex flex-col gap-2">
        <h2 className="font-data text-sm tracking-widest uppercase">{t('scaffold.title')}</h2>
        <p className="text-[var(--surface-muted)]">{t('scaffold.body')}</p>
        <p className="font-data text-sm" data-numeric>
          {t('scaffold.phase', { n: 1 })}
        </p>
      </section>

      <footer className="mt-auto flex flex-col gap-2 pt-8 text-sm text-[var(--surface-muted)]">
        <p>{disclaimer('notAffiliated')}</p>
        <p>{disclaimer('notMedical')}</p>
      </footer>
    </main>
  );
}
