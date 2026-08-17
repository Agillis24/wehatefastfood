import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Unit tests only.
 *
 * The Playwright suite lives in apps/web/e2e and is run by `npm run test:e2e`.
 * Without this exclusion Vitest picks it up by filename and fails on the
 * Playwright imports - the two runners share a naming convention but nothing
 * else.
 */
const APP_SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'apps/web/src');

export default defineConfig({
  // The app compiles with a "@/*" path alias from its tsconfig, which Vitest
  // does not read. Without this, importing anything under apps/web/src fails to
  // resolve and the whole file is reported as a failed suite rather than a
  // failing test - which reads like a broken test rather than broken config.
  resolve: { alias: { '@': APP_SRC } },
  test: {
    /*
     * apps/web/src is included as well as the packages. It was not, and the
     * gap was invisible: a test file could be added under the app, pass review,
     * be committed, and never run. `npm run check` stayed green because nothing
     * was collecting it.
     *
     * Only plain .ts is matched, so component tests would need a DOM
     * environment configured before .tsx is added here.
     */
    include: ['packages/*/src/**/*.{test,spec}.ts', 'apps/web/src/**/*.{test,spec}.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', 'apps/web/e2e/**'],
  },
});
