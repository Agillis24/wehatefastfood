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

  /*
   * These three used to run against content/_seed/, which was deleted the day
   * the first real chain shipped - exactly as CLAUDE.md said it would be. So
   * they now run against the real directory, which is what they should have
   * done from the moment there was one: a loader test that only ever sees
   * fixtures is a loader test that has never seen the thing it loads.
   *
   * They deliberately assert shapes rather than counts. "McDonald's has 54
   * items" would fail on the next import and teach nobody anything.
   */
  it('loads a chain with items, each carrying at least one market', async () => {
    const repo = await createRepository({ contentRoot: CONTENT_ROOT, now: NOW });
    const chains = await repo.listChains();
    expect(chains.length).toBeGreaterThan(0);

    for (const chain of chains) {
      const items = await repo.listItemsForChain(chain.slug);
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        expect(item.variants.length).toBeGreaterThan(0);
        // Markets are ISO-3166 alpha-2 and unique within an item, or two
        // countries' figures would collapse into one page.
        const markets = item.variants.map((v) => v.market);
        expect(new Set(markets).size).toBe(markets.length);
        for (const m of markets) expect(m).toMatch(/^[A-Z]{2}$/);
      }
    }
  });

  it('builds the reverse index that powers the "found in" back-links', async () => {
    const repo = await createRepository({ contentRoot: CONTENT_ROOT, now: NOW });

    /*
     * Every additive we hold is walked, and each one's back-links must point at
     * items that really reference it. Today no McDonald's variant carries an
     * additiveRef - we hold no ingredient statements yet - so this asserts the
     * index is CONSISTENT rather than non-empty. An index that invents a
     * back-link is the failure worth catching; an empty one is just coverage.
     */
    for (const additive of await repo.listAdditives()) {
      const using = await repo.listItemsUsingAdditive(additive.slug);
      for (const item of using) {
        expect(item.variants.some((v) => v.additiveRefs.includes(additive.slug))).toBe(true);
      }
    }

    expect(await repo.listItemsUsingAdditive('does-not-exist')).toEqual([]);
  });

  it('lets no seed content reach a production build', async () => {
    /*
     * This has now been wrong twice, and both times because it asserted a
     * relationship between seed and real rather than the thing that matters.
     * First it asserted both lists were empty, which broke when the first real
     * chain landed. Then it asserted real < seeded, which broke when the seed
     * was deleted and the two became equal.
     *
     * The invariant does not mention the seed's size at all: nothing whose name
     * shouts SEED DATA is ever published, whether or not any seed exists.
     */
    const real = await createRepository({
      contentRoot: CONTENT_ROOT,
      includeSeed: false,
      now: NOW,
    });

    const named = [
      ...(await real.listChains()),
      ...(await real.listItems()),
      ...(await real.listAdditives()).map((a) => ({ name: a.names[0] ?? a.slug })),
    ];
    expect(named.length).toBeGreaterThan(0);
    for (const n of named) expect(n.name).not.toMatch(/SEED DATA|EXAMPLE/i);
  });

  it('warns that the reference thresholds are still unverified', async () => {
    const repo = await createRepository({ contentRoot: CONTENT_ROOT, now: NOW });
    const issues = await repo.getIssues();
    expect(issues.some((i) => i.message.includes('status is "unverified"'))).toBe(true);
  });
});
