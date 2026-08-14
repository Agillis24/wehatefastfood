---
description: Interview for a minimum viable chain record, scaffold it, validate, and report what is still missing
---

# /add-chain <name>

Create `content/chains/<slug>.json`.

## Ask for, and do not guess

- Official company name, as text (we never reproduce a logo)
- Slug — kebab-case, permanent, it becomes a URL that must not change
- Which markets we intend to hold data for
- A source: the company's own corporate or nutrition page, with the date you looked

Founded year and HQ country are optional. **Leave them out rather than guessing** — a wrong founding year on a site that sells accuracy is a self-inflicted wound over a detail nobody needed.

## Then

1. Write `oneLiner` (max 140 chars) and `longIntro` in the project voice: dry, specific, aimed at the company and never at its customers. Offer a draft; let the user edit.
2. `accentToken` comes from the fixed project rotation, assigned by slug hash. **Never** the company's brand colour — see `docs/LEGAL.md`.
3. `dataStatus` starts `"unpublished"`. It becomes `"partial"` when items exist and `"verified"` only when a human has checked them.
4. Run `npm run content:validate`, then `npm run content:coverage`, and show the user where this chain now sits.

Remind them the chain page will carry the non-affiliation disclaimer automatically.
