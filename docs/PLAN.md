# PLAN.md — We Hate Fast Food

**Status:** Phase 0 (plan). No application code written yet.
**Date:** 2026-08-14.
**Approval required before Phase 1.** See §11 for the questions I need answered.

---

## 1. What I am optimising for

In priority order, because these conflict and the order decides the arguments:

1. **Credibility.** A single fabricated or unsourced number ends the project. Every choice below that looks paranoid is paranoid on purpose.
2. **Authoring throughput.** The site is worthless without content, and content arrives one item at a time, in sessions, by hand. The repo _is_ the CMS, so the authoring loop (`/add-item` → validate → coverage report) has to be as polished as the public pages.
3. **Legibility on a cheap phone.** 360 px, slow 4G, one thumb.
4. **Portability of the content layer.** The video and social pipelines are real future consumers. `packages/content` must run under plain Node with no Next.js in the import graph.

Everything else — animation, breadth of locales, feature count — yields to these.

---

## 2. Architecture decisions

### 2.1 Rendering: static by default, three islands, one dynamic route

- Every page is statically generated at build time (`generateStaticParams` over locales × chains × items). No server rendering at request time.
- Exactly three client components ("islands") in v1:
  - `MarketSwitcher` — writes the cookie, updates the URL.
  - `IngredientDrawer` — built on native `<dialog>`; ~40 lines, no library.
  - `SearchBox` — only mounted on `/decoder` and `/compare`; lazy-imports `minisearch` on first keystroke.
- The reality-check visualisation, the traffic lights and the reference-intake arcs are **pure SVG + CSS with zero JavaScript**. The scroll reveal is one shared 15-line `IntersectionObserver` that toggles a class, and is skipped entirely under `prefers-reduced-motion`.
- One dynamic route handler: `POST /api/translate` (§2.4). Nothing else runs at request time.

**Why it matters:** the ≤130 kB gzipped budget for an item page is tight (see §7). Keeping `minisearch` off the item page and keeping the signature visual JS-free is what makes the budget reachable at all.

### 2.2 The decision the brief under-specifies: locale ≠ market

The brief treats language and data jurisdiction as if they travel together. They do not, and conflating them produces a bug that silently corrupts shared links: a German reader looking at UK data sends a link to a friend whose cookie says `US`, and the friend sees _different numbers under the same URL_. On a site whose promise is "this is what is actually in it", that is disqualifying.

**Rule for the whole codebase:**

|          | What it is                            | Where it lives                                      | Who chooses                                  |
| -------- | ------------------------------------- | --------------------------------------------------- | -------------------------------------------- |
| `locale` | The language of the prose             | URL path segment `/[locale]/…`                      | Reader, persisted in cookie                  |
| `market` | The jurisdiction the _data_ describes | URL search param `?m=GB`, part of the canonical URL | Reader; cookie supplies only the **default** |

- The cookie sets the default on first arrival at a page with no `?m=`. The moment a market is chosen, it is written into the URL and every internal link carries it.
- Canonical URL for an item is `/{locale}/chains/{chain}/{item}?m={market}`. Each `(item, market)` pair is a distinct static page with its own `verifiedOn`, its own structured data, its own OG image.
- If an item has no variant for the requested market, we do not fall back silently. We render an explicit "We do not hold data for this market" state with a link to the markets we do hold.

### 2.3 Content pipeline

```
content/**.json  ──┬── zod parse ── typed loader ──┬── Next static pages
content/**.mdx     │        │      (packages/content)├── search index (JSON)
                   │        └── reference graph      ├── OG + social cards
                   │           (broken ref = FAIL)   ├── sitemap + hreflang
                   │                                 └── video-brief export
                   └── i18n:translate ── content/i18n/<locale>/  (committed)
```

- Loaders read the filesystem once at module init, parse, resolve refs, and freeze. They expose `getChain`, `getItem`, `getAdditive`, `getItemsForChain`, `getItemsUsingAdditive` (the reverse index that powers "found in" back-links).
- **Zero Next.js imports in `packages/content`.** Enforced by an ESLint `no-restricted-imports` rule scoped to that package, and by a unit test that imports it under plain Node.
- The loader interface is deliberately `async` and repository-shaped (`ContentRepository`), even though the v1 implementation is synchronous filesystem reads, so a headless CMS can be dropped in behind it without touching a single page component.

### 2.4 Translation architecture

