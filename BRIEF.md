# We Hate Fast Food — Build Brief for Claude Code

> Paste this whole file as your first message in an empty directory (or save it as `BRIEF.md` in the repo root and say: "Read BRIEF.md and start with Phase 0").
> Work through the phases in order. **Stop at every gate and wait for my approval before continuing.**

---

## 0. Working agreement — read this first

1. **Plan before code.** Read this entire brief, then write `docs/PLAN.md` containing: your proposed architecture, the exact file tree you intend to create, every dependency you want to add with a one-line justification, and the open questions from §14. Then **STOP** and wait for approval.
2. **Phase gates.** After each phase: run the full check suite, commit, write a 10-line summary of what changed and what I should look at, then **STOP**.
3. **Never invent data.** This project's entire credibility rests on accuracy. You must never generate, estimate, interpolate or "reasonably assume" a nutrition figure, an ingredient list, or a regulatory status. If a value is unknown, it is `null` with `"status": "unpublished"` and the UI says so explicitly. Placeholder content used for scaffolding must be obviously fake (`chainName: "EXAMPLE BURGER CO (SEED DATA — NOT REAL)"`) and live only in `content/_seed/`.
4. **Dependency discipline.** Ask before adding anything not listed in §4. Prefer platform features and hand-written code over libraries for anything under ~150 lines.
5. **Small commits**, conventional commit messages, one logical change each.
6. **Windows is the primary dev environment (PowerShell).** No `.sh` scripts, no bash-only syntax in npm scripts, no `rm -rf`, no `NODE_ENV=x cmd` inline env assignment. All tooling runs as cross-platform Node scripts invoked through npm scripts. Verify paths work with backslashes.
7. **Definition of done for every phase:** `npm run check` passes (typecheck + lint + content validation + unit tests) and `npm run build` succeeds.

---

## 1. What we are building

**wehatefastfood.com** — an independent, evidence-based, deliberately opinionated resource that makes fast-food nutrition and ingredients *legible to a normal human being*.

The core loop: **pick a chain → pick a menu item → see what is actually in it, what those things do, and why they are there** — rendered as something you understand in three seconds, not a table of grams you scroll past.

This website is the hub of a wider project that will later include a no-face YouTube channel (comic-illustrated explainers) and an Instagram account. **Build the content layer so that the website, the videos and the social posts all read from one source of truth.** You are not building the video or social pipelines now — you are building the data contract they will consume (§11).

**Audience:** curious general public, parents, people who eat fast food regularly and are not planning to stop. Not nutritionists, not dieters.

**Voice:** dry, sharp, funny, specific. We are hostile to *the industry* — its formulation choices, its portion inflation, its marketing — and never to the person eating the food. Snark is aimed upward. Every claim is sourced. Think investigative reporting with a good art director, not a wellness blog.

**Brand mark:** the wordmark reads `WE ~~LOVE~~ HATE FAST FOOD` — "LOVE" struck through, "HATE" stamped over it. Build it as inline SVG (not a raster file) so it can be animated, recoloured, and reused at any size across web, video and social.

---

## 2. Non-negotiable principles

| Principle | What it means in code |
|---|---|
| **Sourced or absent** | Every nutrition number and every factual claim carries `source` (URL + publisher + retrieval date) and `verifiedOn`. Content validation fails the build if a fact lacks a source. |
| **No trademark infringement** | Chain names appear as **text only**, in our own typeface. Never their logos, brand colours as brand identifiers, packaging photos, mascots, or trade dress. Product imagery is our own comic-style illustration. A visible "not affiliated with, endorsed by, or sponsored by" notice sits in the footer and on every chain page. |
| **Never body-shaming** | No exercise-equivalent framing ("run 45 minutes to burn this off"), no "guilt", no good/bad food moralising, no BMI, no weight-loss angle anywhere in copy or components. The frame is always *what is in it and why the company put it there*. Include a "Just the numbers" toggle that turns off all illustrative visualisations for people who prefer plain data. |
| **Evidence, not scare-mongering** | Every additive entry carries an explicit `evidenceStrength` field (`well-established` / `mixed` / `emerging` / `contested`) and the current EU/US/UK regulatory status. Where regulators disagree, say so and show both. Never imply a hazard the evidence doesn't support — that is how this project loses its credibility permanently. |
| **Accessible** | WCAG 2.2 AA. Colour is never the only carrier of meaning (traffic lights always carry a `HIGH` / `MED` / `LOW` text label). Every visualisation has an equivalent readable sentence in the DOM. Keyboard-operable everything. `prefers-reduced-motion` respected. |
| **Fast on a cheap phone** | Mobile-first from a 360 px baseline. Static generation by default. Performance budget: LCP < 2.0 s on simulated Moto G / Slow 4G; ≤ 130 kB gzipped JS on an item page; zero layout shift. Interactive parts are islands, not a client-rendered app. |
| **Private** | No third-party trackers, no ad SDKs, no cookie banner needed. Cookieless analytics only (Plausible or self-hosted Umami, behind an env var, disabled by default in dev). |

