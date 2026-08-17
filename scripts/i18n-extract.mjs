/**
 * Catalogue drift check.
 *
 * Reports, for every non-source locale:
 *   - missing keys   (English has it, the locale does not: a blank on the page)
 *   - orphaned keys  (the locale has it, English does not: dead weight, and a
 *                     sign the English was edited without the locale following)
 *   - placeholder mismatches (ICU args renamed or dropped: renders throw)
 *
 * None of that is visible to anyone who cannot read the target language, which
 * is exactly our situation with seven of the eight - so it is a gate rather
 * than a report, and `npm run check` fails on any of them.
 *
 * This used to also emit a manifest that acted as the allowlist for the tier-2
 * translation endpoint. Tier 2 is gone - the site is statically exported, and
 * eight reviewed languages beat two hundred unreviewed ones - so the manifest
 * went with it.
 */

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { keyPaths, placeholders } from '@wff/i18n/translation';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MESSAGES = path.join(ROOT, 'packages', 'i18n', 'messages');
const SOURCE = 'en';

const readNamespace = async (locale, namespace) =>
  JSON.parse(await readFile(path.join(MESSAGES, locale, `${namespace}.json`), 'utf8'));

const namespaces = (await readdir(path.join(MESSAGES, SOURCE)))
  .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
  .map((f) => f.replace(/\.json$/, ''));

const locales = (await readdir(MESSAGES, { withFileTypes: true }))
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

const sources = {};
for (const namespace of namespaces) {
  sources[namespace] = await readNamespace(SOURCE, namespace);
}

const leafCount = namespaces.reduce((total, ns) => total + keyPaths(sources[ns]).length, 0);
console.log(`i18n: ${namespaces.length} namespaces, ${leafCount} source strings`);

const leaf = (obj, dotted) =>
  dotted.split('.').reduce((node, key) => (node === undefined ? undefined : node?.[key]), obj);

let problems = 0;

for (const locale of locales.filter((l) => l !== SOURCE)) {
  const missing = [];
  const orphaned = [];
  const badPlaceholders = [];

  for (const namespace of namespaces) {
    const source = sources[namespace];
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
