# CLAUDE.md — operating instructions

Read this before doing anything in this repo. `BRIEF.md` is the contract; this file is how to work inside it.

---

## The one rule that outranks everything

**Never invent a fact.** Not a nutrition figure, not an ingredient, not a regulatory status, not a date. Not "approximately", not "typically", not "based on similar products".

If you do not have it from a source the user gave you or that you fetched and cited, the value is `null`, the status is `"unpublished"`, and the UI says so. A single fabricated number ends this project, because its entire value is being the place where the numbers are right.

This applies to you more than to anyone, because you are fast and fluent and a plausible-looking gram figure costs you nothing to produce.

**Corollary:** placeholder content must be obviously fake, must say so in its own name (`EXAMPLE BURGER CO (SEED DATA — NOT REAL)`), and must live only in `content/_seed/`.

---

## What this is

**wehatefastfood.com** — an independent, evidence-based, deliberately opinionated resource that makes fast-food nutrition and ingredients legible to a normal person.

Pick a chain → pick an item → see what is actually in it, what those things do, and why the company put them there.

It is also the hub for a future YouTube channel and Instagram account, which is why `packages/content` must never import a framework: those pipelines will consume it under plain Node.

**Voice:** dry, sharp, funny, specific. Hostile to the industry — its formulation choices, its portion inflation, its marketing. **Never hostile to the person eating the food.** Snark points up.

**Tagline of record:** _"What's actually in it — and why they put it there."_

---

## Working agreement

- **Phase gates.** Phases 0–6 in `BRIEF.md` §13. At the end of each: run `npm run check`, commit, summarise, then **STOP and wait**. Do not roll into the next phase uninvited.
- **Ask before adding a dependency** that is not already in `package.json`. Prefer platform features and hand-written code under ~150 lines.
- **Small commits**, conventional messages, one logical change each.
- **The user speaks Czech in chat.** Reply in Czech. Keep the repo, code, comments and site content in English.

---

## Definition of done

```bash
npm run check
```

Seven gates, all must pass: tokens, typecheck, lint, format, secrets, content, test. Then `npm run build` must succeed.

`npm run check` runs every gate and reports all failures rather than stopping at the first.

---

## Layout

```
apps/web/              Next.js 15 App Router, React 19, Tailwind v4
packages/content/      Zod schemas + typed loaders. THE source of truth. No framework imports.
packages/i18n/         Locale/market config, message catalogues, translation runtime
packages/design-tokens/ tokens.json -> tokens.css + tokens.export.json, plus brand/ marks
content/               The actual data. JSON + MDX. _seed/ is fake and deleted before launch.
scripts/               All tooling. Cross-platform Node. No .sh, ever.
docs/                  PLAN.md ARCHITECTURE.md CONTENT_GUIDE.md BRAND.md LEGAL.md I18N.md ROADMAP.md
```

---

## Things that will bite you

**`locale` and `market` are different axes, and both live in the path.** `/{locale}/chains/{chain}/{item}/{market}`. A cookie may set a default; it may never be the only carrier, or a shared link shows different numbers to different readers. Market is a path segment rather than a query parameter because Next cannot statically prerender per query value. See `docs/PLAN.md` §2.2.

**`packages/content` must not import `next`, `react` or `react-dom`.** Enforced by ESLint. The video pipeline runs under plain Node.

**Windows is the primary dev environment.** No `.sh`, no `&&` in npm scripts, no `rm -rf`, no `NODE_ENV=x cmd`. Everything is `node scripts/*.mjs` spawned with an argv array and no shell.

**No hard-coded user-facing strings.** `react/jsx-no-literals` is an error in `app/` and `components/`. Every string goes through a catalogue, or translation silently skips it.

**No hard-coded hex values.** Colour comes from `packages/design-tokens`. If you need a colour that is not there, that is a design decision, not an implementation detail — raise it.

