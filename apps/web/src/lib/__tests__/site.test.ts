import { describe, expect, it } from 'vitest';
import { canonicalUrl } from '../site';

/**
 * The site is `trailingSlash: true`, so canonicalUrl exists to make one string
 * out of the several the codebase would otherwise produce for one page.
 *
 * The fragment case is here because it shipped wrong: appending the slash to
 * the whole input turned the JSON-LD node id "/#organisation" into
 * "/#organisation/", quietly describing two organisations where the graph
 * needed one, and the emitted markup still looked plausible.
 */
describe('canonicalUrl', () => {
  it('adds the trailing slash a path is missing', () => {
    expect(canonicalUrl('/en/decoder')).toBe('https://www.wehatefastfood.com/en/decoder/');
  });

  it('leaves a path that already has one alone', () => {
    expect(canonicalUrl('/en/decoder/')).toBe('https://www.wehatefastfood.com/en/decoder/');
  });

  it('keeps the root as a single slash', () => {
    expect(canonicalUrl('/')).toBe('https://www.wehatefastfood.com/');
  });

  it('does not put the slash after a fragment', () => {
    expect(canonicalUrl('/#organisation')).toBe('https://www.wehatefastfood.com/#organisation');
    expect(canonicalUrl('/en/compare#GB/a~b')).toBe(
      'https://www.wehatefastfood.com/en/compare/#GB/a~b',
    );
  });

  it('does not put the slash after a query', () => {
    expect(canonicalUrl('/en/decoder?q=e621')).toBe(
      'https://www.wehatefastfood.com/en/decoder/?q=e621',
    );
  });
});
