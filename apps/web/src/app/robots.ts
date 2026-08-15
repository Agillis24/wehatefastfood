import type { MetadataRoute } from 'next';
import { SITE_ORIGIN } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
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
