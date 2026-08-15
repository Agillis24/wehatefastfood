import type { MetadataRoute } from 'next';
import { SITE_ORIGIN } from '@/lib/site';
import { isIndexable } from '@/lib/launch';

/**
 * Closed by default.
 *
 * A deployment with no published content is a deployment with nothing worth
 * crawling, and an empty site indexed on the real domain is a slow thing to
 * undo. See lib/launch.ts for the two conditions that open it.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const indexable = await isIndexable();

  if (!indexable) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
      host: SITE_ORIGIN,
    };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // The translate endpoint is a POST API, not a document.
        disallow: ['/api/'],
      },
    ],
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    host: SITE_ORIGIN,
  };
}
