---
description: Scaffold a decoder entry for an additive, enforcing the two-independent-sources rule
---

# /add-additive <e-number or name>

Create `content/additives/<slug>.json`, e.g. `e621-monosodium-glutamate`.

## Two sources, from two different publishers. Enforced.

The validator fails the build below two. Do not work around it by citing the same regulator twice or by citing a source you have not read. Prefer: a regulator (EFSA, FDA, FSA) plus a peer-reviewed review or a database entry.

## The fields that matter most

- **`whyItIsInYourFood`** — the commercial reason. This is the interesting part and the reason the site exists. Not "it is an emulsifier" but what problem it solves for the manufacturer: shelf life, freeze-thaw survival, mouthfeel at a lower fat cost, colour that survives a warming cabinet.
- **`evidenceStrength`** — one of `well-established` / `mixed` / `emerging` / `contested`. Be honest and be conservative. Overstating a hazard is how this project loses its credibility permanently, and it is a worse failure than understating one, because it is the failure our critics expect.
- **`notableDivergence`** — where regulators disagree, say so, say who, and say why. Never imply that "banned in the EU" means "dangerous"; approval regimes differ in ways that are often procedural.
- **`regulatoryStatus`** — current EU, US and UK status, each with its own source. If you cannot find one jurisdiction's status, record that you could not, rather than assuming it matches another's.

## Tone

Plain language, roughly 60 words for `whatItIs`, no jargon, no scare quotes, no "chemical-sounding therefore bad". Half the additives in the decoder are boring and the entry should say so when they are — that is what makes the alarming ones credible.
