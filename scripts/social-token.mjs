/**
 * Put working credentials into .env.local, and refuse to store broken ones.
 *
 *   npm run social:token -- --ig     Instagram token
 *   npm run social:token -- --fb     Facebook Page id + Page token
 *
 * WHY THIS EXISTS RATHER THAN A SHELL ONE-LINER. The one-liner it replaces did
 * `Read-Host` then wrote whatever came back. A prompt accepts anything, so a
 * mis-paste - a whole shell command, in the case that prompted this - is stored
 * verbatim, and nobody prints a credential afterwards to check it. Meta's reply
 * to that is "Cannot parse access token", which reads as an expiry and is not.
 *
 * So: nothing is written until Meta has confirmed the value works. What lands
 * in the file is a token that answered a real call a second earlier.
 *
 * The value is typed at a prompt rather than passed as an argument, so it never
 * enters shell history, and it is never printed back.
 *
 * --fb does the whole Facebook dance in one go: exchanges the short-lived token
 * for a long-lived one, finds the Page, and writes BOTH the Page id and the
 * PAGE access token - which is the pair people most often get wrong, because a
 * user token stored in its place fails later with a permissions error that
 * never mentions token types.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENV = path.join(ROOT, '.env.local');
const VERSION = 'v26.0';

const args = new Set(process.argv.slice(2).map((a) => a.replace(/^--/, '')));

function fail(message, hint) {
  console.error(`\nsocial:token: ${message}`);
  if (hint) console.error(`\n${hint}`);
  process.exitCode = 1;
}

const rl = createInterface({ input: process.stdin, output: process.stdout });

/** Trimmed, unquoted, and checked for the shape a credential cannot have. */
async function askSecret(label, kind = 'token') {
  const raw = (await rl.question(`${label}: `)).trim().replace(/^["']|["']$/g, '');

  if (raw === '') return { error: 'nothing was entered' };

  // A token has no whitespace. A pasted shell command does.
  if (/\s/.test(raw)) {
    return { error: `that contains spaces, so it is not a token (${raw.length} characters)` };
  }

  /*
   * 32 hex characters is NOT an access token.
   *
   * App settings -> Basic lists three values in one column: App ID, App Secret,
   * and Client Token. Two of them are 32 hex characters, both are named
   * something-secret-or-token, and neither is what any of this wants. A real
   * access token is around 200 characters and begins EAA or IGAA.
   *
   * Caught here rather than at Meta, because Meta's answer is "Cannot parse
   * access token" - which reads as an expiry, and sends people off to generate
   * another one of the wrong thing.
   */
  if (kind === 'token' && /^[0-9a-f]{32}$/i.test(raw)) {
    return {
      error: 'that is 32 hex characters - an App Secret or a Client Token, not an access token',
      hint: [
        'An access token is around 200 characters and starts with EAA or IGAA.',
        '',
        'Facebook:  Graph API Explorer -> Generate Access Token -> the long value',
        '           in the "Access Token" box at the top of the panel.',
        'Instagram: App Dashboard -> the Instagram use case -> Generate token.',
        '',
        'The 32-character values in App settings -> Basic are not access tokens.',
      ].join('\n'),
    };
  }

  return { value: raw };
}

/** GET returning parsed JSON, or an {error} shape. Never logs the token. */
async function get(url) {
  let response;
  try {
    response = await fetch(url);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'the request could not be made' };
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    return { error: body?.error?.message ?? `HTTP ${response.status}` };
  }
  return { value: body };
}

/**
 * Rewrite one key in place, leaving every other line untouched.
 *
 * Splits on CRLF as well as LF and preserves whichever the file already uses -
 * PowerShell writes CRLF, and rewriting the file in the other convention makes
 * every line look changed to git for no reason.
 */
async function setKeys(pairs) {
  let text = await readFile(ENV, 'utf8').catch(() => '');
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const bom = text.startsWith('\uFEFF') ? '\uFEFF' : '';
  text = text.replace(/^\uFEFF/, '');

  const lines = text.split(/\r?\n/);
  for (const [key, value] of Object.entries(pairs)) {
    const index = lines.findIndex((l) => new RegExp(`^\\s*${key}\\s*=`).test(l));
    if (index === -1) lines.push(`${key}=${value}`);
    else lines[index] = `${key}=${value}`;
  }

  await writeFile(ENV, bom + lines.join(eol), 'utf8');
}

// --- Instagram --------------------------------------------------------------

async function instagram() {
  console.log(`
Instagram token. Get it from the App Dashboard:
  Use cases -> Manage messaging & content on Instagram -> Customize
  -> 2. Generate access tokens -> Generate token
`);

  const entered = await askSecret('Token');
  if (entered.error) return fail(entered.error, entered.hint);

  const me = await get(
    `https://graph.instagram.com/${VERSION}/me?fields=user_id,username,account_type&access_token=${encodeURIComponent(entered.value)}`,
  );
  if (me.error) {
    return fail(
      `Meta rejected it: ${me.error}`,
      'Nothing was written. Generate a fresh token and try again - and paste only\nthe token, with nothing else on the line.',
    );
  }

  const { user_id: userId, username, account_type: type } = me.value;
  if (!userId) {
    return fail(
      'the response had no user_id',
      'user_id is the professional-account id the publishing path needs. Its\nabsence usually means the account is not a professional account.',
    );
  }

  // user_id, NOT id. id is the app-scoped one and belongs nowhere near this.
  await setKeys({ IG_ACCESS_TOKEN: entered.value, IG_USER_ID: userId });
  console.log(`\n  written: @${username} [${type}], id ${userId}`);
}

// --- Facebook ---------------------------------------------------------------

async function facebook() {
  console.log(`
Facebook Page token, in one go.

You need three things, all from developers.facebook.com:
  App ID and App Secret   App settings -> Basic
  a short-lived token     Graph API Explorer, User Token, with
                          pages_show_list, pages_read_engagement, pages_manage_posts
                          - and tick your Page in the dialog

The short-lived token lasts about an hour. This exchanges it for a
long-lived one, then reads the Page token from it.
`);

  const appId = await askSecret('App ID', 'id');
  if (appId.error) return fail(appId.error, appId.hint);
  const appSecret = await askSecret('App Secret', 'secret');
  if (appSecret.error) return fail(appSecret.error, appSecret.hint);
  const short = await askSecret('Short-lived token');
  if (short.error) return fail(short.error, short.hint);

  const exchanged = await get(
    `https://graph.facebook.com/${VERSION}/oauth/access_token?grant_type=fb_exchange_token` +
      `&client_id=${encodeURIComponent(appId.value)}` +
      `&client_secret=${encodeURIComponent(appSecret.value)}` +
      `&fb_exchange_token=${encodeURIComponent(short.value)}`,
  );
  if (exchanged.error) {
    return fail(
      `the exchange failed: ${exchanged.error}`,
      'Nothing was written. An EXPIRED token cannot be exchanged - Meta:\n"You can not use an expired token to request a long-lived token." If it is\nmore than an hour old, generate a new one in the Explorer.',
    );
  }

  const long = exchanged.value.access_token;
  const days = Math.round((exchanged.value.expires_in ?? 0) / 86400);
  console.log(`  long-lived user token obtained, valid about ${days} days`);

  /*
   * access_token MUST be named in `fields`. It is a default field on this edge,
   * and Graph drops defaults the moment the parameter is supplied - omit it and
   * the response looks correct with no token in it and no error.
   */
  const pages = await get(
    `https://graph.facebook.com/${VERSION}/me/accounts?fields=id,name,access_token&access_token=${encodeURIComponent(long)}`,
  );
  if (pages.error) return fail(`could not list pages: ${pages.error}`);

  const list = pages.value.data ?? [];
  if (list.length === 0) {
    return fail(
      'that token can see no Pages',
      'Either the Page was not ticked in the authorisation dialog, or your Page\nrole came via Business Manager - in which case Meta also requires\nads_management or ads_read just to READ the list. Add one and retry.',
    );
  }

  let chosen = list[0];
  if (list.length > 1) {
    const wanted = (
      await rl.question(
        `\n${list.map((p, i) => `  ${i + 1}. ${p.name}`).join('\n')}\n\nWhich one: `,
      )
    ).trim();
    chosen = list[Number(wanted) - 1] ?? list.find((p) => p.name === wanted);
    if (!chosen) return fail(`no Page matched "${wanted}"`);
  }

  if (!chosen?.access_token) {
    return fail(
      'that Page came back without a token',
      'Usually a Live Contributor role rather than Content or Full control, or a\nbusiness that enforces 2FA on a session that is not 2FA-authenticated.',
    );
  }

  await setKeys({ FB_PAGE_ID: chosen.id, FB_PAGE_ACCESS_TOKEN: chosen.access_token });
  console.log(`\n  written: ${chosen.name}, id ${chosen.id}`);
}

// --- main -------------------------------------------------------------------

try {
  if (args.has('ig')) await instagram();
  else if (args.has('fb')) await facebook();
  else {
    console.log(`
  npm run social:token -- --ig     Instagram token
  npm run social:token -- --fb     Facebook Page id and Page token

Nothing is written unless Meta confirms the value works.`);
  }
} finally {
  rl.close();
}
