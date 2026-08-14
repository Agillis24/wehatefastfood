# BRAND.md — design plan

**Status:** proposal, awaiting approval. Nothing is implemented.
**Date:** 2026-08-14.

---

## 1. The line the design has to serve

> We are not telling you not to eat it. We are telling you what it is.

Every design decision below is testable against that sentence. If an element implies judgement of the reader rather than of the manufacturer, it is wrong and comes out.

---

## 2. Direction: **Evidence poster**

> **Revised 2026-08-14, after the brand assets arrived.** This section originally proposed "specimen dossier" — clinical white, laboratory register, comic halftone. The delivered mark contradicts it, and the mark is the fixed point, so the direction bends to the mark rather than the other way round. The reasoning for rejecting the other two directions is unchanged and kept below, because it still holds.

**What the delivered mark actually is:** flat vector, hard edges, zero texture, bold geometry, a saturated pink, a heart borrowed from pop and cancelled by a prohibition slash. That is not a laboratory. It is a **poster** — the visual language of signage, protest print and warning marks, where meaning is carried by shape and contrast rather than by texture and rule-work.

**What survives from the original direction, and must:** the evidentiary discipline. Monospace numerals, visible verification dates, specimen numbers, sources always on the page, the tone of something recorded rather than composed. That was never about looking like a lab — it was about looking like we did the work, and it survives the change of register intact.

So: **evidence poster.** Poster in its shapes and its confidence, evidence in its numbers and its receipts. The boldness lives in the mark, the pink and the geometry; everything numeric around it stays quiet, monospaced and disciplined.

### The geometry the assets hand us

The mark's slash sits at **−19°**, and the banner repeats that exact angle in its background bands. That is not decoration, it is a system: one angle, used everywhere, becomes the thing the eye recognises before it reads a word.

`--angle-strike: -19deg` becomes a design token. It cuts section dividers, the edges of the dark punctuation bands, and the corner treatment of the Specimen Card. Used consistently it does what a signature element is supposed to do — makes a page identifiable from across a room, or from a thumbnail.

One restraint, and it matters: **the strike is the brand's gesture, never a verdict on a food.** Striking through a chain's own marketing claim is fair game. Striking through a nutrition figure is not — that is the good/bad moralising §12 forbids, dressed up as geometry.

### Why not the other two

**"Menu board at 2 a.m." — rejected on two counts.** First, functional: it is a dark ground with amber and red as its chromatic identity, and our traffic-light system needs red, amber and green to mean something specific and *only* that. If the whole page is already amber-on-black, the one element that must be unmistakable becomes invisible. Second, legal and editorial: backlit signage chromatics are the visual language of the chains themselves. §12 forbids brand colour identities and trade dress. Building the entire site out of a stylised version of their signage is the same mistake at a larger scale, and it makes us look like fans rather than auditors.

**"Regulatory notice" — rejected on credibility.** The device is strong and I nearly took it. The problem is specific: our pages will be screenshotted and shared out of context, and a site that dresses its own claims in the typography of an official government warning will be read as an official government warning. For a project whose single asset is being trusted, deliberately borrowing regulatory authority we do not have is the one aesthetic risk we cannot take. It would also make the "where regulators disagree, we show both" feature incoherent — you cannot referee two regulators while cosplaying as a third.

**Why the evidence half survives both rejections.** Whatever the register, the direction has to be *about our method rather than about their product*. It says: we looked at this, we recorded it, here is the file, here is the date, here is where it came from. That is exactly the promise in `/methodology`, rendered as a visual system — and it is what keeps the poster register from sliding into the rage-blog it would otherwise resemble. Three practical virtues carry over unchanged: a light ground is the readable choice for dense numerics on a cheap phone in daylight; flat hard-edged artwork renders identically at any scale and inside satori; and the card is a physical object, so it crops to 16:9 for video and 4:5 for Instagram without redesign.

### One deliberate borrowing

I keep exactly one device from "regulatory notice": **the overprinted stamp**, used only for the wordmark's HATE and for status marks such as `VERIFIED`, `PARTIAL`, `NOT PUBLISHED`. Slightly rotated, slightly ink-heavy, never on prose. Contained to one role it reads as our editorial hand rather than as a forgery.

