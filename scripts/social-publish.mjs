/**
 * Publish one post from the triptych, to Instagram and/or the Facebook Page.
 *
 *   node scripts/ig-publish.mjs --post=1                      dry run, both
 *   node scripts/ig-publish.mjs --post=1 --lang=cs            dry run, Czech
 *   node scripts/ig-publish.mjs --post=1 --to=ig              Instagram only
 *   node scripts/ig-publish.mjs --post=1 --confirm            actually posts
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
 * TWO NETWORKS, TWO DIFFERENT CREDENTIALS, and this is where it usually goes
 * wrong. Instagram takes a user token; the Facebook Page endpoint explicitly
 * requires a PAGE access token - "requested by a person who can perform the
 * CREATE_CONTENT task on the Page" - and a user token there fails with an
 * unhelpful error. They are separate values in .env.local for that reason.
 *
 * Setup, once, at developers.facebook.com:
 *   1. Create an app. Under Use cases add BOTH:
 *        "Manage messaging & content on Instagram"   (Instagram API)
 *        "Manage everything on your Page"            (Pages API)
 *   2. Connect the business portfolio that holds the Page and the IG account.
 *   3. Generate tokens with these scopes:
 *        Instagram: instagram_business_basic, instagram_business_content_publish
 *        Facebook:  pages_show_list, pages_read_engagement, pages_manage_posts
 *   4. Put the four values in .env.local. It is gitignored, and
 *      `npm run secrets:scan` fails the build if it is ever committed.
 *
 * A long-lived user token lasts about 60 days. A Page token derived from a
 * long-lived user token does not expire, which is why the two are stored
 * separately rather than one being derived from the other at run time.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TRIPTYCH_COPY, HASHTAGS } from './lib/instagram-copy.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Pinned, not "latest". A version bump is a change to review, not to inherit. */
const API = 'https://graph.facebook.com/v25.0';

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
    die(`Meta returned ${response.status}: ${parsed?.error?.message ?? JSON.stringify(parsed)}`);
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

  console.log('  instagram: creating the media container...');
  const container = await call(`${API}/${userId}/media`, {
    image_url: imageUrl,
    caption,
    alt_text: altText,
    access_token: token,
  });
  if (!container.id) die(`no container id came back: ${JSON.stringify(container)}`);

  console.log(`  instagram: publishing container ${container.id}...`);
  const published = await call(`${API}/${userId}/media_publish`, {
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
  const published = await call(`${API}/${pageId}/photos`, {
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
