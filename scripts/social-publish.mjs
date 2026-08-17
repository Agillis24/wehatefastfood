/**
 * Publish one post from the triptych, to Instagram and/or the Facebook Page.
 *
 *   npm run social:publish -- --post=1                      dry run, both
 *   npm run social:publish -- --post=1 --lang=cs            dry run, Czech
 *   npm run social:publish -- --post=1 --to=ig              Instagram only
 *   npm run social:publish -- --post=1 --confirm            actually posts
 *
 * DRY RUN IS THE DEFAULT AND THE DEFAULT IS THE POINT. Publishing cannot be
 * undone in any way that matters - a deleted post was still seen, and by then
 * it has been in feeds. So the script prints exactly what it would send, to
 * which accounts, and sends nothing until a human types --confirm.
 *
 * ONE POST PER RUN, on purpose. There is no --all: a mistake should cost one
 * post rather than three, and the three go up on different days anyway.
 *
 * --post IS POSTING ORDER, NOT TILE POSITION. Post 1 is the RIGHT-hand tile,
 * because Instagram fills the grid newest-first from the top left, so posting
 * left to right puts the banner up backwards.
 *
 * TWO NETWORKS, SEPARATE CREDENTIALS. The Facebook Page endpoint explicitly
 * requires a PAGE access token - "requested by a person who can perform the
 * CREATE_CONTENT task on the Page" - and a user token there fails with an error
 * that does not say so. Instagram's token depends on which login flavour the
 * app was set up with; see the IG_LOGIN note below.
 *
 * SETUP IS NOT OBVIOUS AND IS DOCUMENTED SEPARATELY: docs/SOCIAL_PUBLISHING.md.
 * It was verified against Meta's own documentation rather than written from
 * memory, and it marks what could not be verified. The short version: the
 * Instagram account needs the Instagram Tester role AND the invitation has to
 * be accepted from inside Instagram; the Explorer's token lasts about an hour
 * and must be exchanged for a long-lived one from a terminal, not a browser;
 * and the daily publishing ceiling is 50, not the 100 the guide's headline says.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TRIPTYCH_COPY, HASHTAGS } from './lib/instagram-copy.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Pinned, not "latest". A version bump is a change to review, not to inherit. */
const VERSION = 'v26.0';
const FB_API = `https://graph.facebook.com/${VERSION}`;

/**
 * TWO INSTAGRAM FLAVOURS, AND THEY ARE NOT INTERCHANGEABLE.
 *
 * An app's Instagram use case is set up with either Instagram Login or Facebook
 * Login, and the choice decides the host, the token type AND the permission
 * strings:
 *
 *   Instagram Login   graph.instagram.com   an Instagram User token
 *                     instagram_business_basic, instagram_business_content_publish
 *
 *   Facebook Login    graph.facebook.com    the PAGE access token - the same
 *                     string as FB_PAGE_ACCESS_TOKEN, because under this flavour
 *                     there is no separate Instagram token at all
 *                     instagram_basic, instagram_content_publish
 *
 * Both still require the Instagram account to be linked to a Facebook Page.
 * Sending the right call to the wrong host fails with an error that does not
 * mention hosts, which is why this is a named setting rather than a guess.
 *
 * Default is Instagram Login: it is what Meta's current use-case UI sets up,
 * and the `instagram_business_*` permission names are how you recognise it.
 * See docs/SOCIAL_PUBLISHING.md.
 */
const IG_LOGIN = process.env['IG_LOGIN'] ?? 'instagram';
const IG_API = IG_LOGIN === 'facebook' ? FB_API : `https://graph.instagram.com/${VERSION}`;

/**
 * Meta fetches the image itself, so this has to be the live public origin -
 * not localhost, and not a preview it cannot reach.
 */
const ORIGIN = process.env['NEXT_PUBLIC_SITE_ORIGIN'] ?? 'https://www.wehatefastfood.com';

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value ?? 'true'];
  }),
);

/**
 * A short .env reader rather than a dependency. It handles KEY=value, comments
 * and blank lines, and nothing else. It does NOT overwrite a variable already
 * in the environment, so a shell export or CI wins.
 */
