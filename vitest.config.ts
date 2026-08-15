import { defineConfig } from 'vitest/config';

/**
 * Unit tests only.
 *
 * The Playwright suite lives in apps/web/e2e and is run by `npm run test:e2e`.
 * Without this exclusion Vitest picks it up by filename and fails on the
 * Playwright imports - the two runners share a naming convention but nothing
 * else.
 */
export default defineConfig({
  test: {
    include: ['packages/*/src/**/*.{test,spec}.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', 'apps/web/e2e/**'],
  },
});
