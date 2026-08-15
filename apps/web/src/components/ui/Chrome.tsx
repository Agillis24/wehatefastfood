import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Wordmark } from '@/components/brand/Wordmark';
import { chainsPath, homePath, itemPath } from '@/lib/url';
import { AVAILABLE_LOCALES } from '@/i18n/routing';
import { LANGUAGE_NAMES } from '@/lib/languages';

/**
 * Site chrome. Server components, zero JavaScript.
 *
 * The market switcher is a row of LINKS, not a control needing a client
 * runtime, because the market is a path segment. That makes it the cheapest
 * implementation and the one that produces a shareable address.
 */

export function SiteHeader({ locale }: { locale: string }) {
  const t = useTranslations('nav');

  const nav = [
    { key: 'chains', href: chainsPath(locale) },
    { key: 'decoder', href: `/${locale}/decoder` },
    { key: 'compare', href: `/${locale}/compare` },
  ] as const;

  return (
    <header className="border-b-[1.5px] border-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-10 focus:bg-pink focus:p-2 focus:text-ink"
      >
        {t('skipToContent')}
      </a>
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-4 py-3">
        <Link href={homePath(locale)} className="shrink-0">
          <Wordmark className="h-10 w-auto" />
        </Link>
        <nav aria-label={t('chains')} className="font-data ms-auto flex gap-4 text-sm">
          {nav.map((entry) => (
            <Link
              key={entry.key}
              href={entry.href}
              className="underline decoration-pink decoration-2 underline-offset-4"
            >
              {t(entry.key)}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function MarketSwitcher({
  locale,
  chain,
  item,
  markets,
  current,
}: {
  locale: string;
  chain: string;
  item: string;
  markets: readonly string[];
  current: string;
}) {
  const t = useTranslations('market');

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-data text-xs tracking-widest uppercase">{t('label')}</span>
      <ul className="flex flex-wrap gap-1">
        {markets.map((market) => (
          <li key={market}>
            <Link
              href={itemPath(locale, chain, item, market)}
              aria-current={market === current ? 'true' : undefined}
              className={`font-data inline-flex min-h-11 items-center border-[1.5px] border-ink px-3 text-sm ${
                market === current ? 'bg-ink text-paper' : ''
              }`}
            >
              {market}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Plain-data mode, driven entirely by CSS (see globals.css). A checkbox and a
 * label - no client JavaScript on a page whose whole remaining budget is about
 * 26 kB.
 */
export function PlainToggle() {
  const t = useTranslations('item.plain');

  return (
    <div className="flex items-center">
      <input type="checkbox" id="plain-toggle" className="plain-toggle peer" />
      <label
        htmlFor="plain-toggle"
        className="font-data inline-flex min-h-11 cursor-pointer items-center border-[1.5px] border-ink px-3 text-sm peer-checked:bg-ink peer-checked:text-paper"
      >
        {t('on')}
        <span className="sr-only">{t('hint')}</span>
      </label>
    </div>
  );
}

export function Disclaimers({ withMedical = true }: { withMedical?: boolean }) {
  const t = useTranslations('disclaimer');

  return (
    <div className="flex flex-col gap-2 text-xs text-[var(--surface-muted)]">
      <p>{t('notAffiliated')}</p>
      {withMedical ? <p>{t('notMedical')}</p> : null}
      <p>{t('figuresChange')}</p>
    </div>
  );
}

/**
 * Language picker.
 *
 * Tier-1 locales are links to THE SAME PAGE in the other language, which is why
 * every page hands the footer its own locale-less path. Dropping a reader on
 * the home page because they changed language is a small betrayal that is
 * completely avoidable.
 *
 * A <details> rather than a listbox: zero JavaScript, keyboard-operable, and it
 * scales to the full tier-2 list without a search box that would need a runtime.
 */
export function LanguagePicker({ locale, path }: { locale: string; path: string }) {
  const t = useTranslations('language');

  return (
    <details className="font-data text-sm">
      <summary className="inline-flex min-h-11 cursor-pointer list-none items-center border-[1.5px] border-ink px-3">
        {t('label')}
        <span className="ms-2 font-semibold">{LANGUAGE_NAMES[locale] ?? locale}</span>
      </summary>

      <div className="mt-2 flex flex-col gap-2 border-[1.5px] border-ink p-3">
        <p className="text-xs tracking-widest uppercase">{t('reviewed')}</p>
        <ul className="flex flex-wrap gap-2">
          {AVAILABLE_LOCALES.map((available) => (
            <li key={available}>
              <Link
                href={`/${available}${path}`}
                hrefLang={available}
                aria-current={available === locale ? 'true' : undefined}
                className={`inline-flex min-h-11 items-center border-[1.5px] border-ink px-3 ${
                  available === locale ? 'bg-ink text-paper' : ''
                }`}
              >
                {LANGUAGE_NAMES[available] ?? available}
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-xs text-[var(--surface-muted)]">{t('moreComing')}</p>
      </div>
    </details>
  );
}

export function SiteFooter({ locale, path = '' }: { locale: string; path?: string }) {
  const t = useTranslations('footer');
  const tDisclaimer = useTranslations('disclaimer');

  const links = [
    { key: 'legal', href: `/${locale}/legal` },
    { key: 'privacy', href: `/${locale}/privacy` },
    { key: 'sources', href: `/${locale}/sources` },
  ] as const;

  return (
    <footer className="mt-16 border-t-[1.5px] border-ink">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8">
        <nav className="font-data flex flex-wrap gap-4 text-sm" aria-label={t('legal')}>
          {links.map((link) => (
            <Link key={link.key} href={link.href} className="underline">
              {t(link.key)}
            </Link>
          ))}
        </nav>
        <LanguagePicker locale={locale} path={path} />
        <Disclaimers />
        {/* Discreet, not preachy, and never on the same line as a calorie count. */}
        <p className="text-xs text-[var(--surface-muted)]">{tDisclaimer('support')}</p>
      </div>
    </footer>
  );
}
