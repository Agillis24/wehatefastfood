import { useTranslations } from 'next-intl';
import { SOCIAL } from '@/lib/site';

/**
 * Links to the project's own accounts.
 *
 * Drawn here as inline SVG rather than loaded from anywhere. /privacy states
 * that the site loads nothing from a third party, and an icon font or a hosted
 * sprite would make that page a lie the moment it shipped - there is a test
 * that fails if any page requests another host, and it would have caught this.
 *
 * The glyphs are simplified marks, in our own ink, at our own weight. They are
 * used nominatively, to point at our accounts on those platforms, which is the
 * one use of somebody else's mark this project allows itself - and the same
 * reasoning docs/LEGAL.md §1 applies to chain names.
 *
 * Each link carries a real accessible name; the icon is decorative and hidden,
 * because "link" announced three times in a row is not a footer anyone can use.
 */

const PATHS: Record<string, string> = {
  /*
   * Rounded screen with a play triangle.
   *
   * DRAWN TO THE SAME OPTICAL HEIGHT AS THE OTHER TWO. The first version ran
   * from y=3.8 to y=16.2, so it was 12.4 units tall in a box where Instagram
   * and Facebook are 18, and it was the widest of the three. Next to them it
   * read as squashed. A play button is genuinely wider than it is tall, so it
   * cannot be square, but 15 units carries the same weight as the neighbours
   * instead of sitting in the middle looking stepped on.
   */
  youtube:
    'M6.4 4.5h11.2A4.4 4.4 0 0 1 22 8.9v6.2a4.4 4.4 0 0 1-4.4 4.4H6.4A4.4 4.4 0 0 1 2 15.1V8.9a4.4 4.4 0 0 1 4.4-4.4Z M10 8.4v7.2l6.2-3.6Z',
  // Rounded square, lens, and the corner dot.
  instagram:
    'M7.4 3h9.2A4.4 4.4 0 0 1 21 7.4v9.2a4.4 4.4 0 0 1-4.4 4.4H7.4A4.4 4.4 0 0 1 3 16.6V7.4A4.4 4.4 0 0 1 7.4 3Z M12 8.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2Z M17.3 6.1a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z',
  // The f, in a rounded square.
  facebook:
    'M5.2 3h13.6A2.2 2.2 0 0 1 21 5.2v13.6a2.2 2.2 0 0 1-2.2 2.2H14.9v-6.6h2.2l.4-2.7h-2.6V9.9c0-.7.2-1.2 1.2-1.2h1.4V6.3a15 15 0 0 0-2-.1c-2 0-3.4 1.2-3.4 3.5v1.9H9.9v2.7h2.2V21H5.2A2.2 2.2 0 0 1 3 18.8V5.2A2.2 2.2 0 0 1 5.2 3Z',
};

export function SocialLinks() {
  const t = useTranslations('footer.social');

  return (
    <ul className="flex items-center gap-3">
      {SOCIAL.map((account) => (
        <li key={account.key}>
          <a
            href={account.url}
            rel="me noopener external"
            className="flex size-10 items-center justify-center border-[1.5px] border-ink"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
              fillRule="evenodd"
              aria-hidden="true"
            >
              <path d={PATHS[account.key] ?? ''} />
            </svg>
            <span className="sr-only">{t(account.key as 'youtube')}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
