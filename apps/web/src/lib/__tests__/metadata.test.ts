import { describe, expect, it } from 'vitest';
import { clamp } from '../metadata';

/**
 * These exist because this function shipped for about four minutes with
 * `/s+/g` instead of `/\s+/g` - one lost backslash, which silently deletes
 * every letter s from every description on the site rather than collapsing
 * runs of whitespace. Nothing would have failed. The pages would simply have
 * described themselves in a language nobody speaks, in the one field written
 * for machines and therefore never read by a person.
 */
describe('clamp', () => {
  it('collapses whitespace without eating letters', () => {
    expect(clamp('sausages  and\n  salt')).toBe('sausages and salt');
  });

  it('leaves a short description exactly as written', () => {
    const short = 'What is actually in it.';
    expect(clamp(short)).toBe(short);
  });

  it('cuts on a word boundary and marks the cut', () => {
    const long = `${'word '.repeat(60)}end`;
    const out = clamp(long);

    expect(out.length).toBeLessThanOrEqual(155);
    expect(out.endsWith('…')).toBe(true);
    // Not mid-word.
    expect(out).not.toMatch(/wor…$/);
  });

  it('does not leave a space stranded before the ellipsis', () => {
    expect(clamp(`${'a'.repeat(40)} ${'b'.repeat(200)}`)).not.toMatch(/ …$/);
  });
});