---

## 3. Signature element: **the Specimen Card**

One component. Five destinations. This is the thing the site is remembered for and the reason the cross-channel contract in §11 of the brief is cheap rather than expensive.

A Specimen Card is a bordered card carrying, in fixed order:

```
┌──────────────────────────────────────────────┐
│ SPECIMEN  MCD-GB-0114        VERIFIED 14 AUG │  ← Plex Mono, meta rail
├──────────────────────────────────────────────┤
│                                              │
│           [ flat vector illustration ]       │  ← our artwork, never a photo
│                                              │
├──────────────────────────────────────────────┤
│  BIG MAC                                     │  ← Archivo, condensed, ink
│  McDonald's · United Kingdom · 219 g         │
├──────────────────────────────────────────────┤
│  CONTENTS OF THIS SAMPLE                     │
│                                              │
│  sugar      ▪▪▪▪▪▪▪▪▪            9 g  ≈ 2¼   │  ← the quantity stack
│  salt       ◗◗                 2.3 g  ≈ ⅜    │
│  saturates  ▬▬▬                 9 g  ≈ 1¾    │
├────────────────────────────────────────────╱─┤  ← −19° cut, the brand angle
│  FAT  MED   SAT  HIGH   SUG  LOW   SALT MED  │  ← traffic lights, text + colour
└──────────────────────────────────────────────┘
```

**Two surfaces, one component.** On paper for the website; on ink for video frames and the Instagram crops that need to punch. The fills and text colours of the traffic lights are identical across both — only the chip hairline flips (§4). Nothing else about the card changes, which is the whole point of it existing.

**The interior — the quantity stack — is the actual hook.** Sugar drawn as stacked cubes at 4 g each, salt as levelled teaspoons at 6 g each, saturated fat as pats of butter at 5 g each, all three flat-vector in the mark's language and at *true relative scale to each other*, so the eye compares them without being told to. Partial units are drawn partial: 9 g of sugar is two cubes and a quarter cube, not "2.25 cubes" rounded to a lie. Every stack carries a plain sentence in the DOM immediately after it, which is what a screen reader gets and what the "Just the numbers" mode leaves behind:

> This portion contains 9 g of sugar, about two and a quarter 4 g cubes.

No exercise equivalents, ever. The unit is always a physical quantity of the substance itself, never a quantity of the reader's time, effort or body.

**Where the card goes:** hero of the item page; the unit in `/compare`; the OG image; the 1080×1080 and 1080×1350 Instagram crops; the opening frame of a video. One React component, one token file, five channels that cannot drift apart.

---

## 4. Colour

**Extracted from the delivered brand assets, 2026-08-14** (`brand/*.svg`), not proposed. Every ratio below is the real output of `node scripts/contrast.mjs`. Nothing here is estimated.

### The palette, as it exists in the assets

| Token | Hex | Where it appears in the assets |
|---|---|---|
| `--c-pink` | `#FF2D62` | Avatar ground, `HATE`, the slash stroke, the banner's diagonal bands |
| `--c-paper` | `#F6F2E8` | The heart fill, the light ground, type on the dark ground |
| `--c-ink` | `#16120F` | The dark ground, type on the light ground, the patty band, the slash |
| `--c-grey-dark` | `#8C8377` | Struck-out `LOVE` on the ink ground |
| `--c-grey-light` | `#B9B2A4` | Struck-out `LOVE` on paper; the tagline on ink |
| `--c-white` | `#FFFFFF` | Mono avatar **only** — single-colour reproduction, never in the UI |

### Two surfaces, and they are not equivalent

The assets ship a light identity *and* a dark one. That is not redundancy, it is the channel split:

- **Paper `#F6F2E8` — the website.** Reading, data, long sessions, daylight, cheap screens.
- **Ink `#16120F` — video, YouTube, and deliberate punctuation.** The banner, the video frames, and on the site a small number of full-bleed bands (home hero, footer) that tie the channels together.

The site does **not** get a user-facing dark mode. Dark is a surface we choose per context, not a preference we maintain twice.

**Measured on paper `#F6F2E8`:**

