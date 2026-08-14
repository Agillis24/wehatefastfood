import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Wordmark } from '@/components/brand/Wordmark';
import { chainsPath, homePath, itemPath } from '@/lib/url';

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

export function SiteFooter({ locale }: { locale: string }) {
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
        <Disclaimers />
        {/* Discreet, not preachy, and never on the same line as a calorie count. */}
        <p className="text-xs text-[var(--surface-muted)]">{tDisclaimer('support')}</p>
      </div>
    </footer>
  );
}
