import { describe, expect, it } from 'vitest';
import {
  contentHash,
  keyPaths,
  placeholders,
  sameKeySet,
  samePlaceholders,
  stableStringify,
} from '../hash.js';

describe('content hashing', () => {
  it('is independent of key order, so the same bundle hashes the same everywhere', () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe(stableStringify({ a: 2, b: 1 }));
    expect(contentHash({ b: 1, a: 2 })).toBe(contentHash({ a: 2, b: 1 }));
  });

  it('changes when the source text changes - this is what makes the cache safe', () => {
    // The tier-2 cache never expires. It can only be correct because a changed
    // string produces a different key, so a stale translation is unreachable.
    const before = contentHash({ greeting: 'Hello' });
    const after = contentHash({ greeting: 'Hello.' });
    expect(after).not.toBe(before);
  });
});

describe('key sets', () => {
  it('lists leaf paths, sorted', () => {
    expect(keyPaths({ a: { c: 1, b: 2 }, d: 3 })).toEqual(['a.b', 'a.c', 'd']);
  });

  it('rejects a translation that dropped a key', () => {
    expect(sameKeySet({ a: 1, b: 2 }, { a: 1 })).toBe(false);
  });

  it('rejects a translation that invented a key', () => {
    expect(sameKeySet({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it('accepts a translation with the same shape', () => {
    expect(sameKeySet({ a: { b: 'x' } }, { a: { b: 'y' } })).toBe(true);
  });
});

describe('ICU placeholders', () => {
  it('finds argument placeholders', () => {
    expect(placeholders('Verified {date} in {market}')).toEqual(['date', 'market']);
  });

  it('does NOT treat a plural branch body as a placeholder', () => {
    // This was a real bug: a looser pattern reported "No" as an argument in the
    // string below, which then flagged every correct translation as broken.
    const source = '{count, plural, =0 {No entries match} one {# entry} other {# entries}}';
    expect(placeholders(source)).toEqual(['count']);
  });

  it('holds across languages with different plural categories', () => {
    const en = '{count, plural, =0 {nothing} one {# item} other {# items}}';
    const cs = '{count, plural, =0 {nic} one {# položka} few {# položky} other {# položek}}';
    expect(samePlaceholders(en, cs)).toBe(true);
  });

  it('catches a renamed placeholder', () => {
    expect(samePlaceholders('Verified {date}', 'Ověřeno {datum}')).toBe(false);
  });

  it('catches a dropped placeholder', () => {
    expect(samePlaceholders('{a} and {b}', 'jen {a}')).toBe(false);
  });

  it('ignores reordering, because grammar moves arguments around', () => {
    expect(samePlaceholders('{value} of {nutrient}', '{nutrient}: {value}')).toBe(true);
  });
});