| Foreground | Ratio | Verdict |
|---|---|---|
| `--c-ink` | **16.66 : 1** | AA body ✓ |
| `--c-pink` | 3.24 : 1 | Large text and non-text only |
| `--c-grey-dark` | 3.34 : 1 | Large text and non-text only |
| `--c-grey-light` | **1.88 : 1** | Decorative only — never text |

**Measured on ink `#16120F`:**

| Foreground | Ratio | Verdict |
|---|---|---|
| `--c-paper` | **16.66 : 1** | AA body ✓ |
| `--c-grey-light` | **8.84 : 1** | AA body ✓ |
| `--c-pink` | **5.15 : 1** | AA body ✓ |
| `--c-grey-dark` | **4.99 : 1** | AA body ✓ |

### The single most useful fact in this palette

**On ink, pink can talk. On paper, pink can only point.**

Pink is 5.15 : 1 on the dark ground — full body text, legally and legibly. It is 3.24 : 1 on paper, which fails AA for body text. The same colour is a voice on one surface and a pointer on the other, and every layout decision follows from that.

Consequences on paper:

| Use | Allowed | Why |
|---|---|---|
| Highlighted word inside body text | **Pink marker block, ink text** | Ink on pink is 5.15 : 1. Also the better gesture — a highlighter stroke, not coloured text. |
| Display type, ≥ 24 px or ≥ 18.66 px bold | **Pink letterforms** | 3.24 : 1 clears the large-text bar. Wordmark, section numbers, pull quotes. |
| Link inside running prose | **Ink text, pink underline** | Pink carries the signal as a rule; ink carries the reading. |
| Paper text on a pink fill | **Never** | 3.24 : 1. Pink fills take ink, never paper. |
| Rules, icons, focus rings, chart marks | **Pink** | Non-text, 3 : 1 bar met. |

Consequences on ink: pink is unrestricted, including body copy — which is exactly why the video and YouTube surfaces are dark.

### Derived UI greys

The two brand greys are authored for specific jobs in the mark and do not cover the UI:

- `--c-grey-light` at **1.88 : 1** on paper is invisible as text. Its only legitimate use on paper is the struck-out `LOVE`, where it is *meant* to recede and the strike carries the meaning. It is never a UI colour on the light surface.
- `--c-grey-dark` at **3.34 : 1** on paper fails body text.

So the light surface needs one derived member of the same warm-grey family:

| Token | Hex | Role | Measured on paper |
|---|---|---|---|
| `--c-muted` | `#5C5648` | Secondary text, meta rails, hairlines | **6.52 : 1** ✓ |

On the ink surface, `--c-grey-light` already fills that role at 8.84 : 1 and no derivation is needed.

Focus ring: 2 px `--c-pink`, 2 px offset, on everything, never removed. It clears the 3 : 1 non-text bar on both surfaces.

### Reserved functional — traffic lights

The pink creates a collision the original palette did not have: `#FF2D62` and an FSA red are both hot reds, and a reader must never wonder whether a pink thing is a `HIGH` warning. Measured separation between the brand pink and candidate reds: `#B3261E` → 1.81 : 1 (too close), `#8C1D18` → 2.52 : 1, `#7A1410` → **3.00 : 1**. So the FSA red goes deep oxblood, far enough down in value that pink and red never read as the same ink.

| Token | Hex | Text on it | Measured |
|---|---|---|---|
| `--c-tl-high` | `#7A1410` | `--c-paper` | **9.71 : 1** |
| `--c-tl-med` | `#D98C00` | `--c-ink` | **6.83 : 1** |
| `--c-tl-low` | `#1B5E34` | `--c-paper` | **6.96 : 1** |

Four rules, to be enforced as constants in code rather than left to discipline:

