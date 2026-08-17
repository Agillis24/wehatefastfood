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

/** Named on /privacy, because GitHub is who actually receives the request. */
export const HOST_PRIVACY_URL =
  'https://docs.github.com/site-policy/privacy-policies/github-privacy-statement';

export function absoluteUrl(pathname: string): string {
  return new URL(pathname, SITE_ORIGIN).toString();
}
