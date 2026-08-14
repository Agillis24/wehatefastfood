# BRAND.md — design plan

**Status:** proposal, awaiting approval. Nothing is implemented.
**Date:** 2026-08-14.

---

## 1. The line the design has to serve

> We are not telling you not to eat it. We are telling you what it is.

Every design decision below is testable against that sentence. If an element implies judgement of the reader rather than of the manufacturer, it is wrong and comes out.

---

## 2. Direction: **Specimen dossier**

The food is treated as a laboratory sample that has been logged, photographed, weighed and filed. Clinical card stock, hairline rules, monospace data, a stamped evidence mark, and comic-ink illustration as the only warm thing on the page.

### Why not the other two

**"Menu board at 2 a.m." — rejected on two counts.** First, functional: it is a dark ground with amber and red as its chromatic identity, and our traffic-light system needs red, amber and green to mean something specific and *only* that. If the whole page is already amber-on-black, the one element that must be unmistakable becomes invisible. Second, legal and editorial: backlit signage chromatics are the visual language of the chains themselves. §12 forbids brand colour identities and trade dress. Building the entire site out of a stylised version of their signage is the same mistake at a larger scale, and it makes us look like fans rather than auditors.

**"Regulatory notice" — rejected on credibility.** The device is strong and I nearly took it. The problem is specific: our pages will be screenshotted and shared out of context, and a site that dresses its own claims in the typography of an official government warning will be read as an official government warning. For a project whose single asset is being trusted, deliberately borrowing regulatory authority we do not have is the one aesthetic risk we cannot take. It would also make the "where regulators disagree, we show both" feature incoherent — you cannot referee two regulators while cosplaying as a third.

**Why "specimen dossier" wins.** It is the only one of the three that is *about our method rather than about their product*. It says: we looked at this, we recorded it, here is the file, here is the date, here is where it came from. That is exactly the promise in `/methodology`, rendered as a visual system. It also has three practical virtues: a light ground is the readable choice for dense numerics on a cheap phone in daylight; comic-ink illustration sits on a lab card more naturally than on any other surface; and the card is a physical object, so it crops to 16:9 for video and 4:5 for Instagram without redesign.

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
│              [ comic-ink illustration ]      │  ← our drawing, never a photo
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
├──────────────────────────────────────────────┤
│  FAT  MED   SAT  HIGH   SUG  LOW   SALT MED  │  ← traffic lights, text + colour
└──────────────────────────────────────────────┘
```

**The interior — the quantity stack — is the actual hook.** Sugar drawn as stacked cubes at 4 g each, salt as levelled teaspoons at 6 g each, saturated fat as pats of butter at 5 g each, all three drawn in the same comic ink at *true relative scale to each other*, so the eye compares them without being told to. Partial units are drawn partial: 9 g of sugar is two cubes and a quarter cube, not "2.25 cubes" rounded to a lie. Every stack carries a plain sentence in the DOM immediately after it, which is what a screen reader gets and what the "Just the numbers" mode leaves behind:

> This portion contains 9 g of sugar, about two and a quarter 4 g cubes.

No exercise equivalents, ever. The unit is always a physical quantity of the substance itself, never a quantity of the reader's time, effort or body.

**Where the card goes:** hero of the item page; the unit in `/compare`; the OG image; the 1080×1080 and 1080×1350 Instagram crops; the opening frame of a video. One React component, one token file, five channels that cannot drift apart.

---

## 4. Colour

Four brand tokens, one muted, plus a reserved functional set. The important constraint, and the one that shaped the palette: **red, amber and green are functional and reserved for the traffic lights.** The brand accent therefore has to live outside that band. That single rule is what keeps this from becoming another "near-black plus one acid accent" site.

### Brand

| Token | Hex | Role | Contrast |
|---|---|---|---|
| `--c-ink` | `#131512` | All type, all illustration line work. Near-black with a faint green cast — comic ink on paper is never pure black. | 17.9 : 1 on card, 11.1 : 1 on board |
| `--c-card` | `#FCFCFA` | Specimen card stock. The surface where data lives. | — |
| `--c-board` | `#C6CBC3` | Page ground. Cool grey-green, the colour of a laboratory bench mat. Keeps the whole thing clinical rather than cosy. | — |
| `--c-stamp` | `#2E24C4` | The one accent. Aniline stamp-pad blue-violet. Links, the HATE overprint, status marks, focus rings. | 9.4 : 1 on card |
| `--c-muted` | `#5C6157` | Secondary text, meta rails, rules. | 6.2 : 1 on card |

Card on board is only 1.6 : 1, which is deliberate — cards are separated by a 1.5 px `--c-ink` hairline, not by fill contrast, so the boundary passes the 3 : 1 non-text requirement and the page reads as filed paper rather than as floating panels.

### Reserved functional — traffic lights

| Token | Hex | Text on it | Contrast |
|---|---|---|---|
| `--c-tl-high` | `#B3261E` | `--c-card` | 6.4 : 1 |
| `--c-tl-med` | `#F0A500` | `--c-ink` | 8.8 : 1 |
| `--c-tl-low` | `#1E6E3C` | `--c-card` | 6.1 : 1 |
| `--c-tl-med-text` | `#7A4E00` | on `--c-card` | 7.0 : 1 |