---

## 3. Repository layout

npm workspaces monorepo. `content/` sits at the root, outside the web app, because the video and social pipelines will consume it later.

```
wehatefastfood/
├─ CLAUDE.md                     # operating instructions for future Claude Code sessions
├─ BRIEF.md                      # this file
├─ .claude/
│  ├─ commands/                  # /add-chain, /add-item, /add-additive, /verify-content, /new-article
│  └─ agents/                    # content-researcher, a11y-auditor, perf-auditor
├─ apps/
│  └─ web/                       # Next.js app
├─ packages/
│  ├─ content/                   # Zod schemas + typed loaders. THE source of truth.
│  ├─ i18n/                      # message catalogues, translation runtime, glossary
│  └─ design-tokens/             # tokens.json → CSS vars + JSON export for video/social
├─ content/
│  ├─ chains/<chain>.json
│  ├─ items/<chain>/<item>.json
│  ├─ additives/<e-number>.json
│  ├─ ingredients/<slug>.json
│  ├─ articles/<slug>.mdx
│  ├─ glossary.json              # terms that must never be translated / must be translated consistently
│  └─ _seed/                     # obviously-fake scaffolding data, deleted before launch
├─ scripts/                      # all Node, all cross-platform
└─ docs/
   ├─ PLAN.md  ARCHITECTURE.md  CONTENT_GUIDE.md  BRAND.md  LEGAL.md  I18N.md  ROADMAP.md
```

---

## 4. Approved stack

- **Next.js 15 (App Router) + React 19 + TypeScript in `strict` mode.** Static generation everywhere it is possible; route handlers only for the translation endpoint.
- **Tailwind CSS v4**, configured entirely from `packages/design-tokens`. No hard-coded hex values anywhere in components.
- **Content:** local JSON + MDX, validated by **Zod**. No CMS in phase 1 — I will be adding chains and items with you in Claude Code, so the authoring interface *is* the repo plus the slash commands. Design the loaders so a headless CMS could be swapped in behind them later.
- **Routing/i18n:** `next-intl`.
- **Charts and visualisations:** hand-written SVG/CSS. **No charting library.** These visuals are the product; they must be exactly right and cost almost no bytes.
- **Motion:** CSS transitions by default. `motion` (framer-motion) only if a specific interaction genuinely needs it — justify each use.
- **Search:** build-time generated JSON index + `minisearch` on the client. No search service.
- **Testing:** Vitest for units (nutrition maths, schema validation, translation cache keys) and Playwright for a small smoke suite (home → chain → item → language switch, mobile + desktop viewports).
- **Deployment:** Vercel. Keep everything portable enough for Cloudflare Pages as a fallback.
- **Translation cache:** Upstash Redis (or Vercel KV) behind env vars, with a graceful in-memory fallback so the app runs with zero external services configured.
- **Git hooks:** `simple-git-hooks` + `lint-staged` (Windows-friendly). CI: GitHub Actions running `npm run check` and `npm run build`.

---

## 5. Content model

Define these in `packages/content/src/schemas/`. This is the spine of the whole project — get it right before anything visual.