**Tier 1 (core locales, committed).** `npm run i18n:translate` reads English source, sends it to the Anthropic API with the glossary injected, writes JSON into `content/i18n/<locale>/` and `packages/i18n/messages/<locale>/`, and those files are committed and reviewed. Build-time only; the site has no runtime dependency on any API for core locales.

**Tier 2 (on demand).** `POST /api/translate` with `{ locale, namespace, contentHash }`.

- Storage sits behind a `TranslationStore` interface with two implementations: `UpstashStore` (env-configured) and `MemoryLruStore` (default). The app runs fully with zero external services.
- Cache key `t:{locale}:{namespace}:{contentHash}` — permanent, because the hash changes whenever the English changes.
- **Abuse control, which the brief does not mention and which we need before this endpoint is public:** the handler accepts only `(namespace, contentHash)` pairs present in a build-time manifest, only locales on a fixed allowlist, and is rate-limited per IP. Without this it is an unauthenticated endpoint that spends money on demand.
- Returned JSON is validated against the source key set before caching. Key mismatch → reject, log, serve English.
- See §11.7 for my recommendation to narrow _what_ tier 2 is allowed to translate.

### 2.5 Secrets hygiene

- `ANTHROPIC_API_KEY`, Upstash credentials and the analytics domain live in `.env.local`, which is gitignored. Only `.env.example` is committed, with empty values.
- Env is loaded with Node's native `--env-file` flag in scripts, and by Next in the app. No `dotenv` dependency, and no inline `VAR=x cmd` (which does not work in PowerShell).
- No secret is ever prefixed `NEXT_PUBLIC_`. `npm run check` includes a scan that fails if a `NEXT_PUBLIC_*` name matches `/KEY|TOKEN|SECRET|PASSWORD/i`, and a scan of the built client bundle for any committed key pattern.
- The translate route is server-only, with `import 'server-only'` in its dependency chain.

### 2.6 Windows-first tooling

- Every script is `node scripts/<name>.mjs`, invoked from an npm script with no shell operators, no `&&`, no `rm`, no `cp`, no inline env assignment.
- Path handling goes through `node:path`; slugs and content IDs are always POSIX-style, converted at the filesystem boundary.
- Node 24 is installed, so scripts use native `--env-file`, native recursive `readdir`, and the built `dist/` output of `packages/content`. That removes any need for `tsx`, `cross-env`, `rimraf`, `dotenv` or `glob`.

---

## 3. File tree I intend to create

Phase 1 creates the skeleton; later phases fill it. `[+]` marks a deviation from §3 of the brief, with the reason.

