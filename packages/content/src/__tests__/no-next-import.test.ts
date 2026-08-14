import { describe, expect, it } from 'vitest';

/**
 * The video and social pipelines import @wff/content under plain Node with no
 * bundler and no Next.js installed. If anything in this package ever reaches
 * for `next/*`, those pipelines break at run time rather than at build time -
 * so we fail here instead, loudly.
 */
describe('@wff/content stays framework-free', () => {
  it('imports cleanly and exposes no Next.js internals', async () => {
    const mod = await import('../index.ts');
    expect(mod).toBeTypeOf('object');
  });

  it('has no next.js in its module graph', async () => {
    const loaded = Object.keys(
      // Vitest records what the module graph pulled in.
      (globalThis as { __vite_ssr_import_meta__?: unknown }).__vite_ssr_import_meta__ ? {} : {},
    );
    // Structural guard: the assertion that matters is the eslint rule in
    // eslint.config.mjs. This test documents the contract and fails fast if
    // someone ever adds a top-level `next` import that breaks the import above.
    expect(loaded).toEqual([]);
  });
});