```ts
// Every factual assertion in the repo carries one of these.
const Source = z.object({
  title: z.string(),
  publisher: z.string(),            // "McDonald's Corporation", "EFSA", "FDA"
  url: z.string().url(),
  retrievedOn: z.string().date(),   // when WE looked at it
  publishedOn: z.string().date().optional(),
  type: z.enum(['company-disclosure','regulator','peer-reviewed','journalism','database']),
});

const Chain = z.object({
  slug: z.string(),                  // "example-burger-co"
  name: z.string(),                  // text only — never a logo
  foundedYear: z.number().int().optional(),
  hqCountry: z.string().length(2).optional(),
  marketsCovered: z.array(z.string().length(2)),  // ISO country codes we hold data for
  oneLiner: z.string().max(140),
  longIntro: z.string(),             // authored in EN, translated downstream
  accentToken: z.string(),           // OUR token name, never their brand colour
  dataStatus: z.enum(['verified','partial','unpublished']),
  sources: z.array(Source).min(1),
});

const NutritionFacts = z.object({
  basis: z.enum(['per-serving','per-100g','per-100ml']),
  servingSizeG: z.number().nullable(),
  energyKJ: z.number().nullable(),
  energyKcal: z.number().nullable(),
  fatG: z.number().nullable(),
  saturatesG: z.number().nullable(),
  carbohydrateG: z.number().nullable(),
  sugarsG: z.number().nullable(),
  fibreG: z.number().nullable(),
  proteinG: z.number().nullable(),
  saltG: z.number().nullable(),
  sodiumMg: z.number().nullable(),
});

// A single item can be formulated DIFFERENTLY per market. This is one of the
// most interesting stories the site can tell, so it must be first-class from day one.
const MarketVariant = z.object({
  market: z.string().length(2),      // "US", "GB", "DE"
  nutrition: z.array(NutritionFacts).min(1),   // per-serving AND per-100g where available
  ingredientRefs: z.array(z.string()),          // → content/ingredients
  additiveRefs: z.array(z.string()),            // → content/additives (E-numbers / INS)
  allergens: z.array(z.string()),
  sources: z.array(Source).min(1),
  verifiedOn: z.string().date(),
  status: z.enum(['verified','partial','unpublished']),
});

const MenuItem = z.object({
  slug: z.string(),
  chainSlug: z.string(),
  name: z.string(),
  category: z.enum(['burger','chicken','fries-sides','pizza','wrap','breakfast','dessert','drink','sauce','other']),
  ourTake: z.string().optional(),    // short editorial note — clearly separated from facts in the UI
  variants: z.array(MarketVariant).min(1),
  illustration: z.string().optional(),  // path to OUR illustration, never a company photo
});

const Additive = z.object({
  slug: z.string(),                  // "e621-monosodium-glutamate"
  eNumber: z.string().nullable(),
  names: z.array(z.string()),        // all the names it hides behind on labels
  functionalClass: z.array(z.enum([
    'preservative','emulsifier','stabiliser','colour','flavour-enhancer','sweetener',
    'acidity-regulator','anticaking','antioxidant','raising-agent','thickener','humectant','other'
  ])),
  whatItIs: z.string(),              // plain language, ~60 words, no jargon
  whyItIsInYourFood: z.string(),     // the commercial reason — this is the interesting part
  evidenceSummary: z.string(),
  evidenceStrength: z.enum(['well-established','mixed','emerging','contested']),
  regulatoryStatus: z.object({
    eu: z.string(), us: z.string(), uk: z.string(),
  }),                                // e.g. "Authorised, ADI 0–XX mg/kg bw"
  notableDivergence: z.string().nullable(),  // where regulators disagree, and why
  sources: z.array(Source).min(2),   // two independent sources minimum for additives
});
```

**Rules the validator must enforce:**

- Every `*Ref` resolves to an existing file (broken reference = build failure).
- Every `Source.url` is well-formed; every fact-bearing object has ≥1 source; additives have ≥2.
- `verifiedOn` older than 365 days emits a warning in `npm run content:coverage`, not an error.
- Slugs are unique, kebab-case, and stable (they are permanent URLs).
- Nutrition sanity checks: `saturatesG ≤ fatG`, `sugarsG ≤ carbohydrateG`, `sodiumMg ≈ saltG × 400 ± 5 %`, energy roughly consistent with macros (±20 %) — warn, don't fail, but surface it loudly.

