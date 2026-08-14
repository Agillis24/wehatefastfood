import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { ZodTypeAny, z } from 'zod';
import {
  ChainSchema,
  MenuItemSchema,
  AdditiveSchema,
  IngredientSchema,
} from './schemas/entities.js';
import { FsaThresholdsSchema, ReferenceIntakesSchema } from './schemas/reference.js';
import type { Chain, MenuItem, Additive, Ingredient } from './schemas/entities.js';
import type { FsaThresholds, ReferenceIntakes } from './schemas/reference.js';

/**
 * Filesystem loaders. Plain Node only - no framework, no bundler magic, because
 * the video and social pipelines import this package directly.
 */

export type IssueLevel = 'error' | 'warning';

export type Issue = {
  level: IssueLevel;
  /** Repo-relative, POSIX separators, so output is identical on every OS. */
  file: string;
  /** Explicitly `| undefined` because exactOptionalPropertyTypes is on. */
  path?: string | undefined;
  message: string;
};

export type Loaded<T> = { file: string; isSeed: boolean; data: T };

export type ContentBundle = {
  chains: Loaded<Chain>[];
  items: Loaded<MenuItem>[];
  additives: Loaded<Additive>[];
  ingredients: Loaded<Ingredient>[];
  fsaThresholds: FsaThresholds | null;
  referenceIntakes: ReferenceIntakes | null;
  issues: Issue[];
};

const rel = (root: string, file: string) => path.relative(root, file).split(path.sep).join('/');

async function listJson(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true, recursive: true });
    return entries
      .filter((e) => e.isFile() && e.name.endsWith('.json'))
      .map((e) => path.join(e.parentPath ?? dir, e.name));
  } catch {
    return [];
  }
}

async function parseFile<S extends ZodTypeAny>(
  root: string,
  file: string,
  schema: S,
  issues: Issue[],
): Promise<z.infer<S> | null> {
  const relative = rel(root, file);
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(file, 'utf8'));
  } catch (err) {
    issues.push({
      level: 'error',
      file: relative,
      message: `not valid JSON: ${(err as Error).message}`,
    });
    return null;
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    for (const issue of result.error.issues) {
      issues.push({
        level: 'error',
        file: relative,
        path: issue.path.join('.') || undefined,
        message: issue.message,
      });
    }
    return null;
  }
  return result.data;
}

/**
 * Seed content is obviously fake scaffolding and lives only in content/_seed/.
 * Keeping the two apart is what stops a placeholder gram figure being served as
 * a real one, so it is checked rather than assumed.
 */
const isSeedPath = (relative: string) => relative.split('/').includes('_seed');

export async function loadContent(contentRoot: string): Promise<ContentBundle> {
  const issues: Issue[] = [];

  const bundle: ContentBundle = {
    chains: [],
    items: [],
    additives: [],
    ingredients: [],
    fsaThresholds: null,
    referenceIntakes: null,
    issues,
  };

  const groups = [
    { key: 'chains' as const, dirs: ['chains', '_seed/chains'], schema: ChainSchema },
    { key: 'items' as const, dirs: ['items', '_seed/items'], schema: MenuItemSchema },
    { key: 'additives' as const, dirs: ['additives', '_seed/additives'], schema: AdditiveSchema },
    {
      key: 'ingredients' as const,
      dirs: ['ingredients', '_seed/ingredients'],
      schema: IngredientSchema,
    },
  ];

  for (const group of groups) {
    for (const dir of group.dirs) {
      for (const file of await listJson(path.join(contentRoot, dir))) {
        const relative = rel(contentRoot, file);
        const data = await parseFile(contentRoot, file, group.schema, issues);
        if (data === null) continue;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (bundle[group.key] as Loaded<any>[]).push({
          file: relative,
          isSeed: isSeedPath(relative),
          data,
        });
      }
    }
  }

  const fsaFile = path.join(contentRoot, 'reference', 'fsa-thresholds.json');
  bundle.fsaThresholds = await parseFile(contentRoot, fsaFile, FsaThresholdsSchema, issues);

  const riFile = path.join(contentRoot, 'reference', 'reference-intakes.json');
  bundle.referenceIntakes = await parseFile(contentRoot, riFile, ReferenceIntakesSchema, issues);

  return bundle;
}
