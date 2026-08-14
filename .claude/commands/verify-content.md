---
description: Re-check every reference and source, flag stale verification dates, print a prioritised to-do list
---

# /verify-content

A maintenance pass. Produces a to-do list, not edits — do not change content without asking.

1. Run `npm run content:validate` and `npm run content:coverage`.
2. Report, in this order of urgency:
   - **Broken references** — a `*Ref` pointing at a file that does not exist. Build-breaking.
   - **Missing sources** — any fact-bearing object below its minimum. Build-breaking.
   - **Stale** — `verifiedOn` older than 365 days, oldest first. These are the ones most likely to be wrong now, because chains reformulate quietly.
   - **Sanity warnings** — saturates above fat, sugars above carbohydrate, sodium and salt disagreeing beyond 5%, energy inconsistent with macros beyond 20%. Each is either a transcription error or a genuinely odd product; say which you think it is and why.
   - **Thin coverage** — items with only one market variant, which means the diff view has nothing to show.
3. Suggest the three highest-value fixes and stop.

Do not re-fetch pages unless the user asks. Do not "refresh" a `verifiedOn` date without actually re-reading the source — that is falsifying a verification record.
