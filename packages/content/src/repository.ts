import path from 'node:path';
import { loadContent, type ContentBundle, type Issue } from './loaders.js';
import { buildGraph, type ContentGraph } from './graph.js';
import type { Chain, MenuItem, Additive, Ingredient } from './schemas/entities.js';
import type { FsaThresholds, ReferenceIntakes } from './schemas/reference.js';

/**
 * The seam between the content files and everything that reads them.
 *
 * Deliberately async and repository-shaped even though the v1 implementation is
 * synchronous filesystem reads, so a headless CMS can be dropped in behind it
 * without touching a single page component.
 *
 * NOTHING IN THIS PACKAGE MAY IMPORT NEXT.JS. The video and social pipelines
 * run under plain Node and consume this package directly.
 */

export type Market = string;
export type DataStatus = 'verified' | 'partial' | 'unpublished';

export interface ContentRepository {
  getChain(slug: string): Promise<Chain | undefined>;
  listChains(): Promise<readonly Chain[]>;

  getItem(chainSlug: string, itemSlug: string): Promise<MenuItem | undefined>;
  listItemsForChain(chainSlug: string): Promise<readonly MenuItem[]>;
  listItems(): Promise<readonly MenuItem[]>;

  getAdditive(slug: string): Promise<Additive | undefined>;
  listAdditives(): Promise<readonly Additive[]>;

  getIngredient(slug: string): Promise<Ingredient | undefined>;
  listIngredients(): Promise<readonly Ingredient[]>;

  /** Reverse index over the content graph. Powers the "found in" back-links. */
  listItemsUsingAdditive(additiveSlug: string): Promise<readonly MenuItem[]>;

  /** Markets we actually hold data for. Never inferred, never guessed. */
  listMarketsForItem(chainSlug: string, itemSlug: string): Promise<readonly Market[]>;

  getFsaThresholds(): Promise<FsaThresholds | null>;
  getReferenceIntakes(): Promise<ReferenceIntakes | null>;

  /** Everything the validator found. Empty is the only acceptable error list. */
  getIssues(): Promise<readonly Issue[]>;
}

export type RepositoryOptions = {
  /** Absolute path to the content/ directory. */
  contentRoot: string;
  /** Include content/_seed/. False in production builds. */
  includeSeed?: boolean;
  /** Injected so staleness checks are deterministic in tests. */
  now?: Date;
};

export function defaultContentRoot(): string {
  return path.resolve(process.cwd(), 'content');
}

export async function createRepository(options: RepositoryOptions): Promise<ContentRepository> {
  const now = options.now ?? new Date();
  const includeSeed = options.includeSeed ?? true;

  const raw = await loadContent(options.contentRoot);
  const bundle: ContentBundle = includeSeed
    ? raw
    : {
        ...raw,
        chains: raw.chains.filter((c) => !c.isSeed),
        items: raw.items.filter((i) => !i.isSeed),
        additives: raw.additives.filter((a) => !a.isSeed),
        ingredients: raw.ingredients.filter((i) => !i.isSeed),
      };

  const graph: ContentGraph = buildGraph(bundle, now);
  const issues: Issue[] = [...bundle.issues, ...graph.issues];

  const chains = bundle.chains.map((c) => c.data);
  const items = bundle.items.map((i) => i.data);
  const additives = bundle.additives.map((a) => a.data);
  const ingredients = bundle.ingredients.map((i) => i.data);

  const itemAt = (chainSlug: string, slug: string) =>
    items.find((i) => i.chainSlug === chainSlug && i.slug === slug);

  return {
    getChain: async (slug) => chains.find((c) => c.slug === slug),
    listChains: async () => chains,

    getItem: async (chainSlug, itemSlug) => itemAt(chainSlug, itemSlug),
    listItemsForChain: async (chainSlug) => items.filter((i) => i.chainSlug === chainSlug),
    listItems: async () => items,

    getAdditive: async (slug) => additives.find((a) => a.slug === slug),
    listAdditives: async () => additives,

    getIngredient: async (slug) => ingredients.find((i) => i.slug === slug),
    listIngredients: async () => ingredients,

    listItemsUsingAdditive: async (additiveSlug) => {
      const keys = graph.itemsByAdditive.get(additiveSlug) ?? [];
      return keys
        .map((key) => {
          const [chainSlug, slug] = key.split('/');
          return chainSlug !== undefined && slug !== undefined
            ? itemAt(chainSlug, slug)
            : undefined;
        })
        .filter((i): i is MenuItem => i !== undefined);
    },

    listMarketsForItem: async (chainSlug, itemSlug) =>
      itemAt(chainSlug, itemSlug)?.variants.map((v) => v.market) ?? [],

    getFsaThresholds: async () => bundle.fsaThresholds,
    getReferenceIntakes: async () => bundle.referenceIntakes,

    getIssues: async () => issues,
  };
}

export { loadContent, buildGraph };
export type { ContentBundle, ContentGraph, Issue };