1. **Amber never carries paper text** — it takes ink text. Red and green take paper text. The asymmetry is the accessible answer, not an oversight.
2. **Amber is never a text colour on paper** — `#D98C00` as type on beige is 2.44 : 1. Amber-flavoured prose uses `--c-ink`.
3. **Every chip carries a 1.5 px hairline, and the hairline flips with the surface.** On paper the hairline is `--c-ink`, because amber against paper is only 2.44 : 1 — below the 3 : 1 non-text bar, so the boundary must never depend on fill contrast alone. On ink the hairline is `--c-paper`, because the oxblood is 1.72 : 1 against the dark ground and would otherwise dissolve into it. The fills and their text colours stay identical across both surfaces; only the hairline changes. That is what lets one component serve the website and the video frames.
4. **Pink never appears inside the traffic-light module, and the traffic-light reds never appear outside it.** The semaphore is a bounded, ruled box. Contained, the two reds cannot be confused; scattered, they always will be. This rule matters more on ink, where pink is unrestricted everywhere else on the surface.

And the non-negotiable from §2 of the brief: every traffic light carries its `HIGH` / `MED` / `LOW` label as text, always, at every size, including inside the OG image where nobody can hover.

---

## 5. Typography

Three roles, three families, all open-licensed and self-hosted — self-hosting is a privacy requirement, not just a performance one, since a runtime font request is a third-party request.

| Role | Family | Why this one |
|---|---|---|
| **Display** | **Archivo** (variable, `wdth` 62–125, `wght` 400–900) | The width axis *is* the brand device. The wordmark sits at `wdth 62 / wght 900` for stamped, ultra-condensed impact; headings relax to 75–100. One variable file covers the whole display range, so we get a wide expressive range for roughly 35 kB. Grotesque, industrial, no nostalgia. |
| **Body** | **Public Sans** (variable) | It is the typeface of the US Web Design System — literally the type of official public documentation. On a site about disclosure, prose that quietly wears the clothes of a public notice is the right register, and unlike the "regulatory notice" direction it does this at a whisper rather than a shout. Excellent at 16–17 px on a cheap screen. |
| **Data** | **IBM Plex Mono** (400, 600) | Every numeral, E-number, date, specimen ID, threshold table and source citation. Real technical-document character, genuine tabular figures, and monospace is what makes the numbers look *recorded* rather than *composed*. This is a data site; the data face does the heavy lifting and the display face is used sparingly. |

**The delivered assets confirm the display choice.** They ask for `DejaVu Sans Condensed, Arial Black, Helvetica` — a heavy condensed grotesque, all caps, tight letterspacing. That is a placeholder stack rather than a licensed choice (see the bug in §6), but the intent is unambiguous, and Archivo at a narrow width axis with weight 900 hits it while being a real self-hosted webfont with `latin-ext` coverage. No change to the plan; the assets validate it.

**Non-Latin scripts.** We subset to `latin` + `latin-ext` (which covers `cs` and `pl` correctly). Tier-2 languages in Cyrillic, Greek, Arabic, CJK and Devanagari fall back to a documented system stack — we are not shipping 200 scripts. Arabic gets an explicit `font-family` override and is tested in the Playwright suite.

### Scale

Mobile-first, 360 px baseline. `clamp()` throughout so there are no breakpoint jumps.

```
wordmark   clamp(2.5rem, 12vw, 7rem)     Archivo   wdth 62  wght 900  ls -0.02em
h1         clamp(1.75rem, 6vw, 3rem)     Archivo   wdth 75  wght 800
h2         clamp(1.375rem, 4vw, 2rem)    Archivo   wdth 85  wght 700
body       1.0625rem / 1.6               Public Sans 400
lead       1.1875rem / 1.5               Public Sans 400
data-xl    clamp(2rem, 9vw, 3.5rem)      Plex Mono 600   tabular-nums
data       1rem / 1.4                    Plex Mono 400   tabular-nums
label      0.8125rem  uppercase  ls 0.08em   Plex Mono 600
```

Spacing scale, 4 px base: `4 8 12 16 24 32 48 64 96`. Nothing off-scale.

---

## 6. The mark and the wordmark

**Delivered by the client, 2026-08-14.** Files live in `brand/` at the repo root, outside the web app, because the video and social pipelines consume them too.

### The mark

A heart in `--c-paper`, crossed by a black patty band with two thin pink gaps above and below it, struck through by a diagonal bar at −19° in ink with a pink stroke.

It carries the whole thesis in one shape. The heart is `LOVE`. The bands turn the heart into a burger cross-section. The diagonal is the strike, the same gesture as the wordmark's crossed-out `LOVE`, borrowed from prohibition signage. It resolves as *the thing we are supposed to love, sectioned and cancelled* — which is the site in one glance, and it does it without a single letterform, so it needs no translation in any locale.

