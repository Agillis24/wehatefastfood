/**
 * Publish one Instagram post from the triptych.
 *
 *   node scripts/ig-publish.mjs --post=1                 dry run, prints the plan
 *   node scripts/ig-publish.mjs --post=1 --lang=cs       dry run, Czech caption
 *   node scripts/ig-publish.mjs --post=1 --confirm       actually publishes
 *
 * DRY RUN IS THE DEFAULT AND THE DEFAULT IS THE POINT. Publishing to somebody's
 * account is not undoable in any way that matters - a deleted post was still
 * seen, and by then it has been in feeds. So the script prints exactly what it
 * would send, and does nothing at all until a human types --confirm.
 *
 * ONE TILE PER RUN, on purpose. There is no --all. A mistake should cost one
 * post, not three, and the three go up on different days anyway.
 *
 * CREDENTIALS ARE NEVER PRINTED and never leave the machine except to Meta.
 * The token lives in .env.local, which is gitignored and which
 * `npm run secrets:scan` fails the build over if it is ever committed.
 *
 * Setup, once:
 *   1. developers.facebook.com -> create an app -> add the Instagram product.
 *   2. Generate a long-lived access token with the scopes
 *      `instagram_business_basic` and `instagram_business_content_publish`.
 *   3. Put both values in .env.local:
 *        IG_USER_ID=...
 *        IG_ACCESS_TOKEN=...
 *
 * A long-lived user token expires after about 60 days. For something that runs
 * unattended, a System User token from the business portfolio does not expire
 * and is the better choice - but it is also a credential with a longer blast
 * radius, so it is a deliberate decision rather than a default.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TRIPTYCH_COPY, HASHTAGS } from './lib/instagram-copy.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Pinned, not "latest". A version bump is a change to review, not to inherit. */
const API = 'https://graph.facebook.com/v25.0';

/**
 * The API fetches the image itself, so this must be the live public origin -
 * not localhost, and not a preview. Overridable only to point at a staging
 * origin that is genuinely reachable from Meta's servers.
 */
const ORIGIN = process.env['NEXT_PUBLIC_SITE_ORIGIN'] ?? 'https://www.wehatefastfood.com';

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value ?? 'true'];
  }),
);

/**
 * A ten-line .env reader rather than a dependency. It handles what this file
 * needs - KEY=value, comments, blank lines - and nothing else. It does NOT
 * overwrite a variable already in the environment, so CI or a shell export wins.
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
 * process.exit() with a fetch still in flight trips a libuv assertion on
 * Windows, which prints over the actual error message - so the one line the
 * reader needs is buried under a crash that is not the problem.
 */
class Bail extends Error {}

function die(message, hint) {
  console.error(`\nig-publish: ${message}`);
  if (hint) console.error(`\n${hint}`);
  throw new Bail(message);
}

async function main() {
  await loadEnv();

  // --- what are we posting ----------------------------------------------------

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

  const caption = `${tile.caption[lang]}\n\n${HASHTAGS[lang]}`;
  const altText = tile.alt[lang];

  /*
   * JPEG, not PNG.
   *
   * Meta's own reference for a single image container lists the format as JPEG
   * and caps the file at 8 MB. The tiles are rendered as PNG by resvg, so a JPEG
   * has to exist alongside them before this can run - see the note in
   * scripts/export-instagram-grid.mjs. Failing here with a clear message beats
   * sending a PNG and reading a 400 out of Meta's error envelope.
   */
  const imageUrl = `${ORIGIN}/social/${tile.file.replace(/\.png$/, '.jpg')}`;

  // --- checks that are cheaper before publishing than after -------------------

  if (caption.length > 2200) {
    die(`caption is ${caption.length} characters; Instagram allows 2200`);
  }
  if (altText.length > 1000) {
    die(`alt text is ${altText.length} characters; Instagram allows 1000`);
  }

  const head = await fetch(imageUrl, { method: 'HEAD' }).catch(() => null);
  if (!head || !head.ok) {
    die(
      `the image is not reachable at ${imageUrl}`,
      'Meta fetches the image from this URL itself - it cannot be uploaded from disk,\n' +
        'and it must be live before the container is created. Deploy the site first.',
    );
  }

  const contentType = head.headers.get('content-type') ?? '';
  if (!contentType.includes('jpeg')) {
    die(
      `the image at ${imageUrl} is served as "${contentType}", and Meta's reference lists JPEG`,
      'Render a JPEG alongside the PNG tiles and deploy it before publishing.',
    );
  }

  // --- the plan, printed whether or not it is going to run --------------------

  console.log(`
  tile      ${tile.order} of ${TRIPTYCH_COPY.length} - ${tile.file} (${tile.position})
  language  ${lang}
  image     ${imageUrl}  [${contentType}, ${head.headers.get('content-length') ?? '?'} bytes]
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

  To publish this exact post, run the same command again with --confirm:

    node scripts/ig-publish.mjs --post=${tile.order} --lang=${lang} --confirm

  Post the tiles RIGHT TO LEFT - ${TRIPTYCH_COPY.map((t) => t.order).join(', then ')} -
  because Instagram fills the grid newest-first from the top left.
`);
    return;
  }

  // --- publishing -------------------------------------------------------------

  const token = process.env['IG_ACCESS_TOKEN'];
  const igUserId = process.env['IG_USER_ID'];

  if (!token || !igUserId) {
    die(
      'IG_ACCESS_TOKEN and IG_USER_ID must both be set',
      'Put them in .env.local, which is gitignored. See the header of this file\n' +
        'for how to obtain them. Never commit either value.',
    );
  }

  /** Errors from Meta arrive as JSON; the token must never appear in one. */
  async function call(url, body) {
    const response = await fetch(url, { method: 'POST', body });
    const text = await response.text();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { raw: text };
    }

    if (!response.ok) {
      const detail = parsed?.error?.message ?? JSON.stringify(parsed);
      die(`Meta returned ${response.status}: ${detail}`);
    }
    return parsed;
  }

  console.log('  creating the media container...');

  const container = await call(
    `${API}/${igUserId}/media`,
    new URLSearchParams({
      image_url: imageUrl,
      caption,
      alt_text: altText,
      access_token: token,
    }),
  );

  if (!container.id) die(`no container id came back: ${JSON.stringify(container)}`);
  console.log(`  container ${container.id}`);

  console.log('  publishing...');

  const published = await call(
    `${API}/${igUserId}/media_publish`,
    new URLSearchParams({ creation_id: container.id, access_token: token }),
  );

  console.log(`
  PUBLISHED. Media id ${published.id ?? '(none returned)'}

  Next: pin it. Instagram allows three pinned posts, and the row order is
  decided by PINNING order rather than posting order - if the banner comes out
  reversed, unpin and re-pin in the opposite sequence.
`);
}

try {
  await main();
} catch (error) {
  if (!(error instanceof Bail)) {
    console.error(`
ig-publish: ${error instanceof Error ? error.message : String(error)}`);
  }
  process.exitCode = 1;
}