async function loadEnv() {
  for (const name of ['.env.local', '.env']) {
    let text;
    try {
      text = await readFile(path.join(ROOT, name), 'utf8');
    } catch {
      continue;
    }
    for (const line of text.split('\n')) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
      if (!match) continue;
      const [, key, raw = ''] = match;
      if (key === undefined || process.env[key] !== undefined) continue;
      process.env[key] = raw.trim().replace(/^["']|["']$/g, '');
    }
  }
}

/**
 * Thrown by die() so the run unwinds instead of exiting mid-request.
 *
 * process.exit() with a fetch in flight trips a libuv assertion on Windows,
 * which prints over the actual error - so the one line the reader needs ends up
 * buried under a crash that is not the problem.
 */
class Bail extends Error {}

function die(message, hint) {
  console.error(`\npublish: ${message}`);
  if (hint) console.error(`\n${hint}`);
  throw new Bail(message);
}

/** Meta returns errors as JSON. The token must never appear in one. */
async function call(url, params) {
  const response = await fetch(url, { method: 'POST', body: new URLSearchParams(params) });
  const text = await response.text();

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text.slice(0, 400) };
  }

  if (!response.ok) {
    const error = parsed?.error ?? {};
    /*
     * A token with "no expiration date" is not immortal: Meta invalidates it
     * when the user logs out, changes their password or revokes the app. The
     * failure then looks like a scope problem and is not one, so it is named.
     */
    const hint =
      error.type === 'OAuthException'
        ? [
            'The token was rejected. It may have expired, or been invalidated by a',
            'password change, a logout, or a revoked authorisation - "no expiration',
            'date" means no timestamp, not immortal.',
            '',
            'An expired token cannot be exchanged for a new one. You have to log in',
            'again and re-issue it: see docs/SOCIAL_PUBLISHING.md.',
          ].join('\n')
        : undefined;
    die(`Meta returned ${response.status}: ${error.message ?? JSON.stringify(parsed)}`, hint);
  }
  return parsed;
}

// --- the networks -----------------------------------------------------------

/**
 * Instagram is a TWO-STEP publish: create a media container, then publish it.
 * There is no single call, and a container that is created but never published
 * simply expires - which is why a failure between the two is not a half-post.
 */
async function publishInstagram({ imageUrl, caption, altText }) {
  const token = process.env['IG_ACCESS_TOKEN'];
  const userId = process.env['IG_USER_ID'];
  if (!token || !userId) {
    die('IG_USER_ID and IG_ACCESS_TOKEN must both be set in .env.local');
  }

  console.log(`  instagram: creating the media container (${IG_LOGIN} login)...`);
  const container = await call(`${IG_API}/${userId}/media`, {
    image_url: imageUrl,
    caption,
    alt_text: altText,
    access_token: token,
  });
  if (!container.id) die(`no container id came back: ${JSON.stringify(container)}`);

  console.log(`  instagram: publishing container ${container.id}...`);
  const published = await call(`${IG_API}/${userId}/media_publish`, {
    creation_id: container.id,
    access_token: token,
  });

  return `instagram media ${published.id ?? '(no id returned)'}`;
}

/**
 * Facebook is one call - but it needs a PAGE access token, not the user token
 * Instagram uses, and different scopes. Mixing the two up is the single most
 * common failure here, so they are separate variables.
 */
async function publishFacebook({ imageUrl, caption, altText }) {
  const token = process.env['FB_PAGE_ACCESS_TOKEN'];
  const pageId = process.env['FB_PAGE_ID'];
  if (!token || !pageId) {
    die(
      'FB_PAGE_ID and FB_PAGE_ACCESS_TOKEN must both be set in .env.local',
      'FB_PAGE_ACCESS_TOKEN must be a PAGE token, not a user token. A user token\n' +
        'fails here with an error that does not say so.',
    );
  }

  console.log('  facebook: posting the photo...');
  const published = await call(`${FB_API}/${pageId}/photos`, {
    url: imageUrl,
    caption,
    alt_text_custom: altText,
    published: 'true',
    access_token: token,
  });

  return `facebook photo ${published.post_id ?? published.id ?? '(no id returned)'}`;
}

const NETWORKS = {
  ig: { label: 'Instagram', publish: publishInstagram },
  fb: { label: 'Facebook Page', publish: publishFacebook },
};

