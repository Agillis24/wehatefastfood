import type { TranslationStore } from './types.js';

/**
 * Upstash Redis over its REST API, so this works on any runtime without a TCP
 * client. Entries are written without an expiry: the key contains the content
 * hash, so a cached translation can never be stale for the text it describes.
 *
 * Returns null when unconfigured rather than throwing - the caller falls back
 * to the in-memory store and the feature keeps working locally.
 */
export function createUpstashStore(
  env: Record<string, string | undefined>,
): TranslationStore | null {
  const url = env['UPSTASH_REDIS_REST_URL'];
  const token = env['UPSTASH_REDIS_REST_TOKEN'];
  if (url === undefined || token === undefined || url === '' || token === '') return null;

  const call = async (command: unknown[]): Promise<unknown> => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
    });
    if (!response.ok) throw new Error(`upstash ${response.status}`);
    const body = (await response.json()) as { result?: unknown };
    return body.result ?? null;
  };

  return {
    name: 'upstash',
    async get(key) {
      const result = await call(['GET', key]);
      return typeof result === 'string' ? result : null;
    },
    async set(key, value) {
      await call(['SET', key, value]);
    },
  };
}