Geometry is pure paths and rects, no text, so it renders identically on every machine and inside satori. All internal edges clear the 3 : 1 non-text bar: heart on pink ground 3.24 : 1, patty on heart 16.66 : 1, slash on pink 5.15 : 1.

### Asset inventory

| File | Surface | Use |
|---|---|---|
| `wff-avatar-primary.svg` | pink ground | Primary avatar. Social profiles, the default mark. |
| `wff-avatar-dark.svg` | ink ground | Dark-surface avatar. Pink patty on the paper heart. |
| `wff-avatar-mono.svg` | transparent | Single-colour reproduction. Stamps, watermarks, print, embroidery. |
| `wff-favicon.svg` | pink ground | Favicon. Drops the patty bands and keeps heart plus slash. |
| `wff-wordmark-light.svg` | paper | Wordmark for the website. |
| `wff-wordmark-dark.svg` | ink | Wordmark for video and dark bands. |
| `wff-youtube-banner.svg` | ink | 2560 × 1440 channel banner, mark plus wordmark plus tagline. |

The favicon simplification is the right call and should be preserved: at 16 px the patty bands turn to mush, while the heart silhouette and the diagonal survive. That is the small-size degradation — heart plus slash, nothing else. There is no need for a lettered fallback.

**Tagline, as delivered:** *"What's actually in it — and why they put it there."* This is now the site's tagline of record and should be used verbatim, including on `/about` and in the OG description. It is a do-not-translate-loosely string: it goes in `content/glossary.json` as translate-consistently, not as free text.

### Wordmark construction, and a bug in it

Four text lines: `WE` small and letterspaced, `LOVE` in the recessive grey with a horizontal ink strike rect across it, `HATE` in `--c-pink` rotated −7° and overlapping `LOVE`, then `FAST FOOD`. The wordmark is always display-size, which is exactly the case where pink letterforms are permitted (§4).

**Measured problem.** The delivered wordmarks use live `<text>` with `font-family="DejaVu Sans Condensed, Arial Black, Helvetica, sans-serif"`. DejaVu Sans Condensed is a Linux font. On Windows and macOS the stack falls through to a non-condensed face, every glyph gets wider, and the hand-positioned strike rect no longer matches the word it is striking. Rendered and measured in-browser on Windows:

| Element | Renders | Strike rect |
|---|---|---|
| `LOVE` | x 76 → **554** | x 60 → **512** |

The strike stops 42 px short, so the `E` of `LOVE` is left unstruck — the one thing in the mark that must not fail. `FAST FOOD` renders to x 1092 inside a 1200 viewBox, leaving 108 px of margin, so a slightly wider fallback also clips the wordmark.

**Fix, in Phase 1:**

1. Rebuild the wordmark in the real display face (Archivo, narrow width axis, weight 900 — it matches the delivered proportions and is a proper self-hosted webfont).
2. Ship the static assets in `brand/` with **text converted to outlines**, so they are font-independent everywhere, including satori, OG images and any video tool.
3. In the app, render the wordmark as a React component with the strike drawn from the measured text box rather than a fixed width, so it stays correct at any size and in any locale.
4. Generate `clipPath` ids with React's `useId`. The delivered files already avoid collisions by hand (`hp`, `hd`, `hm`, `hf`, `hb`), but inlining several marks into one DOM will break that the moment anyone copies a file.

### Motion

Skipped entirely under `prefers-reduced-motion`, where the resolved state renders immediately. The strike rule draws left to right over 260 ms, then `HATE` stamps in — scale 1.06 → 1.00, opacity 0 → 1, 140 ms, ease-out, no bounce. Under 450 ms total. It resolves once per session, not on every navigation.

---

## 7. Illustration system

**Revised to follow the mark.** The brief (§8) asked for a comic/halftone treatment. The delivered mark has no texture at all — flat vector, hard edges, four colours, nothing else. Two incompatible languages on one page would look like two projects, so the illustration follows the mark.

