import type { TranslationStore } from './types.js';

/**
 * Default store. The app must run with zero external services configured, so
 * this is what tier 2 uses until Upstash credentials exist.
 *
 * Bounded on purpose: an unbounded map behind a public endpoint is a memory
 * leak with a request interface.
 */
export function createMemoryStore(maxEntries = 500): TranslationStore {
  const map = new Map<string, string>();

  return {
    name: 'memory',
    async get(key) {
      const value = map.get(key);
      if (value === undefined) return null;
      // Re-insert so the least recently used entry is the first one evicted.
      map.delete(key);
      map.set(key, value);
      return value;
    },
    async set(key, value) {
      if (map.size >= maxEntries) {
        const oldest = map.keys().next().value;
        if (oldest !== undefined) map.delete(oldest);
      }
      map.set(key, value);
    },
  };
}