// --- main -------------------------------------------------------------------

async function main() {
  await loadEnv();

  const order = Number(args.get('post'));
  const tile = TRIPTYCH_COPY.find((t) => t.order === order);
  if (!tile) {
    die(
      `--post must be one of ${TRIPTYCH_COPY.map((t) => t.order).join(', ')}`,
      TRIPTYCH_COPY.map((t) => `  --post=${t.order}  ${t.file}  (${t.position})`).join('\n'),
    );
  }

  const lang = args.get('lang') ?? 'en';
  if (lang !== 'en' && lang !== 'cs') die('--lang must be en or cs');

  const to = args.get('to') ?? 'both';
  const targets = to === 'both' ? ['ig', 'fb'] : [to];
  for (const target of targets) {
    if (!NETWORKS[target]) die(`--to must be ig, fb or both`);
  }

  const caption = `${tile.caption[lang]}\n\n${HASHTAGS[lang]}`;
  const altText = tile.alt[lang];

  /*
   * JPEG, not PNG. Meta's reference for a single image container lists JPEG as
   * the format. The tiles are rendered as both by scripts/export-instagram-grid.mjs
   * precisely so this URL exists.
   */
  const imageUrl = `${ORIGIN}/social/${tile.file.replace(/\.png$/, '.jpg')}`;

  // --- checks that are cheaper before publishing than after -----------------

  if (caption.length > 2200) die(`caption is ${caption.length} characters; the limit is 2200`);
  if (altText.length > 1000) die(`alt text is ${altText.length} characters; the limit is 1000`);

  const head = await fetch(imageUrl, { method: 'HEAD' }).catch(() => null);
  if (!head || !head.ok) {
    die(
      `the image is not reachable at ${imageUrl}`,
      'Meta fetches the image from this URL itself - it cannot be uploaded from\n' +
        'disk, and it must be live before the post is created. Deploy the site first.',
    );
  }

  const contentType = head.headers.get('content-type') ?? '';
  if (!contentType.includes('jpeg')) {
    die(`the image at ${imageUrl} is served as "${contentType}"; Meta's reference lists JPEG`);
  }

  // --- the plan, printed whether or not it is going to run ------------------

  console.log(`
  post      ${tile.order} of ${TRIPTYCH_COPY.length} - ${tile.file} (${tile.position} tile)
  to        ${targets.map((t) => NETWORKS[t].label).join(' + ')}
  language  ${lang}
  image     ${imageUrl}
            [${contentType}, ${head.headers.get('content-length') ?? '?'} bytes]
  alt       ${altText}

  caption
  ---------------------------------------------------------------------------
${caption
  .split('\n')
  .map((line) => `  ${line}`)
  .join('\n')}
  ---------------------------------------------------------------------------
`);

  if (args.get('confirm') !== 'true') {
    console.log(`  DRY RUN. Nothing was sent.

  To publish exactly this, run the same command again with --confirm:

    npm run social:publish -- --post=${tile.order} --lang=${lang} --to=${to} --confirm

  Post in this order - ${TRIPTYCH_COPY.map((t) => t.order).join(', then ')} - because
  Instagram fills the grid newest-first from the top left.
`);
    return;
  }

  // --- publishing ----------------------------------------------------------

  const done = [];
  try {
    for (const target of targets) {
      done.push(await NETWORKS[target].publish({ imageUrl, caption, altText }));
    }
  } finally {
    /*
     * Reported even when a later network fails. Two networks means a run can
     * half-succeed, and the worst outcome is not knowing which half - somebody
     * re-runs the whole thing and posts to Instagram twice.
     */
    if (done.length > 0) console.log(`\n  PUBLISHED:\n${done.map((d) => `    ${d}`).join('\n')}`);
  }

  console.log(`
  Next: pin it on Instagram. Three pinned posts are allowed, and the row order
  is decided by PINNING order rather than posting order - if the banner comes
  out reversed, unpin and re-pin in the opposite sequence.
`);
}

try {
  await main();
} catch (error) {
  if (!(error instanceof Bail)) {
    console.error(`\npublish: ${error instanceof Error ? error.message : String(error)}`);
  }
  process.exitCode = 1;
}
