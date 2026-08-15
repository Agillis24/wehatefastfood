# ARCHITECTURE.md

How the pieces fit, and the contracts other pipelines can rely on.

---

## 1. Shape

```
content/            JSON + reference data. The source of truth.
  |
packages/content/   Zod schemas, loaders, reference graph, nutrition maths.
  |                 Plain Node. NO framework imports, ever.
  +-> apps/web/          Next.js. Static except one route.
  +-> scripts/           social:cards, export:video-brief, search:index
  +-> (future) video and social pipelines, under plain Node
```

`packages/content` is the hinge. Everything downstream reads the same figures through the same validated types, so a number cannot be right on the website and wrong in a video.

---

## 2. Rendering

Every route is statically generated except `/api/translate`.

| Route                                      | Rendering                          | Why                                                                                                  |
| ------------------------------------------ | ---------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `/[locale]`                                | static                             | document                                                                                             |
| `/[locale]/chains`                         | static                             | document                                                                                             |
| `/[locale]/chains/[chain]`                 | static                             | document                                                                                             |
| `/[locale]/chains/[chain]/[item]/[market]` | static, one page per market        | each market is a different set of figures                                                            |
| `/[locale]/decoder`, `/decoder/[slug]`     | static                             | documents                                                                                            |
| `/[locale]/compare/[[...selection]]`       | on demand, empty state prerendered | a comparison is a query, not a document; prerendering every combination is a combinatorial explosion |
| `/api/translate`                           | dynamic                            | tier-2 translation                                                                                   |

**Market is a path segment, not a query parameter.** Next cannot prerender per query value, and reading `searchParams` opts a route into dynamic rendering. See `docs/PLAN.md` §2.2.

---

## 3. The client-JavaScript position

**There are no client components.** Not "few" - none.

This is measured, not aspirational. Adding one `'use client'` component to the decoder page moved _every_ route from 107 kB to 118 kB first-load JS, including the item page that did not use it, because the first client component anywhere pulls the React client runtime into the shared bundle. Removing it restored 107 kB exactly.

Everything interactive is built without it:

| Feature                                    | Mechanism                                        |
| ------------------------------------------ | ------------------------------------------------ |
| Additive drawer                            | native `<details>`                               |
| Market switcher                            | links; market is in the path                     |
| Language picker                            | `<details>` with links                           |
| "Just the numbers"                         | CSS checkbox plus `:has()`                       |
| Decoder search and filters                 | ~50 lines of DOM script, progressive enhancement |
| Reality check, traffic lights, intake arcs | server-rendered SVG                              |

`npm run budget:check` fails the build if a route exceeds its budget.

---

## 4. Contract: video brief

`npm run export:video-brief -- --item=<chain>/<item> --market=<market>`
writes `exports/video-briefs/<chain>-<item>-<market>.json`.

```jsonc
{
  "schemaVersion": 1,
  "subject":  { "chain": {...}, "item": {...}, "market": "GB",
                "verifiedOn": "2026-08-14", "status": "partial" },

  // True when anything here derives from reference data no human has checked.
  // A video made from a provisional brief must say so, as the web page does.
  "provisional": true,
  "provisionalReason": "...",

  "facts": {
    "servingSizeG": 250,
    "perServing": { /* NutritionFacts */ },
    "per100":     { /* NutritionFacts */ },
    "quantityStack": {
      "sugar":     { "grams": 9,  "unitGrams": 4, "units": 2.25 },
      "salt":      { "grams": 2.5,"unitGrams": 6, "units": 0.42 },
      "saturates": { "grams": 16, "unitGrams": 5, "units": 3.2 }
    },
    "trafficLights": [
      { "nutrient": "fat", "band": "high", "per100": 16, "perPortion": 40,
        "drivenByPortion": true,
        "thresholds": { "lowMax": 3, "highMin": 17.5, "portionHigh": 21 } }
    ],
    "referenceIntakePercent": { "energyKcal": 35, "saltG": 41.7, "...": null },
    "allergens": []
  },

  "additives": [ { "slug", "eNumber", "name", "whyItIsInYourFood",
                   "evidenceStrength", "sources" } ],

  "marketDifferences": [ { "otherMarket": "US",
                           "onlyHere": [], "onlyThere": ["e621-..."] } ],

  "editorial": {
    "ourTake": null,
    "suggestedBeats": [ "..." ],   // adapts to the data, e.g. names the
                                   // portion rule when a band was escalated
    "forbidden":      [ "..." ]    // no exercise equivalents, etc.
  },

  "sources": { "forThisMarket": [...], "forTheChain": [...] },
  "design":  { "tokens": { "--color-pink": "#FF2D62", ... },
               "angle": "-19deg" },
  "assets":  { "cardSvg": "...", "cardPng": "..." }
}
```

**The point of the brief is that a video cannot invent a number either.** Every figure carries its source and verification date, `provisional` is honest, and `editorial.forbidden` travels with the data so a script inherits the constraints rather than being trusted to remember them.

`schemaVersion` is bumped on any breaking change. If the existing YouTube orchestration project has its own shape, adapt this export to it rather than the other way round.

---

## 5. Contract: social cards

`npm run social:cards -- --item=<chain>/<item>` writes into `exports/social/`:

| File suffix        | Size        | Use                              |
| ------------------ | ----------- | -------------------------------- |
| `-og.png`          | 1200 × 630  | Open Graph                       |
| `-ig-square.png`   | 1080 × 1080 | Instagram feed                   |
| `-ig-portrait.png` | 1080 × 1350 | Instagram portrait               |
| `-video.png`       | 1920 × 1080 | video opening frame, ink surface |

All four come from one function, `specimenCardSvg` in `scripts/lib/specimen-card.mjs`, with the SVG written alongside each PNG. Hand-written SVG rather than satori: the card is about twenty shapes, and this way there is no JSX-to-SVG engine in the dependency tree.

---

## 6. Contract: search index

`npm run search:index` writes `apps/web/public/search-index.json`: one record per addressable thing, with a precomputed folded haystack.

Not used by the decoder page, which filters DOM nodes the server already rendered. This index is for site-wide search, which spans chains, items and additives and cannot be answered from one page's DOM.

---

## 7. Translation

Two tiers, one prompt (`packages/i18n/src/prompt.ts`) so they cannot drift.

**Tier 1** is build time, committed, reviewable. `npm run i18n:translate -- --locale=cs`. A translation is rejected if the JSON does not parse, the key set differs, or an ICU placeholder is renamed, added or dropped.

**Tier 2** is `/api/translate`, on demand, cached under `t:{locale}:{namespace}:{contentHash}` for ever - permanent is only safe because the hash changes when the English does.

`@wff/i18n` exports configuration only. The translation machinery is behind `@wff/i18n/translation` because it imports `node:crypto`, and re-exporting it from the root made webpack try to bundle `node:crypto` into the middleware.

---

## 8. Reference data is content

FSA thresholds and EU reference intakes live in `content/reference/` with sources and their own verification status, not hard-coded in TypeScript. They are third-party published facts exactly like a nutrition panel, so they go through the same discipline - which is also why the system can honestly tell you it has not checked them yet.