- **Flat geometric vector.** Hard edges, flat fills, no outline-and-shade, no halftone, no gradients, no soft shadows, no 3D. Form is carried by silhouette and by the four palette colours.
- **Palette-locked.** Illustrations use `--c-ink`, `--c-paper`, `--c-pink` and nothing else on the light surface, mirrored on the dark. A drawing that needs a fifth colour is a drawing that is too complicated.
- **Everything is our own artwork.** Never a photograph, never packaging, never a mascot, never a logo shape. A §12 requirement, and also the thing that makes the video channel possible for free.
- **Objects, not people.** Food, cubes, teaspoons, butter pats, molecules, factory equipment. We never draw bodies. That is the design-level enforcement of the no-body-shaming rule.
- **Fixed cast of measure objects** — the 4 g sugar cube, the 6 g salt teaspoon, the 5 g butter pat — drawn once, reused everywhere, at consistent relative scale, so the reader learns the vocabulary across items and any comparison between two items is honest.

*Open for the client: if you want the comic feel the brief originally described, the cheapest honest way back is a single halftone texture used on illustration only and never on the mark or the UI. It should be a deliberate decision, not a drift. My recommendation is to stay flat — it matches your mark, it costs fewer bytes, and it survives being rendered at 48 px and at 1920 px without retouching.*

---

## 8. Layout

Single column on mobile with 16 px gutters. Desktop is a 12-column grid, 1200 px max, and the item page runs 8 columns of content beside a 4-column sticky rail holding market, verification date and sources — because "sources are never collapsed by default on desktop" is much easier to honour if they have a permanent home.

### Item page, mobile 360

```
┌────────────────────────────┐
│ WE ~LOVE~ HATE FAST FOOD ≡ │
├────────────────────────────┤
│ McDonald's › Big Mac       │
│ ┌────────────────────────┐ │
│ │ SPECIMEN MCD-GB-0114   │ │
│ │  [ comic illustration ]│ │
│ │  BIG MAC               │ │
│ │  GB · 219 g            │ │  ← the Specimen Card,
│ │  ─────────────────────  │ │    full-bleed to gutters
│ │  sugar  ▪▪▪▪   9 g     │ │
│ │  salt   ◗◗   2.3 g     │ │
│ │  sat    ▬▬▬    9 g     │ │
│ │  FAT MED  SAT HIGH …   │ │
│ └────────────────────────┘ │
│ [ GB ▾ ]   [ just numbers ]│  ← market + plain-data toggle
│ verified 14 Aug 2026       │
├────────────────────────────┤
│ TRAFFIC LIGHTS             │
│  per 100 g   per portion   │
│  thresholds shown inline   │
├────────────────────────────┤
│ REFERENCE INTAKE           │
│  ◔ 24%  ◑ 38%  ◕ 41%       │
├────────────────────────────┤
│ WHAT'S ACTUALLY IN IT      │
│  five ingredients are here │
│  to make it survive a      │
│  freezer                   │
│  [chip][chip][E471▪][chip] │  ← additives marked, tap → drawer
├────────────────────────────┤
│ SAME PRODUCT, GB vs US     │
│  only in US → [ ][ ][ ]    │
│  only in GB → [ ]          │
├────────────────────────────┤
│ ▌OUR TAKE                  │  ← stamp-ruled left edge, offset
│ ▌…                         │     card, unmistakably editorial
├────────────────────────────┤
│ SOURCES                    │
│  1. McDonald's UK …  ↗     │
├────────────────────────────┤
│ not medical advice ·       │
│ not affiliated · figures   │
│ change — check current     │
└────────────────────────────┘
```

### Item page, desktop 1280