---

## 6. Site map and page specifications

All routes under `/[locale]/`. Everything statically generated.

**`/` — Home.** The hero is the thesis, not a stock arrangement. Lead with the struck-through wordmark resolving on load, one genuinely startling verified data point from real content, and immediately the chain picker. Below: the additive decoder entry point, the latest long-form piece, a slot reserved for the newest YouTube video (component built now, empty state until the channel exists), and an email capture that stores nothing until we have a provider (render it disabled with a clear note rather than faking it).

**`/chains` — Index.** All chains as a scannable grid with data-coverage badges (`12 items documented`, `partial`). Filter by country and category. Honest about what we don't have yet.

**`/chains/[chain]`** — Chain header (text wordmark in *our* type), one-paragraph intro, market selector (this drives which variant data is shown site-wide, persisted in a cookie), category tabs, item grid where each card shows the item name, kcal, and a compact traffic-light strip.

**`/chains/[chain]/[item]` — the centrepiece.** Get this page right and the project works. Sections, in order:

1. **Header** — item name, chain, serving size, market selector, `verifiedOn` date.
2. **The reality check** — the signature visualisation. Sugar as stacked cubes (1 cube = 4 g), salt as levelled teaspoons (1 tsp = 6 g salt), saturated fat as pats of butter (1 pat = 5 g). Animated on scroll into view, static under `prefers-reduced-motion`, each with a plain-text equivalent sentence in the DOM. **No exercise equivalents.**
3. **Traffic lights** — UK FSA front-of-pack thresholds for fat, saturates, sugars and salt, computed per 100 g *and* per portion, with the numeric thresholds shown so the reader can check our maths. Text labels alongside colour.
4. **Reference intake context** — percentage of adult reference intakes, presented neutrally as arcs with numbers. No "you've used up X % of your day" language.
5. **What's actually in it** — the ingredient list rendered as tappable chips. Additives are visually distinguished. Tapping opens a drawer with the decoder entry (no navigation away). Group by functional class with a heading like *"Five ingredients are here to make it survive a freezer."*
6. **Same product, different country** — when two or more market variants exist, a diff view showing which additives/ingredients appear in one market and not another. This is the single most shareable feature on the site; build it properly.
7. **Our take** — clearly demarcated editorial box, visually distinct from everything above it.
8. **Sources** — every source listed, dated, linked. Non-negotiable, always visible, never collapsed by default on desktop.
9. **Compare** and **share** actions.

**`/decoder`** — searchable, filterable index of additives and ingredients (filter by functional class, regulatory status, evidence strength). **`/decoder/[slug]`** — full entry plus "found in" back-links generated from the content graph.

**`/compare`** — up to three items side by side, state in the URL so it is shareable, delta bars, works down to 360 px (horizontal scroll with sticky row labels).

**`/learn/[slug]`** — MDX long-form, with the interactive components importable inline.

**`/about`, `/methodology`, `/sources`, `/legal`, `/privacy`** — `methodology` explains exactly how we source and verify, which is what separates this from a rage blog.

---

## 7. Internationalisation, including translate-into-anything

Documented fully in `docs/I18N.md`. Two tiers.

**Tier 1 — core locales, pre-translated and statically rendered.** Source content is authored in `en`. A build script translates into a configured core set (start with `cs`, `de`, `es`, `fr`, `it`, `pl`, `pt`, `nl`) via the Anthropic API, writing the results into `content/i18n/<locale>/` and `packages/i18n/messages/<locale>/`. **Translations are committed to the repo** — they are reviewable, diffable, free at request time, and fully indexable. Each locale gets `/[locale]/...` routes, `hreflang` alternates, and a localised sitemap.

**Tier 2 — any language, on demand.** A language picker listing ~200 languages (searchable). Choosing a non-core language calls `POST /api/translate` with `{ locale, namespace, contentHash }`. The handler returns the translated string bundle and caches it under `t:{locale}:{namespace}:{contentHash}` — permanently, because the hash changes whenever the source text changes. First visitor in Vietnamese pays the latency once; everyone after that is served from cache. Without Redis configured, fall back to an in-memory LRU so the feature still works locally.

