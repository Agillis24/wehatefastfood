/**
 * Canonical origin for the site.
 *
 * Needed well before deployment: sitemaps, canonical links, hreflang alternates
 * and OG image URLs all have to be absolute, and a placeholder that leaks into
 * production is the kind of thing nobody finds until Google has indexed it.
 * So it lives here, once, and everything derives from it.
 *
 * CANONICAL HOST IS `www`, decided 2026-08-14. Both hosts will resolve, but only
 * one may be canonical or every page competes with a duplicate of itself in
 * search. Phase 6 configures the apex as a 301 to www at the hosting layer:
 *
 *     wehatefastfood.com  ->  301  ->  www.wehatefastfood.com
 *
 * Do not "fix" a canonical URL by dropping the www. If the canonical host ever
 * changes, change it here and nowhere else.
 *
 * Override per environment with NEXT_PUBLIC_SITE_ORIGIN - preview deployments
 * set it to their own URL so preview pages do not emit production canonicals.
 * This is deliberately a public value: it is the address of a public website,
 * not a secret.
 */

export const SITE_ORIGIN: string =
  process.env['NEXT_PUBLIC_SITE_ORIGIN'] ?? 'https://www.wehatefastfood.com';

/** Hosts that must 301 to SITE_ORIGIN. Asserted by the Phase 6 deploy checks. */
export const REDIRECT_HOSTS: readonly string[] = ['wehatefastfood.com'];

/**
 * The public repository.
 *
 * Named on /about, /legal and /privacy as the way to check what is claimed and
 * to report a correction, so it is a load-bearing link rather than a credit: if
 * it ever moves, the transparency claim on three pages moves with it.
 */
export const REPO_URL = 'https://github.com/Agillis24/wehatefastfood';

/**
 * The project's own accounts.
 *
 * Used twice, and both uses matter: as links in the footer, and as `sameAs` in
 * the Organization structured data, which is how a search engine or an
 * assistant establishes that the site, the channel and the Instagram account
 * are one publisher rather than three. Adding an account to only one of the two
 * places is the easy mistake - keep this list as the single source.
 */
export const SOCIAL = [
  { key: 'youtube', url: 'https://www.youtube.com/@wehatefastfood' },
  { key: 'instagram', url: 'https://www.instagram.com/wehatefastfood/' },
  { key: 'facebook', url: 'https://www.facebook.com/profile.php?id=61593011146180' },
] as const;

/** Named on /privacy, because GitHub is who actually receives the request. */
export const HOST_PRIVACY_URL =
  'https://docs.github.com/site-policy/privacy-policies/github-privacy-statement';

export function absoluteUrl(pathname: string): string {
  return new URL(pathname, SITE_ORIGIN).toString();
}

/**
 * An absolute URL with exactly one trailing slash.
 *
 * next.config sets `trailingSlash: true`, so every page really lives at a
 * slashed path, but the helpers in lib/url.ts return unslashed ones. Next
 * silently normalises the value it puts in `alternates.canonical`, which hid
 * the problem: the rendered canonical was right while the same string, used
 * anywhere Next does not touch it, was wrong. It reached the JSON-LD as the
 * MenuItem @id and as every BreadcrumbList item - so the identifier a search
 * engine or an assistant keys the page on pointed at a redirect.
 *
 * Canonical, og:url, hreflang href, sitemap entry and JSON-LD @id have to be
 * BYTE-IDENTICAL. Anything else is two objects as far as every consumer is
 * concerned, and two social-preview caches. Everything goes through here.
 */
export function canonicalUrl(pathname: string): string {
  // A fragment or a query is not part of the path, so the slash must not land
  // after it. "/#organisation" is a JSON-LD node identifier and
  // "/#organisation/" is a different one - which is exactly the sort of silent
  // near-miss that makes two entities out of one and still looks plausible in
  // the emitted markup.
  const split = pathname.search(/[?#]/);
  const pathOnly = split === -1 ? pathname : pathname.slice(0, split);
  const rest = split === -1 ? '' : pathname.slice(split);
  const withSlash = pathOnly.endsWith('/') ? pathOnly : `${pathOnly}/`;

  return new URL(`${withSlash}${rest}`, SITE_ORIGIN).toString();
}