```
┌──────────────────────────────────────────────────────────────────┐
│  WE ~LOVE~ HATE FAST FOOD          chains  decoder  compare  EN  │
├──────────────────────────────────────────────────────────────────┤
│  McDonald's › Big Mac                                            │
│  ┌──────────────────────────────────┐  ┌──────────────────────┐  │
│  │                                  │  │ MARKET     [ GB  ▾ ] │  │
│  │        SPECIMEN CARD             │  │ VERIFIED 14 Aug 2026 │  │
│  │        (8 cols)                  │  │ BASIS   per portion  │  │
│  │                                  │  │ ──────────────────── │  │
│  └──────────────────────────────────┘  │ SOURCES              │  │
│  ┌──────────────────────────────────┐  │  1. McDonald's UK ↗  │  │
│  │  TRAFFIC LIGHTS  + thresholds    │  │     retrieved 14 Aug │  │
│  └──────────────────────────────────┘  │  2. EFSA …        ↗  │  │
│  ┌──────────────────────────────────┐  │ ──────────────────── │  │
│  │  REFERENCE INTAKE                │  │ [ just the numbers ] │  │
│  └──────────────────────────────────┘  │        (sticky)      │  │
│  ┌──────────────────────────────────┐  └──────────────────────┘  │
│  │  WHAT'S ACTUALLY IN IT           │                            │
│  └──────────────────────────────────┘                            │
│  ┌──────────────────────────────────┐                            │
│  │  GB  │  US     side-by-side diff │                            │
│  └──────────────────────────────────┘                            │
│  ▌ OUR TAKE                                                      │
└──────────────────────────────────────────────────────────────────┘
```

**Where the boldness is spent:** the wordmark and the Specimen Card. Everything else — rules, tables, chips, rails — is quiet, monospaced and disciplined. One loud object per screen.

---

## 9. Motion

CSS only. Three permitted movements, all under 450 ms, all removed under `prefers-reduced-motion` with the end state rendered immediately:

1. Wordmark resolve, once per session.
2. Quantity stacks build upward on scroll into view, 40 ms stagger per unit. Under reduced motion they are simply drawn.
3. Ingredient drawer slides from the block-end edge, 180 ms.

Nothing else moves. No parallax, no counters ticking up (a number that animates from 0 is a number that is briefly wrong), no scroll-jacking.

---

## 10. Accessibility, baked in rather than audited on

- Colour is never the only carrier: every traffic light has its text label, every diff row has a `+` / `−` glyph as well as a colour, every quantity stack has its sentence.
- Focus ring is a 2 px `--c-pink` outline with a 2 px offset, on everything, never removed. At 3.24 : 1 against the paper it clears the non-text bar.
- Pink is never the only carrier of emphasis: an emphasised phrase is a pink block *and* the sentence still reads correctly if the colour is stripped.
- "Just the numbers" is a first-class mode, persisted, that hides all illustrative visualisations and leaves the tables and sentences. It is in the sticky rail on desktop and directly under the card on mobile, not buried in a settings page.
- CSS logical properties everywhere so RTL is a `dir` attribute, not a rebuild.
- Target size 24 × 24 px minimum (WCAG 2.2), and 44 px for the ingredient chips, which are the most-tapped things on the site.
- Every SVG visualisation is `aria-hidden` with the sentence beside it as the accessible text — a screen reader should get the *fact*, not a description of the drawing.

---

## 11. The same system in the other two channels

- **YouTube.** Channel art is `brand/wff-youtube-banner.svg`; the avatar is `brand/wff-avatar-primary.svg`. Video frames use the **ink surface**, where pink is unrestricted (§4). The Specimen Card is the opening frame at 1920 × 1080, the quantity stack builds in the same order with the same objects, and `tokens.export.json` supplies the exact hexes and `--angle-strike` so the video is not a near-match but the same system.
- **Instagram.** Profile picture is `brand/wff-avatar-primary.svg`. The card crops to 1080 × 1080 (card only) and 1080 × 1350 (card plus one stamped headline). `npm run social:cards` emits both from the same component that renders the page, choosing the paper or ink surface per post.
- **Everywhere.** The tagline of record is *"What's actually in it — and why they put it there."* — verbatim, and in `content/glossary.json` as a translate-consistently term.
- **Never** a chain logo, a photograph of packaging, or their colours, in any channel.

---

## 12. What we will never do

Recorded so a future session does not drift back into it: exercise equivalents; before/after bodies; scales, waistlines or BMI; the words "guilt", "cheat", "clean" or "toxic" as a category; a single letter or number grade that ranks a food good or bad; the FSA oxblood used for anything that is not a measured `HIGH`; brand pink used inside the traffic-light module, or pink letterforms at body size; a stock photograph; a competitor's brand colour used to identify them; a claim without a source.
