/**
 * Translation machinery: content hashing, the shared prompt, and the tier-2
 * cache stores.
 *
 * Server and build only. Imports node:crypto, so it must never be pulled into
 * a middleware or client bundle - which is exactly why it is not re-exported
 * from the package root.
 */

export {
  stableStringify,
  contentHash,
  cacheKey,
  keyPaths,
  sameKeySet,
  placeholders,
  samePlaceholders,
} from './hash.js';

export { buildTranslationPrompt, TIER2_FORBIDDEN_FIELDS } from './prompt.js';
export type { Glossary, GlossaryTerm } from './prompt.js';

export { createMemoryStore } from './store/memory.js';
export { createUpstashStore } from './store/upstash.js';
export type { TranslationStore } from './store/types.js';
