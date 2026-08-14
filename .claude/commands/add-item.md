---
description: Scaffold a MenuItem with a market variant, refusing to write any figure not present in a source the user supplied
---

# /add-item <chain-slug> <item name>

Create `content/items/<chain>/<item>.json`.

## The rule this command exists to enforce

**You may not write a number the user has not given you, or that is not in a source document they have pointed you at.**

Not from memory. Not from a similar product. Not "a Big Mac is usually about". If the user has not supplied the figure or the source, the field is `null` and the variant `status` is `"partial"` or `"unpublished"`.

If you catch yourself about to fill a plausible value, stop and ask instead.

## Steps

1. **Confirm the chain exists.** Read `content/chains/<chain>.json`. If it does not exist, tell the user to run `/add-chain` first — do not invent a chain record.

2. **Ask for the source before asking for figures.** Specifically:
   - The URL of the company's published nutrition or ingredient page
   - Which market it covers (GB, US, ...)
   - The date they are looking at it (defaults to today, as `retrievedOn`)

   If they give you a URL, you may fetch that page — one page, respecting `robots.txt`, no crawling. If they paste the figures instead, that is equally good and needs no fetch.

3. **Transcribe, do not interpret.** Copy the published figures exactly. Do not convert units, round, or reconcile inconsistencies silently. If the source gives sodium and not salt, record sodium and leave salt `null` — the display layer converts, with the constant named on the page.

4. **Scaffold** the MenuItem per the schema in `packages/content/src/schemas/`, with one `MarketVariant`.

5. **Validate**: `npm run content:validate`.

6. **Report honestly** what is still missing: which fields are `null`, whether a second market exists (without one there is no diff view), and whether any nutrition sanity check warned.

## Never

- Write `ourTake` unless the user dictates it. Editorial voice is theirs, not yours.
- Copy a chain's full nutrition table. Selective, curated, attributed entries only — see `docs/LEGAL.md`.
- Reference an ingredient or additive slug that does not exist yet. Create the entry first or leave it out.
