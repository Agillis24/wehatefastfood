/**
 * Which of three things a market comparison is allowed to say.
 *
 * The distinction that matters is between "the two markets declare the same
 * ingredients" and "we hold no declaration for either market". With no data,
 * every list in the comparison comes back empty, and the two cases are
 * indistinguishable unless something checks for it. The first is a claim about
 * the food; making it from nothing is the fabrication this project cannot
 * commit, and for a long time every McDonald's item was in exactly that
 * position - so it is the wrong branch that would have shipped.
 *
 * It lives here rather than inside the component because Vitest collects plain
 * .ts only; a rule this load-bearing should be under test rather than inlined
 * in JSX where nothing can reach it.
 */

export type DiffState =
  /** Neither market has a declaration on file. Say so; compare nothing. */
  | 'no-declarations'
  /** Both declare, and the two lists agree. */
  | 'nothing-differs'
  /** At least one entry is on one side and not the other. */
  | 'differs';

type Lists = {
  onlyHere: readonly unknown[];
  onlyThere: readonly unknown[];
  shared: readonly unknown[];
};

export function diffState({ onlyHere, onlyThere, shared }: Lists): DiffState {
  if (onlyHere.length > 0 || onlyThere.length > 0) return 'differs';
  return shared.length === 0 ? 'no-declarations' : 'nothing-differs';
}
