import type { MetadataRoute } from 'next';

// Required by output: export - these are files, not handlers.
export const dynamic = 'force-static';
import { SITE_ORIGIN } from '@/lib/site';
import { isIndexable } from '@/lib/launch';

/**
 * Closed by default.
 *
 * A deployment with no published content is a deployment with nothing worth
 * crawling, and an empty site indexed on the real domain is a slow thing to
 * undo. See lib/launch.ts for the two conditions that open it.
 *
 * KEEP IT CLOSED until the first public link to the domain exists, or launch,
 * whichever comes first. Not earlier "to be safe": sitting in open-plus-noindex
 * for months means flapping every URL between states, which is the most
 * reliable way to make a site hard to index later. The risk it would insure
 * against - an inbound link turning Disallow into a URL-only index entry - does
 * not exist while nothing links here.
 *
 * Note that Slack states it does not honour robots.txt at all, so this site is
 * already being unfurled there today, title-only. That is why the Open Graph
 * tags went in before the site opened rather than after.
 */

/**
 * TRAINING-CORPUS CRAWLERS, blocked by name.
 *
 * The split is by BEHAVIOUR, not by "is it an AI bot". Every operator that
 * documents its crawlers separates the one that builds a training corpus from
 * the one that builds a live index and the one that fetches a page because a
 * user asked about it. The second and third are how this site gets cited, which
 * is the entire point of publishing it, so they are deliberately NOT here:
 * OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User, PerplexityBot,
 * Perplexity-User, Googlebot, Applebot and Amzn-SearchBot all fall through to
 * the permissive group below.
 *
 * Copying a published "block the AI bots" list would have blocked all of those
 * too - destroying the citations while leaving the compilation just as exposed.
 *
 * Google-Extended is a deliberate ALLOW. It governs Gemini training AND
 * grounding at prompt time, but not AI Overviews or AI Mode, which are
 * Googlebot's. Blocking it would remove this site from Gemini's cited answers
 * while the content stays in Google's AI features regardless - paying the
 * citation cost for almost none of the protection. To reverse that, add it
 * below and record the decision and its cost in docs/LEGAL.md.
 *
 * None of this stops anyone. The on-demand fetchers document that they may
 * ignore robots.txt, and on GitHub Pages there is no edge at which to enforce
 * anything. This is a stated position, not a control.
 */
const TRAINING_CRAWLERS = [
  'GPTBot',
  'ClaudeBot',
  'CCBot',
  'meta-externalagent',
  'Amazonbot',
  'Applebot-Extended',
  'Bytespider',
];

export default async function robots(): Promise<MetadataRoute.Robots> {
  const indexable = await isIndexable();

  if (!indexable) {
    return { rules: [{ userAgent: '*', disallow: '/' }] };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        /*
         * The RSC payload files next to every page. They are near-duplicates of
         * the HTML, they are not HTML so they cannot carry a robots meta, and
         * GitHub Pages cannot send an X-Robots-Tag header - so this is the only
         * lever there is.
         *
         * NOT `/*.txt$`, which would also match /robots.txt itself.
         */
        disallow: ['/*/index.txt$'],
      },

      /*
       * Disallow-only, and that is not a style choice. Under RFC 9309 a crawler
       * obeys the `*` group only "if no matching group exists", so naming a bot
       * DETACHES it from `*` rather than adding to it. A named `Allow` group for
       * a search bot would quietly exempt it from every rule ever added to `*`.
       */
      ...TRAINING_CRAWLERS.map((userAgent) => ({ userAgent, disallow: '/' })),
    ],
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
    // No `host`. It was a Yandex directive, Google has never supported it, and
    // the canonical host is already stated by every page's rel=canonical.
  };
}
