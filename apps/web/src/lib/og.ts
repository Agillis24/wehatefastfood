import { readFileSync } from 'node:fs';
import path from 'node:path';
import { SITE_ORIGIN } from '@/lib/site';

/**
 * The per-item share cards, looked up through the manifest the generator wrote.
 *
 * READ FROM DISK, NOT IMPORTED. `apps/web/src/generated/` is gitignored, so a
 * fresh clone has no manifest until something has been built - and a bare
 * `import manifest from '@/generated/og-manifest.json'` would make typecheck
 * fail on that clone rather than on anything real. CI is a fresh clone.
 *
 * A MANIFEST RATHER THAN A CONSTRUCTED FILENAME. The filenames carry a content
 * hash, so a page cannot compute one; it has to be told. That is the point of
 * the hash - Facebook caches share images by URL and will not re-fetch one that
 * has not changed name, Discord re-proxies through a cache of its own, and this
 * site is on GitHub Pages where there is no Cache-Control to set and nothing to
 * purge. A card that changes at a fixed filename is a card the biggest
 * consumers keep showing the stale version of, indefinitely.
 *
 * A miss falls back to the site-wide card. That is a real state, not an error:
 * it is what every page looks like before the generator has run, and what a
 * page with no published figures looks like permanently.
 */

const MANIFEST = path.join(process.cwd(), 'src', 'generated', 'og-manifest.json');

function load(): Record<string, string> {
  try {
    const parsed: unknown = JSON.parse(readFileSync(MANIFEST, 'utf8'));
    if (typeof parsed !== 'object' || parsed === null) return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    );
  } catch {
    return {};
  }
}

// Read once per build rather than once per page: static export calls
// generateMetadata for every (locale, item, market) and the file never changes
// mid-build.
const manifest = load();

export function itemOgImage(
  chain: string,
  item: string,
  market: string,
): { url: string; width: number; height: number; type: string } | undefined {
  const file = manifest[`${chain}/${item}/${market}`];
  if (file === undefined) return undefined;

  return {
    url: `${SITE_ORIGIN}/og/items/${file}`,
    width: 1200,
    height: 630,
    type: 'image/png',
  };
}