**Requirements for both tiers:**

- **Zero hard-coded user-facing strings.** Every string lives in a catalogue. Add a lint rule that fails on bare text nodes in components.
- `content/glossary.json` defines **do-not-translate** terms (chain names, product names, E-numbers, brand terms, "We Hate Fast Food") and **translate-consistently** terms (nutrition vocabulary). The glossary is injected into every translation prompt.
- Numbers, dates and units go through `Intl.*` — never string-concatenated.
- Machine-translated pages carry a small, honest badge and a link to the English original.
- Full RTL support: CSS logical properties everywhere, correct `dir`, tested with `ar` in the Playwright suite.
- Translation quality: instruct the model to preserve the voice, keep placeholders intact, return JSON only, and never translate anything in the do-not-translate list. Validate the returned JSON against the source key set before caching — mismatched keys mean the translation is rejected, not shipped.

---

## 8. Design direction

Do **not** open a code editor until you have written a design plan in `docs/BRAND.md` and I have approved it: 4–6 named hex tokens, three typeface roles (display / body / data), a layout concept with ASCII wireframes, and one signature element the site will be remembered for.

Ground the design in the subject's own visual world — nutrition panels, ingredient declarations, drive-thru menu boards, tray liners, receipt paper, hazard pictograms, laboratory specimen cards, the flat bold ink of comics. Three directions worth exploring before you choose:

- **Specimen dossier** — the food treated as a laboratory sample. Clinical white, hazard orange, monospace data, evidence-file typography, comic halftone only for illustration.
- **Menu board at 2 a.m.** — the chromatics of backlit signage: sodium amber and hot red on deep brown-black, ultra-condensed display type, everything else quiet.
- **Regulatory notice** — the visual language of official warnings and safety data sheets, subverted: dense grids, rule lines, stamped overprints, one aggressive accent.

Constraints regardless of direction: mobile-first; the display face used with restraint and the data face doing real work (this is a data site — the numbers should look authoritative); the comic/halftone treatment must be reusable in the YouTube visual style; **spend the boldness in one place** and keep everything around it disciplined. Avoid the current generic-AI defaults — warm cream with a serif and a terracotta accent, near-black with one acid-green accent, hairline-rule broadsheet — unless you can argue specifically why this brief demands it.

All tokens live in `packages/design-tokens/tokens.json` and are emitted both as CSS custom properties and as a JSON file the video and social pipelines will import, so all three channels stay visually identical.

---

## 9. Automation — how I will drive this from Claude Code

This matters as much as the site itself. I will be adding chains and items with you, session after session, for a long time.

**`CLAUDE.md`** (root) must tell a future session: what the project is, the content model, where things live, the sourcing rules, how to run checks, the commit convention, and — critically — **the rule that no fact is ever written without a source**.

**Slash commands** in `.claude/commands/`:

- `/add-chain <name>` — interviews me for the minimum viable chain record, scaffolds the JSON, validates, reports what's still missing.
- `/add-item <chain> <item>` — scaffolds a `MenuItem` with an empty market variant, prompts me for the source URL, refuses to write numbers I haven't provided or that aren't in a source I've supplied.
- `/add-additive <e-number>` — scaffolds a decoder entry with the two-source requirement enforced.
- `/verify-content` — re-checks every reference, flags entries with `verifiedOn` older than a year, prints a to-do list.
- `/new-article <slug>` — MDX scaffold with frontmatter and source block.

**Subagents** in `.claude/agents/`: `content-researcher` (finds and cites primary sources; explicitly forbidden from stating a figure it cannot cite), `a11y-auditor`, `perf-auditor`.

