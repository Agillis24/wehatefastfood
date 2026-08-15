/**
 * Universal configuration. Safe in every runtime, including middleware and the
 * browser: nothing here imports a node: builtin.
 *
 * The translation machinery (hashing, prompts, caches) lives behind
 * `@wff/i18n/translation` because it needs node:crypto and belongs to build
 * scripts and the server-only route handler. Re-exporting it from here made
 * webpack try to bundle node:crypto into the middleware.
 */

export {
  SOURCE_LOCALE,
  CORE_LOCALES,
  PILOT_LOCALE,
  DEFAULT_LOCALE,
  RTL_LOCALES,
  isRtl,
  SUPPORTED_MARKETS,
  DEFAULT_MARKET,
  MARKET_QUERY_PARAM,
  isCoreLocale,
  isSupportedMarket,
} from './config.js';

export type { CoreLocale, Market } from './config.js';