```
wehatefastfood/
├─ CLAUDE.md
├─ BRIEF.md
├─ README.md
├─ package.json                      npm workspaces root, all scripts
├─ tsconfig.base.json
├─ eslint.config.mjs                 flat config, one file for the repo
├─ .env.example
├─ .gitignore
├─ .github/workflows/ci.yml      [+] not in the brief's tree, but §4 requires CI
├─ .claude/
│  ├─ commands/  add-chain, add-item, add-additive, verify-content, new-article
│  └─ agents/    content-researcher, a11y-auditor, perf-auditor
├─ apps/web/
│  ├─ package.json  next.config.mjs  postcss.config.mjs  tsconfig.json
│  ├─ src/
│  │  ├─ app/
│  │  │  ├─ layout.tsx  not-found.tsx
│  │  │  ├─ [locale]/
│  │  │  │  ├─ layout.tsx  page.tsx                     home
│  │  │  │  ├─ chains/page.tsx
│  │  │  │  ├─ chains/[chain]/page.tsx
│  │  │  │  ├─ chains/[chain]/[item]/page.tsx           the centrepiece
│  │  │  │  ├─ chains/[chain]/[item]/opengraph-image.tsx
│  │  │  │  ├─ decoder/page.tsx   decoder/[slug]/page.tsx
│  │  │  │  ├─ compare/page.tsx
│  │  │  │  ├─ learn/page.tsx     learn/[slug]/page.tsx
│  │  │  │  └─ (static)/  about, methodology, sources, legal, privacy
│  │  │  ├─ api/translate/route.ts                      the only dynamic route
│  │  │  ├─ sitemap.ts  robots.ts
│  │  │  └─ watch/                                  [+] reserved per §11, empty
│  │  ├─ components/
│  │  │  ├─ brand/    Wordmark, SpecimenCard, Stamp
│  │  │  ├─ data/     TrafficLights, RealityCheck, ReferenceIntake,
│  │  │  │            NutritionTable, MarketDiff
│  │  │  ├─ content/  IngredientChips, IngredientDrawer, SourceList,
│  │  │  │            OurTake, Disclaimer
│  │  │  └─ ui/       MarketSwitcher, LocalePicker, JustTheNumbersToggle, SearchBox
│  │  ├─ lib/     format.ts, fsa.ts, ri.ts, url.ts, prefs.ts
│  │  └─ styles/globals.css
│  └─ e2e/                            Playwright specs
├─ packages/
│  ├─ content/
│  │  ├─ src/schemas/  source, chain, nutrition, variant, item,
│  │  │                additive, ingredient, article, index
│  │  ├─ src/  repository.ts, loaders.ts, graph.ts, validate.ts,
│  │  │        nutrition.ts, index.ts
│  │  ├─ src/__tests__/               nutrition maths, FSA bands, ref resolution
│  │  └─ dist/                    [+] tsc output; scripts import this, not TS source
│  ├─ i18n/
│  │  ├─ messages/en/*.json
│  │  ├─ src/  config.ts, glossary.ts, hash.ts, prompt.ts,
│  │  │        store/memory.ts, store/upstash.ts
│  │  └─ src/__tests__/
│  └─ design-tokens/              [+] the cross-channel visual constants: colour,
│     │                               the -19deg strike angle, AND the brand marks
│     ├─ tokens.json                  single source of truth
│     ├─ src/build.mjs                emits tokens.css + tokens.export.json
│     └─ brand/                   [+] client-delivered marks, SVG plus 1080 PNG.
│        │                            Lives here, not at the repo root, because
│        │                            the video and social pipelines already
│        │                            import this package for the tokens.
│        ├─ wff-avatar-primary.svg   wff-avatar-dark.svg   wff-avatar-mono.svg
│        ├─ wff-watermark-disc.svg   wff-watermark-light.svg
│        ├─ wff-favicon.svg
│        ├─ wff-wordmark-light.svg   wff-wordmark-dark.svg
│        ├─ wff-youtube-banner.svg
│        └─ *-1080.png                rasterised by scripts/export-brand-png.mjs
├─ content/
│  ├─ chains/   items/<chain>/   additives/   ingredients/   articles/
│  ├─ glossary.json
│  ├─ i18n/<locale>/              [+] tier-1 translated content, committed
│  └─ _seed/                          obviously-fake, deleted before launch
├─ scripts/
│  ├─ check.mjs                       orchestrates typecheck+lint+content+test
│  ├─ content-validate.mjs   content-coverage.mjs
│  ├─ i18n-extract.mjs       i18n-translate.mjs
│  ├─ search-index.mjs       social-cards.mjs   export-video-brief.mjs
│  ├─ contrast.mjs            [+] WCAG audit of the palette; every ratio quoted
│  │                              in docs/BRAND.md is this script's real output
│  ├─ export-brand-png.mjs    [+] rasterises the brand SVGs to PNG via resvg,
│  │                              alpha preserved; shares resvg with social:cards
│  └─ budget-check.mjs        [+] fails CI if item-page JS exceeds budget
├─ exports/                       [+] gitignored except the one committed example
│  ├─ video-briefs/.gitkeep
│  └─ social/.gitkeep
└─ docs/
   PLAN.md  ARCHITECTURE.md  CONTENT_GUIDE.md  BRAND.md  LEGAL.md  I18N.md  ROADMAP.md
```

---

## 4. Dependencies

### Approved by §4 of the brief — adding without further discussion

