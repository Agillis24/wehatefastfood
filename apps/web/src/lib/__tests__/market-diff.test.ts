import { describe, expect, it } from 'vitest';

import { diffState } from '../market-diff';

const lists = (here: number, there: number, both: number) => ({
  onlyHere: Array.from({ length: here }, (_, i) => `here-${i}`),
  onlyThere: Array.from({ length: there }, (_, i) => `there-${i}`),
  shared: Array.from({ length: both }, (_, i) => `both-${i}`),
});

describe('diffState', () => {
  it('says nothing when there is nothing on file for either market', () => {
    // The case that actually shipped: every McDonald's variant, all lists empty.
    expect(diffState(lists(0, 0, 0))).toBe('no-declarations');
  });

  it('does not mistake an absence of data for an agreement', () => {
    // The whole point. Both branches produce three empty lists; only one of
    // them is entitled to say the two countries list the same ingredients.
    expect(diffState(lists(0, 0, 0))).not.toBe('nothing-differs');
  });

  it('reports agreement only when both markets actually declared something', () => {
    expect(diffState(lists(0, 0, 4))).toBe('nothing-differs');
  });

  it('reports a difference when either side holds something the other does not', () => {
    expect(diffState(lists(1, 0, 0))).toBe('differs');
    expect(diffState(lists(0, 1, 0))).toBe('differs');
    expect(diffState(lists(2, 3, 5))).toBe('differs');
  });

  it('reports a difference even when nothing is shared', () => {
    // Two declarations with no overlap at all is the strongest possible
    // difference, not an empty comparison.
    expect(diffState(lists(3, 3, 0))).toBe('differs');
  });
});
