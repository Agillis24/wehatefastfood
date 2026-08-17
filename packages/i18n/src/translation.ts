/**
 * Translation machinery for TIER 1: content hashing and the shared prompt.
 *
 * Server and build only - imports node:crypto, so it must never reach a client
 * bundle, which is why it is not re-exported from the package root.
 *
 * Tier 2 (on-demand machine translation into ~200 languages) was REMOVED when
 * the site moved to a static host. That was not only a hosting consequence: a
 * machine-translated claim about food safety, in a language nobody on the
 * project can read, was always the riskiest thing in the brief. Eight reviewed
 * languages are worth more than two hundred unreviewed ones.
 */

export {
  stableStringify,
  contentHash,
  keyPaths,
  sameKeySet,
  placeholders,
  samePlaceholders,
} from './hash.js';

export { buildTranslationPrompt } from './prompt.js';
export type { Glossary, GlossaryTerm } from './prompt.js';
