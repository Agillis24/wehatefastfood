/**
 * Tier-1 translation. Build time, committed output, reviewable diffs.
 *
 *   node --env-file=.env.local scripts/i18n-translate.mjs --locale=cs
 *   node --env-file=.env.local scripts/i18n-translate.mjs --locale=de --dry-run
 *
 * `cs` is the pilot and runs first and alone. It is the one locale the client
 * can personally review, so it is the acceptance test for this pipeline before
 * a token is spent on the other seven.
 *
 * A translation is REJECTED, not shipped, when:
 *   - the returned JSON does not parse
 *   - its key set differs from the source in any way
 *   - any ICU placeholder is renamed, added or dropped
 *
 * That is deliberately strict. A dropped key is a blank on a page; a renamed
 * placeholder throws at render; and neither is visible to anyone who cannot
 * read the target language, which is precisely the situation we are in.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CORE_LOCALES, SOURCE_LOCALE } from '@wff/i18n';
import { buildTranslationPrompt, keyPaths, placeholders, sameKeySet } from '@wff/i18n/translation';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MESSAGES = path.join(ROOT, 'packages', 'i18n', 'messages');

const LANGUAGE_NAMES = {
  cs: 'Czech',
  de: 'German',
  es: 'Spanish',
  fr: 'French',
  it: 'Italian',
  nl: 'Dutch',
  pl: 'Polish',
  pt: 'Portuguese',
};

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, '').split('=');
    return [key, value ?? 'true'];
  }),
);

const locale = args.get('locale');
const dryRun = args.get('dry-run') === 'true';

if (locale === undefined) {
  console.error('usage: node scripts/i18n-translate.mjs --locale=cs [--dry-run]');
  process.exit(1);
}
if (locale === SOURCE_LOCALE) {
  console.error(`${SOURCE_LOCALE} is the source locale; there is nothing to translate into it.`);
  process.exit(1);
}
if (!CORE_LOCALES.includes(locale)) {
  console.error(`${locale} is not a tier-1 locale. Tier 1: ${CORE_LOCALES.join(', ')}`);
  process.exit(1);
}

const manifest = JSON.parse(
  await readFile(path.join(ROOT, 'packages', 'i18n', 'generated', 'manifest.json'), 'utf8'),
);
const glossary = JSON.parse(await readFile(path.join(ROOT, 'content', 'glossary.json'), 'utf8'));

const apiKey = process.env['ANTHROPIC_API_KEY'];
if (apiKey === undefined || apiKey === '') {
  console.error(
    'ANTHROPIC_API_KEY is not set.\n' +
      'Put it in .env.local (gitignored) and run with:\n' +
      '  node --env-file=.env.local scripts/i18n-translate.mjs --locale=' +
      locale,
  );
  process.exit(1);
}

async function translate(namespace, source) {
  const prompt = buildTranslationPrompt({
    targetLocale: locale,
    targetLanguageName: LANGUAGE_NAMES[locale] ?? locale,
    namespace,
    glossary,
    source,
  });

  if (dryRun) {
    console.log(`  ${namespace}: dry run, ${keyPaths(source).length} strings, prompt built`);
    return null;
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-5',
      max_tokens: 16000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) throw new Error(`anthropic ${response.status}: ${await response.text()}`);

  const body = await response.json();
  const text = (body.content ?? []).map((block) => block.text ?? '').join('');

  let parsed;
  try {
    parsed = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim());
  } catch (error) {
    throw new Error(`${namespace}: model did not return JSON (${String(error)})`);
  }

  if (!sameKeySet(source, parsed)) {
    const from = keyPaths(source);
    const to = keyPaths(parsed);
    const missing = from.filter((k) => !to.includes(k));
    const added = to.filter((k) => !from.includes(k));
    throw new Error(
      `${namespace}: key set does not match. missing=[${missing.join(', ')}] added=[${added.join(', ')}]`,
    );
  }

  const leaf = (obj, dotted) => dotted.split('.').reduce((node, key) => node?.[key], obj);
  for (const key of keyPaths(source)) {
    const before = leaf(source, key);
    const after = leaf(parsed, key);
    if (typeof before !== 'string' || typeof after !== 'string') continue;
    const a = placeholders(before).join(',');
    const b = placeholders(after).join(',');
    if (a !== b) throw new Error(`${namespace}.${key}: placeholders {${a}} became {${b}}`);
  }

  return parsed;
}

console.log(`i18n: translating ${SOURCE_LOCALE} -> ${locale}${dryRun ? ' (dry run)' : ''}`);

await mkdir(path.join(MESSAGES, locale), { recursive: true });

for (const [namespace, entry] of Object.entries(manifest.namespaces)) {
  const translated = await translate(namespace, entry.source);
  if (translated === null) continue;

  await writeFile(
    path.join(MESSAGES, locale, `${namespace}.json`),
    `${JSON.stringify(translated, null, 2)}\n`,
    'utf8',
  );
  console.log(`  ${namespace}: ${keyPaths(translated).length} strings written`);
}

await writeFile(
  path.join(MESSAGES, locale, '_provenance.json'),
  `${JSON.stringify(
    {
      locale,
      producedBy: 'i18n-translate',
      sourceHashes: Object.fromEntries(
        Object.entries(manifest.namespaces).map(([ns, e]) => [ns, e.hash]),
      ),
      reviewedByHuman: false,
      reviewedOn: null,
      note: 'Machine translation. reviewedByHuman stays false until a human who reads this language has actually read it.',
    },
    null,
    2,
  )}\n`,
  'utf8',
);

console.log(
  dryRun
    ? '\ni18n: dry run complete, nothing written'
    : `\ni18n: ${locale} written. Review the diff before committing - reviewedByHuman is false.`,
);
