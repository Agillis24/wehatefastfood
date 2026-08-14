import path from 'node:path';
import { createRepository, type ContentRepository } from '@wff/content';

/**
 * One repository for the whole build.
 *
 * Content is read once at module init and reused across every statically
 * generated page. Without this, a build with 40 chains re-reads and re-validates
 * the entire content tree once per page.
 */

let cached: Promise<ContentRepository> | null = null;

export function getContent(): Promise<ContentRepository> {
  cached ??= createRepository({
    // The app runs from apps/web, the content lives at the repo root.
    contentRoot: path.resolve(process.cwd(), '..', '..', 'content'),
    // Seed content is scaffolding. It is visible in development so the pages
    // have something to render, and excluded from production builds so an
    // invented gram figure can never reach a reader.
    includeSeed: process.env.NODE_ENV !== 'production' || process.env['WFF_INCLUDE_SEED'] === '1',
  });
  return cached;
}
