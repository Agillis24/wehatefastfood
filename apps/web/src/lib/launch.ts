import { getContent } from '@/lib/content';

/**
 * Whether this deployment may be indexed by search engines.
 *
 * TWO conditions, and both must hold:
 *
 *   1. NEXT_PUBLIC_ALLOW_INDEXING is "1" - a deliberate human decision;
 *   2. the build actually contains published content.
 *
 * The second condition is the interesting one. It means the site cannot be
 * opened to crawlers by flipping an environment variable while there is nothing
 * on it, which is exactly the mistake that is easy to make at the end of a long
 * build: the infrastructure works, everything is green, and it feels finished.
 * An empty site indexed on the real domain is a slow problem to undo.
 *
 * It is the same discipline the content layer applies to figures, pointed at
 * the deployment: the default is "we do not have it yet", and saying otherwise
 * takes a positive act.
 */
export async function isIndexable(): Promise<boolean> {
  if (process.env['NEXT_PUBLIC_ALLOW_INDEXING'] !== '1') return false;

  const repo = await getContent();
  const chains = await repo.listChains();
  return chains.length > 0;
}

/** Why indexing is off, for the deploy checklist and the robots comment. */
export async function indexingBlockedBecause(): Promise<string | null> {
  if (process.env['NEXT_PUBLIC_ALLOW_INDEXING'] !== '1') {
    return 'NEXT_PUBLIC_ALLOW_INDEXING is not set to 1';
  }
  const repo = await getContent();
  if ((await repo.listChains()).length === 0) {
    return 'no published chains in this build';
  }
  return null;
}