| Package                                                                                  | Why                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `next`, `react`, `react-dom`                                                             | Framework, per §4.                                                                                                                                                                                                                                                                                                              |
| `typescript`, `@types/*`                                                                 | Strict mode.                                                                                                                                                                                                                                                                                                                    |
| `tailwindcss` v4, `@tailwindcss/postcss`                                                 | Styling, configured from design tokens.                                                                                                                                                                                                                                                                                         |
| `zod`                                                                                    | Content schemas and the validator.                                                                                                                                                                                                                                                                                              |
| `next-intl`                                                                              | Routing and message catalogues.                                                                                                                                                                                                                                                                                                 |
| `minisearch`                                                                             | Client search, lazy-loaded on two routes only.                                                                                                                                                                                                                                                                                  |
| `vitest`                                                                                 | Unit tests.                                                                                                                                                                                                                                                                                                                     |
| `@playwright/test`                                                                       | Smoke suite.                                                                                                                                                                                                                                                                                                                    |
| `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-config-next`, `eslint-plugin-react` | Lint, including the no-bare-strings rule.                                                                                                                                                                                                                                                                                       |
| `prettier`                                                                               | Formatting.                                                                                                                                                                                                                                                                                                                     |
| `simple-git-hooks`, `lint-staged`                                                        | Windows-friendly hooks.                                                                                                                                                                                                                                                                                                         |
| `@upstash/redis`                                                                         | Translation cache, behind env, optional.                                                                                                                                                                                                                                                                                        |
| `@vercel/og`                                                                             | OG images, per §10.                                                                                                                                                                                                                                                                                                             |
| `@anthropic-ai/sdk`                                                                      | Implied by §7, "via the Anthropic API".                                                                                                                                                                                                                                                                                         |
| `@resvg/resvg-js`                                                                        | **Settled 2026-08-14** when the client asked for transparent 1080 PNG exports of the brand marks. Already used by `scripts/export-brand-png.mjs`, and the same rasteriser the OG and social-card pipeline needs, so it costs nothing extra later. Verified on this machine: exact colour reproduction, alpha channel preserved. |

### Needs your approval — not in §4

| Package                                                     | Why I want it                                                                                                     | If you say no                                                                                                                     |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `@next/mdx`, `remark-frontmatter`, `remark-mdx-frontmatter` | `/learn/[slug]` is specified as MDX with importable interactive components. This is the smallest way to get that. | Articles become JSON plus a restricted rich-text renderer; we lose inline components.                                             |
| `satori`                                                    | Turns JSX into SVG for the OG and social cards. Pairs with resvg below.                                           | We use `@vercel/og` at runtime for OG and write a second, divergent code path for social cards. Worse.                            |
| `size-limit`, `@size-limit/file`                            | Enforces the ≤130 kB budget in CI from Phase 1 rather than discovering the breach in Phase 6.                     | I hand-roll `scripts/budget-check.mjs` over the Next build manifest, roughly 60 lines, no dependency. Genuinely happy either way. |

### Explicitly not adding

- **`motion` / framer-motion.** Every animation the brief describes — scroll reveal, wordmark resolve, drawer slide — is CSS plus one shared IntersectionObserver. Adding a ~35 kB animation runtime to a page with a 130 kB budget, to do what `@keyframes` already does, is not defensible. I will ask if a specific interaction genuinely needs it.
- **Any charting library.** Per §4.
- **`tsx`, `cross-env`, `dotenv`, `rimraf`, `glob`.** Node 24 covers all five natively.
- **Any analytics SDK.** Plausible or Umami is a single script tag behind an env var, disabled in dev.

---

## 5. npm scripts contract

All cross-platform: `node scripts/*.mjs` or a bare binary. No shell operators anywhere.

