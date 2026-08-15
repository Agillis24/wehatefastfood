/**
 * Builds the translation manifest and reports catalogue drift.
 *
 * Emits packages/i18n/generated/manifest.json: for every English namespace, its
 * content hash and its source bundle.
 *
 * THE MANIFEST IS THE TIER-2 ALLOWLIST. /api/translate accepts a
 * (namespace, contentHash) pair only if it appears here. Without that, the
 * endpoint is an unauthenticated POST that will translate arbitrary attacker
 * text at our expense, and cache it under a key of their choosing.
 *
 * Also reports, for every non-source locale:
 *   - missing keys   (English has it, the locale does not: a blank on the page)
 *   - orphaned keys  (the locale has it, English does not: dead weight, and a
 *                     sign the English was edited without the locale following)
 *   - placeholder mismatches (ICU args renamed or dropped: renders throw)
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { contentHash, keyPaths, placeholders } from '@wff/i18n/translation';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MESSAGES = path.join(ROOT, 'packages', 'i18n', 'messages');
const OUT = path.join(ROOT, 'packages', 'i18n', 'generated', 'manifest.json');
const SOURCE = 'en';

const readNamespace = async (locale, namespace) =>
  JSON.parse(await readFile(path.join(MESSAGES, locale, `${namespace}.json`), 'utf8'));

const namespaces = (await readdir(path.join(MESSAGES, SOURCE)))
  .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
  .map((f) => f.replace(/\.json$/, ''));

const locales = (await readdir(MESSAGES, { withFileTypes: true }))
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

// --- manifest --------------------------------------------------------------

const manifest = { source: SOURCE, namespaces: {} };
for (const namespace of namespaces) {
  const source = await readNamespace(SOURCE, namespace);
  manifest.namespaces[namespace] = { hash: contentHash(source), source };
}

await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(OUT, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

const leafCount = namespaces.reduce(
  (total, ns) => total + keyPaths(manifest.namespaces[ns].source).length,
  0,
);
console.log(
  `i18n: ${namespaces.length} namespaces, ${leafCount} strings -> ${path
    .relative(ROOT, OUT)
    .split(path.sep)
    .join('/')}`,
);

// --- drift -----------------------------------------------------------------

const leaf = (obj, dotted) =>
  dotted.split('.').reduce((node, key) => (node === undefined ? undefined : node?.[key]), obj);

let problems = 0;

for (const locale of locales.filter((l) => l !== SOURCE)) {
  const missing = [];
  const orphaned = [];
  const badPlaceholders = [];

  for (const namespace of namespaces) {
    const source = manifest.namespaces[namespace].source;
    let target;
    try {
      target = await readNamespace(locale, namespace);
    } catch {
      missing.push(`${namespace} (whole namespace)`);
      continue;
    }

    const sourceKeys = keyPaths(source);
    const targetKeys = keyPaths(target);

    for (const key of sourceKeys) {
      if (!targetKeys.includes(key)) missing.push(`${namespace}.${key}`);
    }
    for (const key of targetKeys) {
      if (!sourceKeys.includes(key)) orphaned.push(`${namespace}.${key}`);
    }
    for (const key of sourceKeys) {
      if (!targetKeys.includes(key)) continue;
      const from = leaf(source, key);
      const to = leaf(target, key);
      if (typeof from !== 'string' || typeof to !== 'string') continue;
      const a = placeholders(from).join(',');
      const b = placeholders(to).join(',');
      if (a !== b) badPlaceholders.push(`${namespace}.${key}: {${a}} -> {${b}}`);
    }
  }

  const total = missing.length + orphaned.length + badPlaceholders.length;
  problems += total;

  console.log(`\n  ${locale}: ${total === 0 ? 'in sync with English' : `${total} problems`}`);
  for (const [label, list] of [
    ['missing', missing],
    ['orphaned', orphaned],
    ['placeholders', badPlaceholders],
  ]) {
    for (const entry of list.slice(0, 10)) console.log(`    ${label}: ${entry}`);
    if (list.length > 10) console.log(`    ${label}: ...and ${list.length - 10} more`);
  }
}

if (problems > 0) {
  console.error(`\ni18n: ${problems} catalogue problems`);
  process.exit(1);
}
console.log('\ni18n: all catalogues in sync');
