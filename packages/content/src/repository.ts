/**
 * The seam between the content files and everything that reads them.
 *
 * The v1 implementation (Phase 2) reads JSON and MDX off the filesystem at
 * module init. This interface exists so a headless CMS can be dropped in behind
 * it later without touching a single page component - which is why it is async
 * even though the first implementation is synchronous.
 *
 * NOTHING IN THIS PACKAGE MAY IMPORT NEXT.JS. The video and social pipelines
 * run under plain Node and consume this package directly. Enforced by
 * eslint.config.mjs and by src/__tests__/no-next-import.test.ts.
 */

/** ISO 3166-1 alpha-2, uppercase. The jurisdiction a set of figures describes. */
export type Market = string;

/** How complete our data is for a given record. */
export type DataStatus = 'verified' | 'partial' | 'unpublished';

/**
 * Phase 2 replaces these with the Zod-inferred types from src/schemas.
 * They are deliberately opaque here so nothing starts depending on a shape
 * that has not been designed yet.
 */
export interface Chain {
  readonly slug: string;
}
export interface MenuItem {
  readonly slug: string;
  readonly chainSlug: string;
}
export interface Additive {
  readonly slug: string;
}
export interface Ingredient {
  readonly slug: string;
}

export interface ContentRepository {
  getChain(slug: string): Promise<Chain | undefined>;
  listChains(): Promise<readonly Chain[]>;

  getItem(chainSlug: string, itemSlug: string): Promise<MenuItem | undefined>;
  listItemsForChain(chainSlug: string): Promise<readonly MenuItem[]>;

  getAdditive(slug: string): Promise<Additive | undefined>;
  listAdditives(): Promise<readonly Additive[]>;

  getIngredient(slug: string): Promise<Ingredient | undefined>;

  /**
   * Reverse index over the content graph. Powers the "found in" back-links on
   * decoder pages, so an additive entry can list the products it appears in
   * without anyone maintaining that list by hand.
   */
  listItemsUsingAdditive(additiveSlug: string): Promise<readonly MenuItem[]>;

  /** Markets we actually hold data for. Never inferred, never guessed. */
  listMarketsForItem(chainSlug: string, itemSlug: string): Promise<readonly Market[]>;
}