**npm scripts** (all cross-platform Node):
`dev`, `build`, `check`, `test`, `content:validate`, `content:coverage` (a table of what data we hold and what's missing — this is what drives our working sessions), `i18n:extract`, `i18n:translate`, `search:index`, `social:cards`, `export:video-brief`.

---

## 10. SEO and sharing

Static rendering, per-locale sitemaps, canonical + `hreflang`, `robots.txt`. Structured data: `schema.org/MenuItem` with `NutritionInformation` on item pages, `Article` on `/learn`, `BreadcrumbList` throughout. Per-item OG images generated at build time with `@vercel/og` — featuring the sugar-cube visual, the item name and the wordmark. **Design the OG generator to also emit 1080×1080 and 1080×1350 crops** (`npm run social:cards`): that is our Instagram asset pipeline for free.

---

## 11. Contracts with the YouTube and Instagram pipelines

Do not build these pipelines. Do build the interfaces they will plug into:

- `npm run export:video-brief -- --item=<chain>/<item>` writes `exports/video-briefs/<chain>-<item>.json`: verified facts, sources, the striking comparisons, suggested narrative beats, and the design tokens. Document the schema in `docs/ARCHITECTURE.md` and ship one example file.
- `npm run social:cards -- --item=<chain>/<item>` writes IG-ready images into `exports/social/`.
- Keep `packages/content` free of any Next.js import so a Node-based video pipeline can consume it directly.
- Reserve `/watch/[slug]` in the route plan (video landing pages), unimplemented for now.

I have an existing Claude Code project — *"YouTube Video agent orchestration system"* — which will consume these. Don't assume anything about its internals; if I point you at that repo later, adapt the export schema to it rather than the other way round.

---

## 12. Legal and safety requirements

Write `docs/LEGAL.md` covering, and implement in the UI:

- **Trademarks.** Chain and product names are used nominatively to identify the products discussed. No logos, mascots, packaging photography, or brand colour identities. A disclaimer of non-affiliation in the footer and on every chain page.
- **Data.** Individual nutrition figures are facts, but bulk-copying a company's nutrition database can engage the EU sui generis database right. So: selective, manually curated entries, always attributed, always accompanied by our own analysis. Respect `robots.txt` if you ever build any fetching tooling — and ask me before you build any.
- **Imagery.** All product imagery is our own illustration. Never a photograph of branded packaging.
- **Not medical or dietary advice.** Persistent, plainly worded, on every item page.
- **Figures change.** Every page states the market and the date the data was verified, and tells readers to check the chain's current published figures.
- **Wellbeing.** Because this site discusses food and calories: no calorie-shaming or exercise-equivalent framing anywhere, a "Just the numbers" mode that disables illustrative visualisations, and a discreet, non-preachy link to eating-disorder support resources in the footer.
- **GDPR.** Cookieless analytics only. The one cookie we set (locale + market preference) is strictly functional. Privacy page written in plain English.

---

## 13. Phases and gates

- **Phase 0 — Plan.** `docs/PLAN.md` + `docs/BRAND.md` design plan + the answers you need from §14. No code. **STOP.**
- **Phase 1 — Foundation.** Monorepo, Next.js app, design tokens, CI, `CLAUDE.md`, slash commands, empty check suite passing. **STOP.**
- **Phase 2 — Content layer.** Zod schemas, loaders, validator, `content:coverage`, one obviously-fake seed chain with three items in `content/_seed/`, unit tests for the nutrition maths. **STOP.**
- **Phase 3 — Core pages.** Home, chains index, chain page, item page including the reality-check visualisation, traffic lights and the ingredient drawer. Mobile and desktop. **STOP.**
- **Phase 4 — Decoder, compare, search, market-diff view. STOP.**
- **Phase 5 — i18n.** Core locales pipeline + the on-demand translation endpoint + language picker + RTL. **STOP.**
- **Phase 6 — Hardening.** SEO, OG/social generation, video-brief export, a11y audit, performance budgets, Playwright smoke suite, deployment. **STOP.**

Then we start adding real chains and real products together, which is the point of all of the above.

---

## 14. Confirm with me before Phase 1

1. Which market should be the default — US, UK, or EU? (This shapes the traffic-light thresholds and reference intakes.)
2. Confirm the core locale list for tier-1 translation.
3. Which design direction from §8, or your own — and what is your proposed signature element?
4. Which chain should be the first real one after the seed data is removed?
5. Should Nutri-Score be computed and displayed, or is the FSA traffic-light system enough for v1?
6. Vercel or Cloudflare Pages?
7. Anything in this brief you think is wrong, over-engineered, or a bad idea — say so now rather than building it.
