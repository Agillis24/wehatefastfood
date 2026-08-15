import { createHash } from 'node:crypto';

/**
 * Content hash for a translatable bundle.
 *
 * The tier-2 cache key is permanent BECAUSE it contains this hash: change the
 * English and the hash changes, so a stale translation can never be served for
 * text that has since been edited. That property only holds if the hash is
 * stable across machines and runs, which is why keys are sorted and the JSON is
 * serialised deterministically rather than with JSON.stringify's insertion order.
 */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
}

export function contentHash(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex').slice(0, 16);
}

export function cacheKey(locale: string, namespace: string, hash: string): string {
  return `t:${locale}:${namespace}:${hash}`;
}

/**
 * Every leaf key path in a bundle, sorted.
 *
 * A translation is rejected if its key set does not match the source exactly.
 * A model that drops a key produces a page with a missing string; one that adds
 * a key has invented something. Neither ships.
 */
export function keyPaths(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return [prefix];
  }
  return Object.entries(value as Record<string, unknown>)
    .flatMap(([key, child]) => keyPaths(child, prefix ? `${prefix}.${key}` : key))
    .sort();
}

export function sameKeySet(a: unknown, b: unknown): boolean {
  const left = keyPaths(a);
  const right = keyPaths(b);
  return left.length === right.length && left.every((key, index) => key === right[index]);
}

/**
 * ICU argument placeholders, so a translation can be checked for renaming a
 * `{count}` or dropping a `{market}` - either of which throws at render time,
 * in a language nobody on the project can read.
 *
 * This is a small scanner rather than a regular expression, because ICU is not
 * a regular language and the difference matters here. In
 *
 *   {count, plural, =0 {nothing} one {# item} other {# items}}
 *
 * the token `{nothing}` is a BRANCH BODY - prose, which a translation is
 * supposed to change - and it is spelled exactly like a placeholder. A pattern
 * that cannot see nesting reports it as an argument and then rejects every
 * correct translation of the string. Both looser patterns were tried and both
 * produced that false positive; the tests in __tests__/hash.test.ts pin it.
 *
 * The rule the scanner implements: at brace depth 1, read the identifier. If it
 * is followed by `,` the argument is complex - record its name and skip the
 * whole block, contents included. If it is followed by `}` it is a simple
 * placeholder - record it.
 */
export function placeholders(text: string): string[] {
  const found: string[] = [];
  let index = 0;

  while (index < text.length) {
    if (text[index] !== '{') {
      index += 1;
      continue;
    }

    let cursor = index + 1;
    while (cursor < text.length && /\s/.test(text[cursor] ?? '')) cursor += 1;

    let name = '';
    while (cursor < text.length && /[\w-]/.test(text[cursor] ?? '')) {
      name += text[cursor];
      cursor += 1;
    }
    while (cursor < text.length && /\s/.test(text[cursor] ?? '')) cursor += 1;

    const next = text[cursor];

    if (name !== '' && (next === '}' || next === ',')) {
      found.push(name);
    }

    if (next === ',') {
      // Complex argument. Skip to its matching close brace so branch bodies,
      // which are prose, are never scanned.
      let depth = 1;
      cursor += 1;
      while (cursor < text.length && depth > 0) {
        if (text[cursor] === '{') depth += 1;
        else if (text[cursor] === '}') depth -= 1;
        cursor += 1;
      }
      index = cursor;
      continue;
    }

    index = next === '}' ? cursor + 1 : index + 1;
  }

  return found.sort();
}

export function samePlaceholders(source: string, translated: string): boolean {
  const a = placeholders(source);
  const b = placeholders(translated);
  return a.length === b.length && a.every((p, i) => p === b[i]);
}