Two rules that fall straight out of those numbers, and that I want in the code as lint-enforced constants:

1. **Amber never carries white text** — white on `#F0A500` is 2.0 : 1 and fails badly. Amber chips take ink text. Red and green chips take card-white text. This asymmetry is not a mistake, it is the accessible answer.
2. **Amber is never used as text colour on the card** — `#F0A500` as type on `#FCFCFA` is 2.0 : 1. When we need amber-flavoured prose, we use `--c-tl-med-text`.

And the non-negotiable from §2 of the brief: every traffic light carries its `HIGH` / `MED` / `LOW` label as text, always, at every size, including inside the OG image where nobody can hover.

---

## 5. Typography

Three roles, three families, all open-licensed and self-hosted — self-hosting is a privacy requirement, not just a performance one, since a runtime font request is a third-party request.

| Role | Family | Why this one |
|---|---|---|
| **Display** | **Archivo** (variable, `wdth` 62–125, `wght` 400–900) | The width axis *is* the brand device. The wordmark sits at `wdth 62 / wght 900` for stamped, ultra-condensed impact; headings relax to 75–100. One variable file covers the whole display range, so we get a wide expressive range for roughly 35 kB. Grotesque, industrial, no nostalgia. |
| **Body** | **Public Sans** (variable) | It is the typeface of the US Web Design System — literally the type of official public documentation. On a site about disclosure, prose that quietly wears the clothes of a public notice is the right register, and unlike the "regulatory notice" direction it does this at a whisper rather than a shout. Excellent at 16–17 px on a cheap screen. |
| **Data** | **IBM Plex Mono** (400, 600) | Every numeral, E-number, date, specimen ID, threshold table and source citation. Real technical-document character, genuine tabular figures, and monospace is what makes the numbers look *recorded* rather than *composed*. This is a data site; the data face does the heavy lifting and the display face is used sparingly. |

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

## 6. The wordmark

Inline SVG, drawn from live text nodes so it can be recoloured, animated and rescaled, per §1 of the brief.

```
     WE  ██LOVE██  HATE  FAST FOOD
            ↑ strike     ↑ stamp
```

Construction: `WE`, `LOVE`, `HATE`, `FAST FOOD` as four `<text>` elements in Archivo at `wdth 62 / wght 900`. `LOVE` in `--c-muted` with a 3 px `--c-ink` strike rule drawn as a `<rect>`. `HATE` in `--c-stamp`, rotated −2.5°, overlapping `LOVE` by about 15 % of its width, with a subtle ink-density texture so it reads as pressed rather than typeset.

**On load** (skipped entirely under `prefers-reduced-motion`, where the resolved state renders immediately): the strike rule draws left to right over 260 ms, then `HATE` stamps in — scale 1.06 → 1.00, opacity 0 → 1, 140 ms, one bounce-free ease-out. Total under 450 ms. It resolves once per session, not on every navigation.

At small sizes and in the favicon, the mark degrades to `W~H` — the strike surviving as the tilde.

---

## 7. Illustration system

- **Comic ink.** Confident single-weight `--c-ink` outline, flat fills, one halftone dot screen at 12 % ink for shading. No gradients, no soft shadows, no 3D.
- **Everything is our own drawing.** Never a photograph, never packaging, never a mascot, never a logo shape. This is a §12 requirement, and it is also the thing that makes the video channel possible for free.
- **Objects, not people.** We draw food, cubes, teaspoons, butter pats, molecules and factory equipment. We do not draw bodies. That is the design-level enforcement of the no-body-shaming rule.
- **Fixed cast of measure objects** — the 4 g sugar cube, the 6 g salt teaspoon, the 5 g butter pat — drawn once, reused everywhere, at consistent relative scale, so the reader learns the vocabulary across items and the comparison between two items is honest.

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
- Focus ring is a 2 px `--c-stamp` outline with a 2 px offset, on everything, never removed.
- "Just the numbers" is a first-class mode, persisted, that hides all illustrative visualisations and leaves the tables and sentences. It is in the sticky rail on desktop and directly under the card on mobile, not buried in a settings page.
- CSS logical properties everywhere so RTL is a `dir` attribute, not a rebuild.
- Target size 24 × 24 px minimum (WCAG 2.2), and 44 px for the ingredient chips, which are the most-tapped things on the site.
- Every SVG visualisation is `aria-hidden` with the sentence beside it as the accessible text — a screen reader should get the *fact*, not a description of the drawing.

---

## 11. The same system in the other two channels

- **YouTube.** The Specimen Card is the opening frame at 1920 × 1080; the quantity stack builds in the same order with the same objects; `tokens.export.json` supplies the exact hexes so the video is not a near-match.
- **Instagram.** The card crops to 1080 × 1080 (card only) and 1080 × 1350 (card plus one stamped headline). `npm run social:cards` emits both from the same component that renders the page.
- **Never** a chain logo, a photograph of packaging, or their colours, in any channel.

---

## 12. What we will never do

Recorded so a future session does not drift back into it: exercise equivalents; before/after bodies; scales, waistlines or BMI; the words "guilt", "cheat", "clean" or "toxic" as a category; a single letter or number grade that ranks a food good or bad; red used for anything that is not a measured FSA `HIGH`; a stock photograph; a competitor's brand colour used to identify them; a claim without a source.
