import 'server-only';
import { NextResponse } from 'next/server';
import {
  TIER2_FORBIDDEN_FIELDS,
  buildTranslationPrompt,
  cacheKey,
  createMemoryStore,
  createUpstashStore,
  keyPaths,
  placeholders,
  sameKeySet,
  type TranslationStore,
} from '@wff/i18n/translation';
import manifest from '@wff/i18n/generated/manifest.json';
import glossary from '../../../../../../content/glossary.json';

/**
 * Tier 2: translate the interface into a language we have not reviewed.
 *
 * The ONLY dynamic route on the site.
 *
 * SCOPE, NARROWED ON PURPOSE (decided 2026-08-14). This endpoint translates
 * interface strings and factual fields. It does NOT translate anything that
 * describes evidence, states a regulatory position, or carries our opinion:
 * see TIER2_FORBIDDEN_FIELDS. Machine-translating "the evidence is contested"
 * into a language nobody on this project reads is how the site publishes a
 * claim it cannot stand behind, and there would be no one to notice.
 *
 * Pages served this way carry a visible machine-translation notice, a link to
 * the English original, and noindex - a thin unreviewed rendering must never
 * compete in search with the reviewed one.
 *
 * ABUSE CONTROL, because this is an unauthenticated POST that spends money:
 *   1. the (namespace, contentHash) pair must exist in the build-time manifest,
 *      so only text we actually shipped can ever be sent to the model;
 *   2. the locale must be on a fixed allowlist;
 *   3. per-IP rate limit.
 * Without all three this is a faucet with our card behind it.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** BCP-47-ish. Deliberately conservative: a locale tag is not free-form input. */
const LOCALE_PATTERN = /^[a-z]{2,3}(-[A-Za-z]{2,8})?$/;

const RATE_LIMIT = { windowMs: 60_000, max: 10 };
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string, now: number): boolean {
  const entry = hits.get(ip);
  if (entry === undefined || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RATE_LIMIT.windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT.max;
}

let store: TranslationStore | null = null;
function getStore(): TranslationStore {
  store ??= createUpstashStore(process.env) ?? createMemoryStore();
  return store;
}

/** Drop every field tier 2 is not allowed to touch, at any depth. */
function stripForbidden(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripForbidden);
  if (value === null || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !(TIER2_FORBIDDEN_FIELDS as readonly string[]).includes(key))
      .map(([key, child]) => [key, stripForbidden(child)]),
  );
}

export async function POST(request: Request) {
  const now = Date.now();
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  if (rateLimited(ip, now)) {
    return NextResponse.json({ error: 'rate limited' }, { status: 429 });
  }

  let body: { locale?: unknown; namespace?: unknown; contentHash?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const { locale, namespace, contentHash } = body;
  if (
    typeof locale !== 'string' ||
    typeof namespace !== 'string' ||
    typeof contentHash !== 'string'
  ) {
    return NextResponse.json(
      { error: 'locale, namespace and contentHash are required' },
      { status: 400 },
    );
  }
  if (!LOCALE_PATTERN.test(locale)) {
    return NextResponse.json({ error: 'malformed locale' }, { status: 400 });
  }

  // (1) Only text we actually shipped. This is the allowlist that stops the
  //     endpoint being a general-purpose translator for anyone who finds it.
  const entry = (manifest.namespaces as Record<string, { hash: string; source: unknown }>)[
    namespace
  ];
  if (entry === undefined || entry.hash !== contentHash) {
    return NextResponse.json({ error: 'unknown namespace or stale hash' }, { status: 404 });
  }

  const key = cacheKey(locale, namespace, contentHash);
  const cached = await getStore().get(key);
  if (cached !== null) {
    return NextResponse.json(
      { locale, namespace, contentHash, cached: true, messages: JSON.parse(cached) },
      { headers: { 'X-Robots-Tag': 'noindex' } },
    );
  }

  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (apiKey === undefined || apiKey === '') {
    // Honest 503 rather than a silent English fallback dressed as a translation.
    return NextResponse.json({ error: 'translation is not configured' }, { status: 503 });
  }

  const source = stripForbidden(entry.source);

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
      messages: [
        {
          role: 'user',
          content: buildTranslationPrompt({
            targetLocale: locale,
            targetLanguageName: locale,
            namespace,
            glossary,
            source,
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: 'translation failed' }, { status: 502 });
  }

  const payload = (await response.json()) as { content?: { text?: string }[] };
  const text = (payload.content ?? []).map((block) => block.text ?? '').join('');

  let translated: unknown;
  try {
    translated = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim());
  } catch {
    return NextResponse.json({ error: 'model did not return json' }, { status: 502 });
  }

  // Validated BEFORE caching. A cache is permanent here, so a bad translation
  // written once is a bad translation served for ever.
  if (!sameKeySet(source, translated)) {
    return NextResponse.json({ error: 'key set mismatch, rejected' }, { status: 502 });
  }

  const leaf = (obj: unknown, dotted: string): unknown =>
    dotted
      .split('.')
      .reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], obj);

  for (const path of keyPaths(source)) {
    const before = leaf(source, path);
    const after = leaf(translated, path);
    if (typeof before !== 'string' || typeof after !== 'string') continue;
    if (placeholders(before).join(',') !== placeholders(after).join(',')) {
      return NextResponse.json({ error: 'placeholder mismatch, rejected' }, { status: 502 });
    }
  }

  await getStore().set(key, JSON.stringify(translated));

  return NextResponse.json(
    { locale, namespace, contentHash, cached: false, messages: translated },
    { headers: { 'X-Robots-Tag': 'noindex' } },
  );
}