**Contrast ratio does not measure colour confusability.** It measures lightness. `#FF0000` and `#7A0000` are the same hue and score 2.87:1. If you need to know whether two colours can be _told apart_, use `scripts/color-separation.mjs`, not `scripts/contrast.mjs`. This mistake is already in the history of this repo — do not repeat it.

**The category enum mixes one daypart with nine food forms, so pick the daypart.** `breakfast`
sits in a list otherwise made of `burger`, `wrap`, `fries-sides` and so on, which means every
breakfast item is eligible for two categories and nothing in the schema breaks the tie. **The rule:
if an item is sold on the breakfast menu, its category is `breakfast`. The form categories describe
all-day menu items only.** Without this written down, four of the first fifty-four McDonald's items
were filed by whichever word happened to be in the product name — three "Breakfast Wrap" items under
`wrap` while two burritos of the same construction sat under `breakfast`.

**A diff of two empty lists is not a diff.** `MarketDiff` distinguishes "these two markets declare
the same ingredients" from "we hold no declaration for either", because with no data every list
comes back empty and the first message is a claim about the food made from nothing. Any comparison
UI added later must make the same distinction.

**Never body-shame.** No exercise equivalents ("run 45 minutes to burn this off"), no BMI, no weight-loss framing, no good/bad food moralising, no drawings of human bodies. The frame is always _what is in it and why the company put it there_. This is a hard product constraint, not a tone preference.

**Never use their trade dress.** Chain names as text only, in our typeface. No logos, mascots, packaging photography, or brand colours used to identify a company. All product imagery is our own flat-vector artwork.

---

## Adding content

Use the slash commands in `.claude/commands/`. They exist so that the rules above are enforced by the tool rather than remembered by a person:

| Command                    | Does                                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| `/add-chain <name>`        | Interviews for a minimum viable chain record, scaffolds, validates, reports gaps         |
| `/add-item <chain> <item>` | Scaffolds a MenuItem. **Refuses to write figures not present in a source you supplied.** |
| `/add-additive <e-number>` | Decoder entry, two independent sources enforced                                          |
| `/verify-content`          | Re-checks references, flags `verifiedOn` older than a year, prints a to-do list          |
| `/new-article <slug>`      | MDX scaffold with frontmatter and source block                                           |

`npm run content:coverage` prints what we hold and what is missing. That table drives the working sessions.

---

## Sourcing rules

- Every fact-bearing object carries at least one `Source`. Additives carry at least **two, from different publishers**.
- A `Source` needs title, publisher, URL, and `retrievedOn` — the date _we_ looked, not the date they published.
- `verifiedOn` older than 365 days is a warning, not an error, and appears in `content:coverage`.
- The `content-researcher` subagent may fetch, but only pages it has been pointed at, respecting `robots.txt` and rate-limiting. **No crawling, no bulk traversal, no copying a company's nutrition database.** Individual figures are facts; the database is protected. See `docs/LEGAL.md`.

---

## Current state

**All six phases complete.** `npm run check` is 9 gates; `npm run build` succeeds; 20 Playwright
smoke tests pass on mobile and desktop. Every route measures 104.8 kB gzipped first-load JS against
a 130 kB budget, and `npm run budget:check` now enforces that rather than merely reporting it.

Next is the thing all of it was for: adding real chains and real products, one at a time, with
`/add-chain` and `/add-item`. `npm run content:coverage` is the table that drives those sessions.

### Blocking launch

1. **`content/reference/fsa-thresholds.json` and `reference-intakes.json` are `status: "unverified"`.**
   Written from working knowledge, not transcribed from the source documents with a human checking.
   They decide whether a food shows red or amber. The UI labels anything derived from them as
   provisional and the validator warns on every run, by design.
2. **The Czech is a first draft.** `packages/i18n/messages/cs/_provenance.json` has
   `reviewedByHuman: false`.
3. **Fonts are not self-hosted yet.** Archivo, Public Sans and IBM Plex Mono are named in the
   tokens; the site currently renders in fallbacks.
4. **Seed data must be deleted** once the first real chain lands.

See `docs/ROADMAP.md` for the rest.
