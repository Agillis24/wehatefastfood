# LEGAL.md

Not legal advice. This is the operating position the project works to, and the reasoning behind the rules that are enforced in code. Where a rule is enforced, the enforcement is named, because a rule that lives only in a document is a rule that will be broken by someone who never read it.

---

## 1. Trademarks

**Position.** Chain and product names are used _nominatively_: to identify the products being discussed. That is what the names are for, and there is no other way to write about a Big Mac than to call it a Big Mac.

**Rules.**

- Chain and product names appear as **text only**, set in our own typeface.
- Never a logo, a mascot, packaging photography, or trade dress.
- Never a company's brand colour used to identify that company.
- A disclaimer of non-affiliation appears in the footer of every page and on every chain page.

**Enforced by.** `ChainSchema.accentToken` is an enum of four project colours (`packages/content/src/schemas/entities.ts`), not a free string. A free string invites someone to reach for the company's own colour, and a per-chain accent that happens to match their identity is trade dress whatever the variable is called. `Disclaimers` is a component, not a copy-paste (`apps/web/src/components/ui/Chrome.tsx`).

---

## 2. Nutrition data and the database right

**Position.** An individual nutrition figure is a fact, and facts are not owned. A company's compiled nutrition database is a different thing: in the EU it can attract the _sui generis_ database right, which protects the investment in assembling the collection rather than the individual figures.

So the line we work to: **selective, manually curated entries, always attributed, always accompanied by our own analysis.** Never a bulk copy.

**Rules.**

- Entries are added one at a time, by hand, because a human decided that item was worth documenting.
- Every figure carries its source and the date we read it.
- We never reproduce a company's full nutrition table for a menu.
- No crawling. No bulk traversal. `robots.txt` is respected.

**Enforced by.** `.claude/agents/content-researcher.md` states the fetching limits as the terms of its own authorisation, not as advice. `/add-item` refuses to write a figure the user has not supplied or pointed to a source for.

---

## 3. Imagery

All product imagery is our own flat-vector artwork. Never a photograph of branded packaging, never a company's own product photography, never stock food photography passed off as the item.

The Specimen Card (`scripts/lib/specimen-card.mjs`) carries an explicit comment to this effect, because it is the file most likely to be edited by someone in a hurry.

---

## 4. Not medical or dietary advice

Stated plainly, on every item page, every decoder entry, and in the footer. Not a modal, not a collapsed accordion, not a link.

**Enforced by.** The `Disclaimers` component defaults `withMedical` to true; a page has to opt out deliberately.

---

## 5. Figures change

Every page states the market it describes and the date we verified it. Readers are told to check the company's current published figures before relying on them.

**Enforced by.** `verifiedOn` is required on every `MarketVariant`. `npm run content:validate` warns past 365 days; `npm run content:coverage` lists the oldest first.

---

## 6. Wellbeing

This site discusses food and calories, and some readers will arrive with a difficult relationship to both.

- **No exercise equivalents.** Not "walk it off", not "run 45 minutes", not in any form. The unit is always a physical quantity of the substance itself, never a quantity of the reader's time, effort or body.
- No calorie shaming, no good/bad food framing, no BMI, no weight-loss angle.
- No drawings of human bodies anywhere in the illustration system.
- A "Just the numbers" mode turns off every illustrative visualisation and leaves every figure.
- A discreet, non-preachy link to eating-disorder support in the footer, never on the same line as a calorie count.

**Enforced by.** `RealityCheck.tsx` carries the prohibition in a comment at the top of the file. The video-brief export repeats it in `editorial.forbidden`, so a script written from a brief inherits it. `docs/BRAND.md` §12 lists it among the things the project will never do.

---

## 7. Evidence

The fastest way to lose this project is to imply a hazard the evidence does not support. That is the failure our critics expect, and it would be deserved.

- Every additive carries an explicit `evidenceStrength` and the current EU, US and UK status, each with its own citation.
- Where regulators disagree, both positions are shown. We do not pick one.
- "Not authorised in the EU" frequently means "nobody has filed a dossier", not "found to be harmful". Getting that distinction wrong is treated as a serious error, not a nuance.
- The decoder states, on every entry, that evidence strength is our reading of the listed sources and not a safety verdict.

**Enforced by.** Two sources from two _different publishers_ per additive, checked in `packages/content/src/graph.ts` - the brief's "minimum two" alone would have allowed the same regulator cited twice.

---

## 8. Machine translation

Tier-2 translations do not touch anything that describes evidence, states a regulatory position, or carries our opinion. Those fields are stripped before the model sees them (`TIER2_FORBIDDEN_FIELDS`) and stay in English behind a visible notice.

The reason is not stylistic. A machine-translated claim about food safety, in a language nobody on the project reads, is a claim we cannot stand behind and cannot audit. Tier-2 pages also carry `noindex`.

---

## 9. Privacy

- Cookieless analytics only, behind an environment variable, disabled by default in development.
- No third-party trackers, no ad SDKs, no consent banner needed because there is nothing to consent to.
- No secret is ever prefixed `NEXT_PUBLIC_`; `npm run check` scans for it.
- The privacy page is written in plain English.

---

## 10. If a company gets in touch

Correct the record fast and visibly if we are wrong - that is the whole basis on which this project asks to be believed. Being right is more valuable than being defensive.

If a figure is disputed: re-read the source, record what we find, and update `verifiedOn`. If the company has changed the product, that is itself the story, and the old figure with its retrieval date is evidence rather than an embarrassment.
