/**
 * @wff/content - the source of truth for every fact on the site.
 *
 * Phase 1 ships the seam only. Phase 2 adds the Zod schemas, the filesystem
 * loaders, the reference graph and the validator.
 *
 * Hard rule, enforced by lint and by test: no Next.js in this package's import
 * graph. The video and social pipelines run under plain Node.
 */

export type {
  ContentRepository,
  Chain,
  MenuItem,
  Additive,
  Ingredient,
  Market,
  DataStatus,
} from './repository.js';
