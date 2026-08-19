/**
 * Market lives in the PATH, not in a query string and not only in a cookie.
 *
 * Why not a cookie: a shared link must show the recipient the same numbers as
 * the sender. Anything else silently corrupts the one thing this site promises.
 *
 * Why not a query string, which is what docs/PLAN.md §2.2 originally specified:
 * Next cannot statically generate a page per query value, and reading
 * searchParams opts the route into dynamic rendering. The brief requires static
 * generation, so the market became a path segment. Same principle - the URL
 * names the jurisdiction - implemented in the form that actually prerenders.
 *
 *   /{locale}/chains/{chain}/{item}/{market}
 *
 * Each (item, market) pair is therefore a real, separately rendered, separately
 * cacheable page with its own canonical URL, its own verifiedOn and its own
 * structured data.
 */

export function itemPath(locale: string, chain: string, item: string, market: string): string {
  return `/${locale}/chains/${chain}/${item}/${market}`;
}

export function chainPath(locale: string, chain: string): string {
  return `/${locale}/chains/${chain}`;
}

export function chainsPath(locale: string): string {
  return `/${locale}/chains`;
}

export function decoderPath(locale: string): string {
  return `/${locale}/decoder`;
}

export function homePath(locale: string): string {
  return `/${locale}`;
}

/**
 * A shareable comparison. The selection lives in the HASH so a single static
 * page can answer any of them - a hash never reaches the server.
 *
 *   /en/compare/#GB/chain~item/chain~item
 */
export function comparePath(
  locale: string,
  market: string,
  items: readonly { chain: string; item: string }[],
): string {
  const selection = items.map((i) => `${i.chain}~${i.item}`).join('/');
  return `/${locale}/compare/#${market}/${selection}`;
}
