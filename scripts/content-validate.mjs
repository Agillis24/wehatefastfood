import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * Phase 2 replaces this with the real validator: Zod schemas, reference-graph
 * resolution, the source requirements and the nutrition sanity checks.
 *
 * Until then it enforces the one rule that can already be broken: real content
 * must not appear outside content/_seed/, and seed content must not leak out of
 * it. Getting that wrong publishes fake numbers, which is the single worst
 * failure mode this project has.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'content');

let entries;
try {
  entries = await readdir(CONTENT, { withFileTypes: true });
} catch {
  console.log('content: no content/ directory yet - Phase 2 creates it');
  process.exit(0);
}

const real = entries.filter((e) => e.name !== '_seed' && !e.name.startsWith('.'));
if (real.length === 0) {
  console.log('content: empty (seed only) - Phase 2 adds schemas and the real validator');
  process.exit(0);
}

console.log(`content: ${real.length} top-level entries; full validation lands in Phase 2`);
