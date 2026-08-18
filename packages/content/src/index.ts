/**
 * @wff/content - the source of truth for every fact on the site.
 *
 * Hard rule, enforced by lint and by test: no Next.js, React or bundler
 * assumptions in this package's import graph. The video and social pipelines
 * consume it under plain Node.
 */

export { createRepository, defaultContentRoot, loadContent, buildGraph } from './repository.js';

export type {
  ContentRepository,
  RepositoryOptions,
  ContentBundle,
  ContentGraph,
  Issue,
  Market,
  DataStatus,
} from './repository.js';

export {
  ChainSchema,
  MenuItemSchema,
  MarketVariantSchema,
  AdditiveSchema,
  IngredientSchema,
  ACCENT_TOKENS,
  FUNCTIONAL_CLASSES,
} from './schemas/entities.js';

export type { Chain, MenuItem, MarketVariant, Additive, Ingredient } from './schemas/entities.js';

export { NutritionFactsSchema, FSA_NUTRIENTS } from './schemas/nutrition.js';
export type { NutritionFacts, FsaNutrient, FsaBand } from './schemas/nutrition.js';

export { SourceSchema, hasIndependentSources } from './schemas/source.js';
export type { Source } from './schemas/source.js';

/*
 * The canonical market list lives with the schema that enforces it. @wff/i18n
 * re-exports these so nothing that already imports them has to move.
 */
export { SUPPORTED_MARKETS, isSupportedMarket } from './schemas/source.js';

export { FsaThresholdsSchema, ReferenceIntakesSchema } from './schemas/reference.js';
export type { FsaThresholds, ReferenceIntakes } from './schemas/reference.js';

export {
  SODIUM_MG_PER_SALT_G,
  ATWATER,
  saltGFromSodiumMg,
  sodiumMgFromSaltG,
  resolveSaltG,
  saltSodiumDisagreement,
  atwaterKcal,
  energyDiscrepancy,
  toPer100,
  pickBasis,
  resolvePer100,
  bandFor,
  referenceIntakePercent,
} from './nutrition.js';

export type { BandResult, RiKey } from './nutrition.js';

export { STALE_AFTER_DAYS, ENERGY_TOLERANCE, SALT_SODIUM_TOLERANCE } from './graph.js';
