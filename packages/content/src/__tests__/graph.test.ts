import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createRepository } from '../repository.js';
import { buildGraph } from '../graph.js';
import type { ContentBundle } from '../loaders.js';

const CONTENT_ROOT = path.resolve(process.cwd(), 'content');
const NOW = new Date('2026-08-14T00:00:00Z');

const source = {
  title: 'Example',
  publisher: 'Example Publisher',
  url: 'https://example.invalid/x',
  retrievedOn: '2026-08-14',
  type: 'company-disclosure',
} as const;

const band = { lowMax: 1, highMin: 2 };
const nutrientBands = { fat: band, saturates: band, sugars: band, salt: band };
const portionHigh = { fat: 3, saturates: 3, sugars: 3, salt: 3 };
const refMeta = {
  status: 'verified' as const,
  note: 'fixture',
  verifiedOn: '2026-01-01',
  sources: [source],
};

/**
 * Reference data is present and verified in the fixture on purpose. Leaving it
 * null would make every assertion in this file also carry the two "reference
 * data missing" errors, which is noise that hides the thing under test.
 */
const emptyBundle = (): ContentBundle => ({
  chains: [],
  items: [],
  additives: [],
  ingredients: [],
  fsaThresholds: {
    ...refMeta,
    portionAppliesAboveG: 100,
    food: { per100g: nutrientBands, perPortionHigh: portionHigh },
    drink: { per100ml: nutrientBands, perPortionHigh: portionHigh },
  },
  referenceIntakes: {
    ...refMeta,
    energyKJ: 8400,
    energyKcal: 2000,
    fatG: 70,
    saturatesG: 20,
    carbohydrateG: 260,
    sugarsG: 90,
    proteinG: 50,
    saltG: 6,
  },
  issues: [],
});

const chain = (slug: string) => ({
  file: `chains/${slug}.json`,
  isSeed: false,
  data: {
    slug,
    name: slug,
    marketsCovered: ['GB'],
    oneLiner: 'x',
    longIntro: 'x',
    accentToken: 'accent-1' as const,
    dataStatus: 'partial' as const,
    sources: [source],
  },
});

const item = (chainSlug: string, slug: string, refs: { additives?: string[] } = {}) => ({
  file: `items/${chainSlug}/${slug}.json`,
  isSeed: false,
  data: {
    slug,
    chainSlug,
    name: slug,
    category: 'burger' as const,
    variants: [
      {
        market: 'GB',
        nutrition: [
          {
            basis: 'per-100g' as const,
            servingSizeG: 100,
            energyKJ: null,
            energyKcal: null,
            fatG: 1,
            saturatesG: null,
            carbohydrateG: null,
            sugarsG: null,
            fibreG: null,
            proteinG: null,
            saltG: null,
            sodiumMg: null,
          },
        ],
        ingredientRefs: [],
        additiveRefs: refs.additives ?? [],
        allergens: [],
        sources: [source],
        verifiedOn: '2026-08-14',
        status: 'partial' as const,
      },
    ],
  },
});

const errors = (bundle: ContentBundle) =>
  buildGraph(bundle, NOW).issues.filter((i) => i.level === 'error');
const warnings = (bundle: ContentBundle) =>
  buildGraph(bundle, NOW).issues.filter((i) => i.level === 'warning');

describe('reference graph', () => {
  it('fails on an additive reference that does not resolve', () => {
    const b = emptyBundle();
    b.chains.push(chain('c'));
    b.items.push(item('c', 'i', { additives: ['e999-does-not-exist'] }));
    expect(errors(b).some((e) => e.message.includes('e999-does-not-exist'))).toBe(true);
  });

  it('fails on an item pointing at a chain that does not exist', () => {
    const b = emptyBundle();
    b.items.push(item('ghost-chain', 'i'));
    expect(errors(b).some((e) => e.message.includes('ghost-chain'))).toBe(true);
  });

  it('fails on a duplicate slug, because slugs are permanent URLs', () => {
    const b = emptyBundle();
    b.chains.push(chain('c'), chain('c'));
    expect(errors(b).some((e) => e.message.includes('duplicate chain slug'))).toBe(true);
  });

  it('allows the same item slug under two different chains', () => {
    const b = emptyBundle();
    b.chains.push(chain('a'), chain('b'));
    b.items.push(item('a', 'fries'), item('b', 'fries'));
    expect(errors(b).some((e) => e.message.includes('duplicate item slug'))).toBe(false);
  });

  it('fails when seed-marked content lives outside content/_seed/', () => {
    const b = emptyBundle();
    const c = chain('c');
    c.data.name = 'EXAMPLE BURGER CO (SEED DATA — NOT REAL)';
    b.chains.push(c);
    expect(errors(b).some((e) => e.message.includes('outside content/_seed/'))).toBe(true);
  });

  it('warns on a stale verification date rather than failing', () => {
    const b = emptyBundle();
    b.chains.push(chain('c'));
    const old = item('c', 'i');
    old.data.variants[0]!.verifiedOn = '2024-01-01';
    b.items.push(old);
    expect(errors(b)).toHaveLength(0);
    expect(warnings(b).some((w) => w.message.includes('days ago'))).toBe(true);
  });

  it('warns when an item has only one market, so the diff has nothing to show', () => {
    const b = emptyBundle();
    b.chains.push(chain('c'));
    b.items.push(item('c', 'i'));
    expect(warnings(b).some((w) => w.message.includes('one market variant'))).toBe(true);
  });
});

describe('the real content directory', () => {
  it('has no errors', async () => {
    const repo = await createRepository({ contentRoot: CONTENT_ROOT, now: NOW });
    const issues = await repo.getIssues();
    const errs = issues.filter((i) => i.level === 'error');
    expect(errs.map((e) => `${e.file}: ${e.message}`)).toEqual([]);
  });

  it('loads the seed chain with three items across two markets', async () => {
    const repo = await createRepository({ contentRoot: CONTENT_ROOT, now: NOW });
    const items = await repo.listItemsForChain('example-burger-co');
    expect(items).toHaveLength(3);
    for (const i of items) {
      expect(i.variants.map((v) => v.market).sort()).toEqual(['GB', 'US']);
    }
  });

  it('builds the reverse index that powers the "found in" back-links', async () => {
    const repo = await createRepository({ contentRoot: CONTENT_ROOT, now: NOW });
    const using = await repo.listItemsUsingAdditive('e621-example-flavour-enhancer');
    expect(using.map((i) => i.slug)).toContain('example-double-burger');

    const unused = await repo.listItemsUsingAdditive('does-not-exist');
    expect(unused).toEqual([]);
  });

  it('excludes seed content when asked, which is what production builds do', async () => {
    const repo = await createRepository({
      contentRoot: CONTENT_ROOT,
      includeSeed: false,
      now: NOW,
    });
    expect(await repo.listChains()).toEqual([]);
    expect(await repo.listItems()).toEqual([]);
  });

  it('warns that the reference thresholds are still unverified', async () => {
    const repo = await createRepository({ contentRoot: CONTENT_ROOT, now: NOW });
    const issues = await repo.getIssues();
    expect(issues.some((i) => i.message.includes('status is "unverified"'))).toBe(true);
  });
});
