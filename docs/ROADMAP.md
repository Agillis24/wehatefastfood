# ROADMAP.md

## Done

- **Phase 0** Plan, brand, decisions.
- **Phase 1** Monorepo, tokens, app shell, CI, checks.
- **Phase 2** Schemas, loaders, validator, coverage, seed, nutrition maths.
- **Phase 3** Home, chains index, chain page, item page. Zero client JS.
- **Phase 4** Decoder, compare, search index, market diff.
- **Phase 5** i18n: Czech pilot, tier-2 endpoint, glossary, drift gate.
- **Phase 6** Structured data, social and OG cards, video-brief export, budget gate, Playwright smoke suite, deployment config.
- **Deployed** 2026-08-17, GitHub Pages at `www.wehatefastfood.com`, closed to crawlers, seed data only.
- **The footer pages** `/about`, `/methodology`, `/sources`, `/legal`, `/privacy` in `en` and `cs`. `/sources` is generated from the content graph. Two tests guard them: every footer link must resolve in both locales, and no page may request anything from a third party, so `/privacy` cannot outlive its own claim.

---

## Blocking launch

1. **Verify the reference data.** `content/reference/fsa-thresholds.json` and `reference-intakes.json` are `status: "unverified"` — written from working knowledge, not transcribed from the source documents with a human checking. They decide whether a food shows red or amber. Nothing derived from them may be called verified until someone opens the DHSC/FSA guidance and Annex XIII of Regulation (EU) 1169/2011 and confirms every value.
2. **Review the Czech.** `packages/i18n/messages/cs/_provenance.json` has `reviewedByHuman: false`.
3. **Add the first real chain** — McDonald's, GB and US — then delete `content/_seed/`.
4. **Self-host the fonts.** Archivo, Public Sans and IBM Plex Mono are named in the tokens but not yet downloaded, subset to `latin` + `latin-ext`, or wired through `next/font`. Until then the site renders in fallbacks.
5. ~~**Deploy.**~~ Done, on GitHub Pages rather than Vercel - Vercel Hobby forbids commercial use and this project feeds a YouTube channel. The cost was tier-2 translation, dropped by decision.

---

## Next, in rough order

- Per-item OG images wired into `generateMetadata` from the generated cards.
- The illustration set: first the fixed cast of measure objects, then per-item artwork.
- `/learn` MDX articles.
- Site-wide search over the generated index.
- Plain-data mode that persists across navigation. Currently CSS-only and per-page; persistence needs a cookie (which forces dynamic rendering) or a small island (which costs 11 kB on every route). Neither is obviously right yet.
- Tier-1 translation for the remaining seven locales, after `cs` has been reviewed and the pipeline has proved itself against it.
- Analytics — Plausible or Umami — behind the env var, off in development.

---

## Deliberately not done

- **Nutri-Score.** Computing it needs fibre and fruit/veg/nut percentages that chains do not publish, so it would require estimating inputs. That is the one thing this project will not do.
- **A charting library, an animation library, a React island.** Each was considered and each was measured or reasoned out; see `docs/ARCHITECTURE.md` §3.
- **Fetching tooling beyond a single page at a time.** No crawling, by decision and by the terms the researcher agent operates under.
