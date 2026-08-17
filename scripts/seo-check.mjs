/**
 * Metadata gate. Reads the STATIC EXPORT and checks every page that ships.
 *
 *   node scripts/seo-check.mjs
 *
 * This reads apps/web/out rather than the source, because the source is not
 * what a crawler sees. Six routes shipped for weeks with no canonical, and the
 * decoder entries - the pages most likely to be quoted by an assistant - had no
 * title, no description and no canonical at all. Nothing failed. Every gate was
 * green. The only way to catch that class of omission is to read the artefact.
 *
 * It is deliberately not a Playwright test: no browser is needed to read a
 * <head>, and a gate that needs a browser is a gate people skip.
 *
 * Skipped when there is no export, so `npm run check` still passes on a fresh
 * clone before anything has been built. CI builds first.
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'apps', 'web', 'out');
const LOCALES = ['en', 'cs'];

/**
 * The 404 page is not a document about anything, so it has no canonical URL and
 * no translations to point at. Giving it either would be asserting that a page
 * exists at an address where one does not.
 */
const isNotFound = (rel) => rel === '404.html' || rel.startsWith('404/');

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

if (!(await exists(OUT))) {
  console.log('seo: no export at apps/web/out, skipping (run `npm run build` first)');
  process.exit(0);
}

async function htmlFiles(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '_next') continue;
      found.push(...(await htmlFiles(full)));
    } else if (entry.name.endsWith('.html')) {
      found.push(full);
    }
  }
  return found;
}

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`, 'i'));
  return m ? m[1] : null;
};

const problems = [];
const files = await htmlFiles(OUT);

for (const file of files) {
  const rel = path.relative(OUT, file).replace(/\\/g, '/');
  if (isNotFound(rel)) continue;

  const html = await readFile(file, 'utf8');
  const head = html.slice(0, html.indexOf('</head>'));
  const fail = (msg) => problems.push(`${rel}: ${msg}`);

  const metas = [...head.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]);
  const links = [...head.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);

  const metaBy = (key, value) =>
    metas.find((t) => (attr(t, key) ?? '').toLowerCase() === value.toLowerCase());
  const prop = (name) => attr(metaBy('property', name) ?? '', 'content');
  const named = (name) => attr(metaBy('name', name) ?? '', 'content');

  // --- the basics ---------------------------------------------------------
  const title = (html.match(/<title>([^<]*)<\/title>/i) ?? [])[1];
  if (!title || !title.trim()) fail('no <title>');

  const description = named('description');
  if (!description || !description.trim()) fail('no meta description');
  else if (description.length > 200) fail(`meta description is ${description.length} chars`);

  // --- canonical ----------------------------------------------------------
  const canonicalTag = links.find((t) => (attr(t, 'rel') ?? '') === 'canonical');
  const canonical = canonicalTag ? attr(canonicalTag, 'href') : null;
  if (!canonical) fail('no rel=canonical');
  else if (!canonical.endsWith('/')) fail(`canonical has no trailing slash: ${canonical}`);

  // --- Open Graph, which every unfurler reads and none of them infer -------
  for (const p of ['og:title', 'og:description', 'og:url', 'og:image', 'og:type', 'og:site_name']) {
    if (!prop(p)) fail(`no ${p}`);
  }

  // The one that silently splits a page into two identities: two URLs for the
  // same page means two social-preview caches and two things to consolidate.
  const ogUrl = prop('og:url');
  if (canonical && ogUrl && canonical !== ogUrl) {
    fail(`og:url and canonical disagree:\n    canonical ${canonical}\n    og:url    ${ogUrl}`);
  }

  const ogImage = prop('og:image');
  if (ogImage && !ogImage.startsWith('https://')) fail(`og:image is not absolute: ${ogImage}`);

  // --- hreflang, which is ignored unless it is complete AND reflexive ------
  const alternates = links.filter((t) => (attr(t, 'rel') ?? '') === 'alternate');
  const tags = alternates.map((t) => (attr(t, 'hreflang') ?? '').toLowerCase()).filter(Boolean);

  for (const locale of LOCALES) {
    if (!tags.includes(locale)) fail(`no hreflang="${locale}" (must include itself)`);
  }
  if (!tags.includes('x-default')) fail('no hreflang="x-default"');

  for (const tag of alternates) {
    const href = attr(tag, 'href');
    if (href && !href.endsWith('/')) fail(`hreflang href has no trailing slash: ${href}`);
  }

  // --- the launch state must be the same on every page --------------------
  const robots = (named('robots') ?? '').toLowerCase();
  const closed = robots.includes('noindex');
  if (rel !== 'index.html' && !closed && !process.env['NEXT_PUBLIC_ALLOW_INDEXING']) {
    fail('indexable, but NEXT_PUBLIC_ALLOW_INDEXING was not set for this build');
  }
}

// The root stub is hand-written and inherits nothing, so it is checked as its
// own case rather than trusted to match the rest.
const root = path.join(OUT, 'index.html');
if (await exists(root)) {
  const html = await readFile(root, 'utf8');
  for (const needle of [
    'og:image',
    'og:title',
    'og:url',
    'rel="canonical"',
    'hreflang="x-default"',
  ]) {
    if (!html.includes(needle)) {
      problems.push(
        `index.html: root stub is missing ${needle} - it inherits nothing, see the comment in apps/web/public/index.html`,
      );
    }
  }
}

console.log(`seo: read ${files.length} exported pages`);

if (problems.length > 0) {
  console.error(`\nseo: ${problems.length} problem(s)\n`);
  for (const p of problems.slice(0, 40)) console.error(`  ${p}`);
  if (problems.length > 40) console.error(`  ...and ${problems.length - 40} more`);
  process.exit(1);
}

console.log(
  'seo: every page has a title, description, canonical, Open Graph and a reflexive hreflang set',
);
