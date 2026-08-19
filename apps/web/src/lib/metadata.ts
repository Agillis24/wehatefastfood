import type { Metadata } from 'next';
import { DEFAULT_LOCALE } from '@wff/i18n';
import { AVAILABLE_LOCALES } from '@/i18n/routing';
import { canonicalUrl, SITE_ORIGIN } from '@/lib/site';

/**
 * Every page's metadata, built in one place.
 *
 * THE REASON THIS IS A HELPER AND NOT A PER-PAGE OBJECT: Next merges metadata
 * SHALLOWLY. A nested field like `openGraph` declared in the layout is replaced
 * wholesale by the last segment that declares one - not merged into. So a page
 * that sets `openGraph: { images }` because it only wanted a picture silently
 * drops og:site_name, og:locale and og:type, and does it on precisely the pages
 * people share while the home page still looks correct in a preview debugger.
 *
 * The way out is to never write a partial `openGraph` anywhere. Every route
 * calls this, it always returns the complete object, and nothing overrides a
 * piece of it.
 *
 * It also emits the hreflang set, which has to be REFLEXIVE: every page lists
 * every language INCLUDING ITSELF, and each of those pages lists this one back.
 * A one-way hreflang is ignored rather than half-honoured.
 */

/**
 * og:locale wants a full language_TERRITORY tag, not a bare language.
 *
 * The territory here is the language's own home, not the market whose figures
 * the page shows. These two are separate axes on this site - `/en/.../US/` is
 * English prose about American figures - and collapsing them into og:locale
 * would tell Facebook the page is American English when the market segment is
 * already carrying that fact in the URL.
 */
const OG_LOCALE: Record<string, string> = { en: 'en_GB', cs: 'cs_CZ' };

/** The share image used until per-item Specimen Cards are wired into the build. */
export const DEFAULT_OG_IMAGE = {
  url: `${SITE_ORIGIN}/og/wff-share.png`,
  width: 1200,
  height: 630,
  type: 'image/png',
};

/**
 * A description trimmed to something a search result will actually show.
 *
 * Cut on a word boundary rather than mid-syllable, and only when there is
 * something to cut - a short description is left exactly as written.
 */
export function clamp(text: string, max = 155): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export function pageMetadata({
  locale,
  path,
  title,
  absoluteTitle = false,
  description,
  image,
  imageAlt,
}: {
  locale: string;
  /** Locale-less and slash-free, e.g. "/decoder/e621". Empty string for home. */
  path: string;
  title: string;
  /** Skip the layout title template, so the home page is not "X - X". */
  absoluteTitle?: boolean;
  description: string;
  image?: { url: string; width: number; height: number; type: string };
  imageAlt?: string;
}): Metadata {
  const url = canonicalUrl(`/${locale}${path}`);
  const picture = image ?? DEFAULT_OG_IMAGE;

  const clamped = clamp(description);

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description: clamped,
    alternates: {
      canonical: url,
      languages: {
        ...Object.fromEntries(
          AVAILABLE_LOCALES.map((other) => [other, canonicalUrl(`/${other}${path}`)]),
        ),
        /*
         * x-default points at the DEFAULT LOCALE, read from config rather than
         * written in. It used to say "/en" from when English was the source
         * language, and after the site moved to Czech that left every page
         * advertising an x-default at /en/... - a URL that does not exist,
         * because AVAILABLE_LOCALES is ['cs'] and nothing English is built.
         * Pointing search engines at a 404 on 857 pages is not a small thing.
         */
        'x-default': canonicalUrl(`/${DEFAULT_LOCALE}${path}`),
      },
    },
    openGraph: {
      type: 'website',
      siteName: 'We Hate Fast Food',
      title,
      description: clamped,
      url,
      locale: OG_LOCALE[locale] ?? 'en_GB',
      alternateLocale: AVAILABLE_LOCALES.filter((l) => l !== locale).map((l) => OG_LOCALE[l] ?? l),
      images: [{ ...picture, alt: imageAlt ?? title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: clamped,
      images: [picture.url],
    },
  };
}
