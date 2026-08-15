# CONTENT_GUIDE.md

How to add content without breaking the one promise the project makes.

---

## The rule

**Never write a figure you cannot attribute to a document you have actually read.**

Not from memory, not from a similar product, not "approximately". If it is unknown the value is `null`, the status is `"unpublished"`, and the page says so. A single fabricated number ends the project, because its entire value is being the place where the numbers are right.

---

## Adding things

| Command                    | For                             |
| -------------------------- | ------------------------------- |
| `/add-chain <name>`        | a company                       |
| `/add-item <chain> <item>` | a product, one market at a time |
| `/add-additive <e-number>` | a decoder entry                 |
| `/new-article <slug>`      | long-form                       |
| `/verify-content`          | maintenance pass                |

`npm run content:coverage` prints what we hold and what is missing. That table drives the working sessions — work the gaps, oldest first.

---

## Transcribing a nutrition panel

- **Copy, do not interpret.** Do not convert units, round, or reconcile inconsistencies silently.
- If the source gives sodium and not salt, record sodium and leave `saltG` null. The display layer converts and names the constant it used.
- Record the _published_ basis. If only per-serving is published, the per-100 panel is derived — and that derivation needs a serving size. Without one, no traffic light can be computed, and the page says so rather than guessing.
- `verifiedOn` is the date **you** read the page, not the date they published it.

## Sources

- One minimum per fact-bearing object. **Two from different publishers** for an additive — the same regulator cited twice is one source, and the validator enforces it.
- Prefer: company disclosure, then regulator, then peer-reviewed, then database, then journalism.
- Flag when a page does not say which market it covers. This is common and it matters.

## Writing an additive entry

`whyItIsInYourFood` is the interesting field and the reason the decoder exists. Not "it is an emulsifier" but the problem it solves for the manufacturer: shelf life, freeze-thaw survival, mouthfeel at a lower fat cost, colour that survives a warming cabinet.

`evidenceStrength` is conservative. Overstating a hazard is a worse failure than understating one, because it is the failure our critics expect. Half the additives in the decoder are boring, and entries should say so when they are — that is what makes the alarming ones credible.

`notableDivergence`: "not authorised in the EU" frequently means "nobody filed a dossier", not "found to be harmful". Getting this wrong is a serious error, not a nuance.

---

## Voice

Dry, sharp, funny, specific. Hostile to the industry — its formulation choices, its portion inflation, its marketing. **Never hostile to the person eating the food.** Snark points up.

Never: exercise equivalents, good/bad food framing, guilt, BMI, weight-loss angles, or advice about what the reader should eat.

---

## Seed data

Obviously fake, named as fake, and only in `content/_seed/`. The validator fails the build if seed-marked content appears outside it, and production builds exclude the directory entirely — which is why `npm run build` currently generates zero item pages.
