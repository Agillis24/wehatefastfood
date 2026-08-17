# REFERENCE_VERIFICATION.md

What was actually done to `content/reference/fsa-thresholds.json` and
`content/reference/reference-intakes.json` on **2026-08-17**, and what still has not been.

These two files decide whether a food shows red and what a percentage means. They were written
from working knowledge and had never been checked against anything. This is the record of the
check, kept so that "verified" can never be a word somebody took on trust.

---

## Method

Three readers per document transcribed the tables **independently and blind** — they were never
shown the values this repo held. That is the whole design. A model handed a plausible number and
asked "is this right?" agrees; the only way a wrong value in the repo survives to the end of a
check is if the check never saw it. Two further readers were then told to **refute** the
consensus rather than confirm it.

The FSA readers could not parse the PDF through a fetch tool, downloaded it, and extracted the
text locally — which is how the `≤` glyphs survived, since plain extraction drops them and the
inequality direction is the thing most easily got wrong.

| Document                                                                          | Retrieved                                                                                                                     | Readers | Unanimous |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------- | --------- |
| FoP nutrition labelling guidance, Tables 2–3 (pp. 19–20), "Updated November 2016" | [gov.uk PDF](https://assets.publishing.service.gov.uk/media/5a80cd03ed915d74e33fc7c5/FoP_Nutrition_labelling_UK_guidance.pdf) | 3 of 3  | 26 of 26  |
| Regulation (EU) No 1169/2011, Annex XIII Part B                                   | [EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32011R1169)                                             | 3 of 3  | 8 of 8    |

**Every figure already in the repo was correct.** Both adversarial readers returned
`consensus-holds` with zero numeric errors.

---

## What was wrong, and is now fixed

**The per-portion threshold was one number for two categories.** The guidance prints
_"portion size criteria apply to portions/serving sizes greater than 100g"_ under the food table
and _"greater than 150ml"_ under the drinks table. This repo held a single
`portionAppliesAboveG: 100` applied to both, so every drink portion between 100 ml and 150 ml was
eligible for a red it had not earned. Now `food.portionAppliesAboveG` and
`drink.portionAppliesAboveMl`, with tests at both boundaries.

---

## What was already right, and must stay right

- **The boundary operators.** LOW is `≤ lowMax` **inclusive**; HIGH is `> highMin` **exclusive**;
  the amber band is printed as `"> 3.0g to ≤ 17.5g/100g"`. A food at exactly 17.5 g fat per 100 g
  is **amber**. `bandFor()` implements this correctly, but the field name `highMin` reads as "the
  minimum value that counts as high", which is the opposite. Read the operator, not the name.
- **The portion test is strictly greater than.** Exactly 100 g, or exactly 150 ml, does not trigger it.
- **The per-portion rule only escalates, and does so per nutrient.** The guidance's own worked
  example B: _"Only (total) sugars meet the criteria for red per portion. For all other nutrients,
  the per 100ml criteria should be used."_
- **Food versus drink is a product category, not a unit.** Table 2 is headed _"Criteria for 100g of
  food (whether or not it is sold by volume)"_. `isDrink` comes from `item.category`, not from
  whether the figures are in g or ml. Do not "fix" this by switching on the unit.
- **Drink salt does not halve.** Fat, saturates and sugars halve from the food table to the drinks
  table; salt LOW is `≤ 0.3` in **both**. Anything that derives the drinks table by halving the food
  table silently produces `0.15` and is wrong.
- **Energy is one cell.** Annex XIII reads `"8 400 kJ/2 000 kcal"`. Both numbers are literals from
  the table and neither may be derived from the other — 8400 kJ is about 2008 kcal, not 2000.
- **No colour coding for energy.** _"Red, amber and green colour coding and HML text should not be
  applied to energy information."_

---

## What has still not happened

**A person has not opened either document.** That is the only thing standing between
`"status": "unverified"` and `"verified"`, and it is deliberately still standing. Three blind
machine transcriptions agreeing, with quotes, is strong evidence and is not the same act.

Until someone does it, every page derived from these tables carries its caveat — the traffic
lights and, since 2026-08-17, the reference-intake percentages too. `/methodology` says so in
public.

**To close it:** open the two documents at the URLs above, read Tables 2–3 and Annex XIII Part B
against the two JSON files, then set `status` to `"verified"` and `verifiedOn` to the date you did
it. It should take about ten minutes, because the numbers are already right — you are confirming,
not transcribing.

Two things worth knowing while you do:

- The guidance is dated November 2016 and cites EU law by its pre-Brexit names. gov.uk shows no
  withdrawal or supersession notice, so these remain the current published criteria, but the legal
  citations in its text are stale even though the numbers are not.
- The document's own cross-references are wrong — page 20 points at "Annex 2" for criteria that
  are in Annex 3. Cite it by page.
