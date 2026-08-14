import type { ContentBundle, Issue } from './loaders.js';
import { hasIndependentSources } from './schemas/source.js';
import { energyDiscrepancy, resolvePer100, saltSodiumDisagreement } from './nutrition.js';

/**
 * Cross-file checks: everything a single-file schema cannot see.
 *
 * Errors here fail the build. Warnings are printed loudly and surface in
 * `npm run content:coverage` - they mark things a human should look at, not
 * things that are definitely wrong.
 */

export const STALE_AFTER_DAYS = 365;
export const ENERGY_TOLERANCE = 0.2;
export const SALT_SODIUM_TOLERANCE = 0.05;

export type ContentGraph = {
  issues: Issue[];
  /** additive slug -> item keys ("chain/item") that use it. Powers "found in". */
  itemsByAdditive: Map<string, string[]>;
  itemsByIngredient: Map<string, string[]>;
  itemsByChain: Map<string, string[]>;
};

const itemKey = (chainSlug: string, slug: string) => `${chainSlug}/${slug}`;

function daysBetween(fromIso: string, to: Date): number {
  const from = new Date(`${fromIso}T00:00:00Z`).getTime();
  return Math.floor((to.getTime() - from) / 86_400_000);
}

export function buildGraph(bundle: ContentBundle, now: Date): ContentGraph {
  const issues: Issue[] = [];
  const itemsByAdditive = new Map<string, string[]>();
  const itemsByIngredient = new Map<string, string[]>();
  const itemsByChain = new Map<string, string[]>();

  const chainSlugs = new Set(bundle.chains.map((c) => c.data.slug));
  const additiveSlugs = new Set(bundle.additives.map((a) => a.data.slug));
  const ingredientSlugs = new Set(bundle.ingredients.map((i) => i.data.slug));

  // --- slug uniqueness, per kind ------------------------------------------
  for (const [kind, loaded] of [
    ['chain', bundle.chains],
    ['item', bundle.items],
    ['additive', bundle.additives],
    ['ingredient', bundle.ingredients],
  ] as const) {
    const seen = new Map<string, string>();
    for (const entry of loaded) {
      // Item slugs are only unique within a chain; everything else is global.
      const key =
        kind === 'item'
          ? itemKey((entry.data as { chainSlug: string }).chainSlug, entry.data.slug)
          : entry.data.slug;
      const previous = seen.get(key);
      if (previous !== undefined) {
        issues.push({
          level: 'error',
          file: entry.file,
          message: `duplicate ${kind} slug "${key}", already defined in ${previous}. Slugs are permanent URLs.`,
        });
      } else {
        seen.set(key, entry.file);
      }
    }
  }

  // --- seed isolation ------------------------------------------------------
  // Real content in _seed/ would be invisible; seed content outside it would be
  // published as fact. Both are project-ending in different ways.
  for (const entry of [
    ...bundle.chains,
    ...bundle.items,
    ...bundle.additives,
    ...bundle.ingredients,
  ]) {
    const looksFake = JSON.stringify(entry.data).includes('SEED DATA');
    if (looksFake && !entry.isSeed) {
      issues.push({
        level: 'error',
        file: entry.file,
        message: 'marked SEED DATA but lives outside content/_seed/ - it would be served as real',
      });
    }
    if (!looksFake && entry.isSeed) {
      issues.push({
        level: 'warning',
        file: entry.file,
        message:
          'lives in content/_seed/ but is not marked SEED DATA - seed content must be obviously fake',
      });
    }
  }

  // --- additives: two INDEPENDENT sources ----------------------------------
  for (const entry of bundle.additives) {
    if (!hasIndependentSources(entry.data.sources, 2)) {
      issues.push({
        level: 'error',
        file: entry.file,
        path: 'sources',
        message: `${entry.data.sources.length} sources but fewer than 2 distinct publishers - citing one publisher twice is one source`,
      });
    }
  }

  // --- items: references, staleness, sanity --------------------------------
  for (const entry of bundle.items) {
    const item = entry.data;
    const key = itemKey(item.chainSlug, item.slug);

    if (!chainSlugs.has(item.chainSlug)) {
      issues.push({
        level: 'error',
        file: entry.file,
        path: 'chainSlug',
        message: `chain "${item.chainSlug}" does not exist`,
      });
    } else {
      itemsByChain.set(item.chainSlug, [...(itemsByChain.get(item.chainSlug) ?? []), key]);
    }

    const chain = bundle.chains.find((c) => c.data.slug === item.chainSlug);

    for (const variant of item.variants) {
      const where = `variants[${item.variants.indexOf(variant)}]`;

      for (const ref of variant.additiveRefs) {
        if (!additiveSlugs.has(ref)) {
          issues.push({
            level: 'error',
            file: entry.file,
            path: `${where}.additiveRefs`,
            message: `additive "${ref}" does not exist`,
          });
        } else {
          itemsByAdditive.set(ref, [...(itemsByAdditive.get(ref) ?? []), key]);
        }
      }

      for (const ref of variant.ingredientRefs) {
        if (!ingredientSlugs.has(ref)) {
          issues.push({
            level: 'error',
            file: entry.file,
            path: `${where}.ingredientRefs`,
            message: `ingredient "${ref}" does not exist`,
          });
        } else {
          itemsByIngredient.set(ref, [...(itemsByIngredient.get(ref) ?? []), key]);
        }
      }

      if (chain && !chain.data.marketsCovered.includes(variant.market)) {
        issues.push({
          level: 'warning',
          file: entry.file,
          path: `${where}.market`,
          message: `market "${variant.market}" is not in the chain's marketsCovered`,
        });
      }

      const age = daysBetween(variant.verifiedOn, now);
      if (age > STALE_AFTER_DAYS) {
        issues.push({
          level: 'warning',
          file: entry.file,
          path: `${where}.verifiedOn`,
          message: `verified ${age} days ago - chains reformulate quietly, this needs re-checking`,
        });
      }

      for (const panel of variant.nutrition) {
        const mismatch = saltSodiumDisagreement(panel, SALT_SODIUM_TOLERANCE);
        if (mismatch) {
          issues.push({
            level: 'warning',
            file: entry.file,
            path: `${where}.nutrition`,
            message: `declared sodium ${mismatch.declaredMg} mg but salt implies ${mismatch.expectedMg.toFixed(0)} mg (x${mismatch.ratio.toFixed(2)}) - likely a transcription error`,
          });
        }

        const discrepancy = energyDiscrepancy(panel);
        if (discrepancy !== null && discrepancy > ENERGY_TOLERANCE) {
          issues.push({
            level: 'warning',
            file: entry.file,
            path: `${where}.nutrition`,
            message: `declared energy is ${(discrepancy * 100).toFixed(0)}% away from the macros (${panel.basis}) - check the transcription`,
          });
        }
      }

      if (resolvePer100(variant.nutrition) === null && variant.status !== 'unpublished') {
        issues.push({
          level: 'warning',
          file: entry.file,
          path: `${where}.nutrition`,
          message: 'no per-100 panel and none derivable - traffic lights cannot be computed',
        });
      }
    }

    if (item.variants.length < 2) {
      issues.push({
        level: 'warning',
        file: entry.file,
        message:
          'only one market variant - the same-product-different-country diff has nothing to show',
      });
    }
  }

  // --- reference data ------------------------------------------------------
  for (const [name, ref] of [
    ['fsa-thresholds', bundle.fsaThresholds],
    ['reference-intakes', bundle.referenceIntakes],
  ] as const) {
    if (ref === null) {
      issues.push({
        level: 'error',
        file: `reference/${name}.json`,
        message: 'missing or invalid - traffic lights and reference intakes cannot be computed',
      });
    } else if (ref.status !== 'verified') {
      issues.push({
        level: 'warning',
        file: `reference/${name}.json`,
        message:
          'status is "unverified" - a human has not checked these against the source document. Anything computed from them must be labelled unverified in the UI.',
      });
    }
  }

  return { issues, itemsByAdditive, itemsByIngredient, itemsByChain };
}