| Script                                        | Does                                                                                                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dev`                                         | `next dev` in `apps/web`.                                                                                                                               |
| `build`                                       | tokens → content validate → search index → `next build`. Fails on any content error.                                                                    |
| `check`                                       | typecheck + lint + `content:validate` + `test` + secrets scan + budget check. **The definition of done.**                                               |
| `test`                                        | Vitest, all workspaces.                                                                                                                                 |
| `test:e2e`                                    | Playwright smoke suite.                                                                                                                                 |
| `content:validate`                            | Schema, reference graph, sanity checks. Errors fail, warnings print.                                                                                    |
| `content:coverage`                            | The table that drives our working sessions: per chain — items held, markets held, missing fields, `verifiedOn` ages, additives lacking a second source. |
| `i18n:extract`                                | Finds message keys, reports untranslated and orphaned.                                                                                                  |
| `i18n:translate`                              | Tier-1 translation run. Requires `ANTHROPIC_API_KEY`.                                                                                                   |
| `search:index`                                | Builds the client search JSON.                                                                                                                          |
| `social:cards -- --item=<chain>/<item>`       | Writes OG, 1080×1080 and 1080×1350 to `exports/social/`.                                                                                                |
| `export:video-brief -- --item=<chain>/<item>` | Writes `exports/video-briefs/<chain>-<item>.json`.                                                                                                      |
| `tokens:build`                                | `tokens.json` → CSS custom properties + `tokens.export.json`.                                                                                           |
| `brand:png`                                   | Rasterises `packages/design-tokens/brand/*.svg` to 1080 px PNG, alpha preserved. Optional filter argument, e.g. `-- watermark`.                         |

---

## 6. Validation rules

**Hard failures (build stops):**

- Any file fails its Zod schema.
- Any `ingredientRefs`, `additiveRefs` or `chainSlug` does not resolve.
- Any fact-bearing object has zero sources; any additive has fewer than two, from two distinct publishers.
- Any `Source.url` is not a well-formed absolute URL.
- Duplicate or non-kebab-case slug.
- A number appears in a variant whose `status` is `unpublished`.
- Real content lives in `content/_seed/`, or seed content lives outside it.

**Warnings (printed loudly, surfaced in `content:coverage`, do not fail):**

- `verifiedOn` older than 365 days.
- `saturatesG > fatG`; `sugarsG > carbohydrateG`; `fibreG + sugarsG > carbohydrateG`.
- `sodiumMg` versus `saltG × 400` outside ±5 %. _Note: 400 is the EU FIC regulatory convention (salt = sodium × 2.5). The chemical ratio is 393.4. We use the regulatory constant and say so on the page, because US labels declare sodium while EU and UK labels declare salt, and we convert between them._
- Atwater energy check outside ±20 %: `4·protein + 4·carbohydrate + 9·fat + 2·fibre` versus `energyKcal`.
- An item has exactly one market variant, i.e. the diff feature has nothing to show.

---

## 7. Performance budget, honestly

The brief sets ≤130 kB gzipped JS on an item page. **This is tight, and I would rather you know now than in Phase 6.** A Next.js 15 App Router page with React 19 reports roughly 100–115 kB first-load JS before any of our code. That leaves something like 15–30 kB.

How I make it fit:

- The item page ships no search, no MDX runtime, no animation library.
- `MarketSwitcher` and `IngredientDrawer` are the only client components on it, ~3–5 kB combined.
- Reality check, traffic lights and intake arcs are server-rendered SVG.
- `next-intl` receives only the namespaces the page uses, not the whole catalogue.

**Go/no-go checkpoint at the end of Phase 3.** I measure a real item page. If we are over 130 kB with all of the above already done, the honest options are (a) raise the budget to ~150 kB, or (b) move to a framework with a smaller baseline, e.g. Astro with React islands. I expect (a) will not even be needed, but the checkpoint belongs in the plan rather than in a surprise later.

Other budgets: LCP under 2.0 s on simulated Moto G / Slow 4G; CLS 0 (every image and SVG carries explicit dimensions); fonts self-hosted, `font-display: swap`, subset to `latin` + `latin-ext`.

---

## 8. Testing

**Vitest — the things that must never silently break:**

- FSA traffic-light band assignment at every threshold boundary, per 100 g and per portion, including the separate thresholds for drinks.
- Reference-intake percentages and rounding.
- Salt ↔ sodium conversion in both directions.
- The Atwater sanity check.
- Zod schemas: every rule in §6 gets a passing and a failing fixture.
- Reference-graph resolution, including a deliberately broken ref.
- Translation cache keys: same source text → same hash; changed text → changed hash; key-set mismatch → rejected.
- `packages/content` imports cleanly under plain Node with no Next.js present.

**Playwright smoke suite — 360 px mobile and 1280 px desktop:**

home → chains → chain → item; market switch changes the numbers **and** the URL; locale switch preserves market; ingredient drawer opens, traps focus, closes on Escape; "Just the numbers" hides visualisations while keeping every number; `ar` renders with `dir="rtl"` and no horizontal overflow at 360 px; compare page with three items round-trips through the URL.

---

## 9. Risk register

| Risk                                                                      | Severity     | Mitigation                                                                                                                           |
| ------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Machine-translated evidence claims are wrong in a language nobody reviews | **Critical** | Narrow tier 2 (§11.7a); `noindex` tier 2; never machine-translate evidence or editorial fields.                                      |
| JS budget missed on the item page                                         | High         | Measured at Phase 3, go/no-go, options stated above.                                                                                 |
| A chain publishes new figures and ours silently go stale                  | High         | `verifiedOn` on every variant, visible on the page, warned at 365 days, listed by `content:coverage`.                                |
| Trademark or trade-dress complaint                                        | High         | Text-only names, no logos, colours or photos, disclaimer on every chain page and in the footer, `accentToken` constrained (§11.7f).  |
| Sui generis database right                                                | Medium       | Manual, selective, attributed entries with our own analysis. No bulk import, and no fetching tooling without your explicit approval. |
| Translate endpoint abused                                                 | Medium       | Manifest allowlist, locale allowlist and rate limit, all before it is public.                                                        |
| Content authoring becomes the bottleneck                                  | Medium       | Slash commands and `content:coverage` are treated as product, built in Phases 1–2, not deferred.                                     |

---

## 10. Phase task lists

**Phase 1 — Foundation.** Workspaces, TS strict, ESLint flat config including the no-bare-strings rule, Tailwind v4 wired to `tokens.json`, `tokens:build`, Next app with the `[locale]` shell and the wordmark rendering, `CLAUDE.md`, five slash commands, three subagent definitions, CI, git hooks, an empty-but-passing `check`.
_Done when:_ `npm run check` and `npm run build` pass on an app with no content.

**Phase 2 — Content layer.** All Zod schemas, `ContentRepository`, reference graph and reverse index, `content:validate`, `content:coverage`, the nutrition maths module, unit tests, and one obviously-fake seed chain — `EXAMPLE BURGER CO (SEED DATA — NOT REAL)` — with three items across two markets, so the diff view has something to render in Phase 4.
_Done when:_ the validator catches every §6 rule in tests, and the coverage table prints.

**Phase 3 — Core pages.** Home, chains index, chain page, item page with the Specimen Card, reality check, traffic lights, intake arcs, ingredient chips and drawer, our-take box, sources, disclaimers, "Just the numbers" toggle, market switcher. Mobile and desktop. Plus the JS budget measurement and go/no-go.

**Phase 4 — Decoder, compare, search, market diff.**

**Phase 5 — i18n.** Tier-1 pipeline, tier-2 endpoint and store adapters, language picker, RTL, hreflang, per-locale sitemaps.

**Phase 6 — Hardening.** Structured data, OG and social cards, video-brief export, a11y audit, performance budgets, Playwright suite, deployment.

---

## 11. Decisions

**Settled by the client 2026-08-14.** These are no longer proposals. Anything that contradicts them is a bug.

1. **Default market → GB.** US is the first companion market. The FSA thresholds and EU/UK reference intakes are therefore the primary set; US figures are converted for display with the constant stated on the page.
2. **`content-researcher` may fetch, with limits.** It must respect `robots.txt`, rate-limit itself, and fetch only pages the client has explicitly pointed it at — no crawling, no bulk traversal. It stores the citation and URL, never a copy of a chain's database. This is what keeps us clear of the sui generis database right in §12 of the brief. Encode these limits in the agent definition itself, not merely in documentation.
3. **Tier-2 translation is narrowed.** UI strings and factual fields only. `evidenceSummary`, `notableDivergence`, `ourTake` and article bodies stay in English with an honest notice. All tier-2 pages carry `noindex`. The endpoint ships with a build-time manifest allowlist, a locale allowlist and per-IP rate limiting before it is ever public.
4. **Illustration is flat vector.** No halftone, no comic outline-and-shade. This supersedes §8 of the brief, which asked for a comic treatment, because the delivered mark has no texture and two visual languages would read as two projects. Recorded in `docs/BRAND.md` §7.

### Standing recommendations, not yet contradicted

5. **Core locales → the eight stand, with `cs` promoted to pilot locale.** Czech is the only locale the client can personally review, so it runs first and alone: it is the acceptance test for the whole tier-1 pipeline — glossary handling, do-not-translate terms, voice preservation, placeholder integrity — before a single token is spent on the other seven. Still to settle: `pt-PT` vs `pt-BR` and `es-ES` vs `es-419`.
6. **Design direction → evidence poster**, signature element the **Specimen Card**, system geometry the **−19° strike** taken from the delivered mark. Full argument in `docs/BRAND.md`.
7. **First real chain → McDonald's**, GB and US, so the diff view has a payload immediately.
8. **Nutri-Score → no for v1**, because computing it would require estimating inputs the chains do not publish.
9. **Hosting → Vercel**, built so Cloudflare Pages stays a genuine fallback.
