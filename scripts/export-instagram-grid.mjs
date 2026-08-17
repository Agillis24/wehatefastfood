/**
 * The pinned-post triptych for the Instagram profile.
 *
 *   node scripts/export-instagram-grid.mjs
 *
 * Three tiles that read as one banner when they sit side by side in the top row
 * of the profile grid, which is exactly where Instagram's three pinned posts go.
 *
 * TWO THINGS DECIDE THE GEOMETRY, and both are easy to get wrong:
 *
 * 1. THE GRID IS 4:5, NOT SQUARE. Instagram moved profile thumbnails from 1:1
 *    to 4:5 portrait. A square triptych posted into a 4:5 grid gets cropped at
 *    the sides and the join between the panels stops lining up. Tiles are
 *    therefore 1080x1350.
 *
 * 2. IT MIGHT NOT STAY 4:5. The grid aspect has already changed twice. So every
 *    load-bearing element is kept inside the CENTRAL SQUARE of each tile - the
 *    1080x1080 region from y=135 to y=1215 - which means the artwork survives a
 *    centre-crop back to 1:1 without losing a letter. SAFE_TOP and SAFE_BOTTOM
 *    below are that promise; keep type between them.
 *
 * AND EVERY TILE HAS TO WORK ALONE. The triptych is what a visitor to the
 * profile sees, but a follower sees each post by itself in the feed, and a tile
 * reading only "FOOD" is a broken post. Each one therefore carries its own
 * footer line - handle, tagline, address - so it stands up on its own.
 *
 * No font is trusted. Every text element carries textLength with
 * lengthAdjust="spacingAndGlyphs", so the glyphs are stretched to a width this
 * file decides rather than one the renderer's font happens to produce, and the
 * strike through LOVE is derived from the same constant as the word it strikes.
 * This repo has already shipped that bug once, in the delivered wordmark, where
 * LOVE rendered 42px wider than the bar meant to cross it on any machine
 * without DejaVu Sans Condensed installed.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'packages', 'design-tokens', 'brand', 'instagram');

const TILE_W = 1080;
const TILE_H = 1350;
const PANELS = 3;
const FULL_W = TILE_W * PANELS;

/** The centre-crop-safe band. Nothing that matters goes outside it. */
const SAFE_TOP = (TILE_H - TILE_W) / 2;
const SAFE_BOTTOM = TILE_H - SAFE_TOP;

const INK = '#16120F';
const PAPER = '#F6F2E8';
const PINK = '#FF2D62';
const GREY = '#8C8377';
const MUTED = '#B9B2A4';

const STACK = 'Arial Black, Impact, DejaVu Sans Condensed, Helvetica, sans-serif';

/** The shared baseline the three big words sit on. */
const BASE = 745;
const BIG = 224;
/** Cap height as a fraction of font-size, near enough for a heavy grotesque. */
const CAP = 0.72;

const word = (x, y, text, { size, fill, width, weight = 'bold', spacing = 2, anchor = 'start' }) =>
  `<text x="${x}" y="${y}" font-family="${STACK}" font-weight="${weight}" font-size="${size}" ` +
  `letter-spacing="${spacing}" fill="${fill}" textLength="${width}" ` +
  `lengthAdjust="spacingAndGlyphs" text-anchor="${anchor}">${text}</text>`;

/** Panel origins, so each panel's content is written in its own coordinates. */
const P = (i) => i * TILE_W;

/*
 * Panel 1 is the mark itself, and its geometry is the delivered logo's scaled
 * to fit one tile rather than a new arrangement.
 *
 * What matters is that HATE is written ACROSS the struck-out LOVE - offset to
 * the right and dropped a little, overlapping it - not stacked underneath it.
 * Stacked, the two words read as two words. Overlapping, they read as one
 * correction being made, which is the entire gesture the brand is built on.
 * The lockup wants to be about 1200px wide at these weights, so LOVE is set
 * narrower than FAST and FOOD to buy HATE the room to overhang it.
 */
const LOVE_X = 60;
const LOVE_SIZE = 208;
const LOVE_W = 560;
const STRIKE_H = 44;
// The middle of LOVE's cap height, which is where a strike belongs.
const STRIKE_Y = BASE - (LOVE_SIZE * CAP) / 2 - STRIKE_H / 2;

/*
 * HATE starts about three quarters of the way through LOVE, which is the offset
 * the delivered logo uses. Further left and HATE simply blots LOVE out, so the
 * reader never sees the word being corrected and the joke does not land; further
 * right and the two stop touching and read as two separate words.
 */
const HATE_X = LOVE_X + Math.round(LOVE_W * 0.72);
const HATE_W = 560;
const HATE_SIZE = 224;
// Dropped just far enough to clear LOVE's baseline without leaving it.
const HATE_BASE = BASE + 42;

const panel1 =
  word(P(0) + LOVE_X + 6, BASE - 247, 'WE', { size: 92, fill: PAPER, width: 184, spacing: 8 }) +
  word(P(0) + LOVE_X, BASE, 'LOVE', { size: LOVE_SIZE, fill: GREY, width: LOVE_W }) +
  // Derived from LOVE's own x and width, overhanging each end by 32px.
  `<rect x="${P(0) + LOVE_X - 32}" y="${STRIKE_Y}" width="${LOVE_W + 64}" height="${STRIKE_H}" fill="${PAPER}"/>` +
  `<g transform="rotate(-7 ${P(0) + HATE_X + HATE_W / 2} ${HATE_BASE - 60})">` +
  word(P(0) + HATE_X, HATE_BASE, 'HATE', { size: HATE_SIZE, fill: PINK, width: HATE_W }) +
  `</g>`;

// --- panels 2 and 3: the rest of the sentence -------------------------------
const panel2 = word(P(1) + 190, BASE, 'FAST', { size: BIG, fill: PAPER, width: 700 });
const panel3 = word(P(2) + 190, BASE, 'FOOD', { size: BIG, fill: PAPER, width: 700 });

// --- the footer line that lets each tile stand alone ------------------------
const FOOT_Y = 1150;
const foot = [
  { text: '@wehatefastfood', fill: MUTED, width: 420 },
  { text: "What's actually in it — and why they put it there.", fill: MUTED, width: 820 },
  { text: 'wehatefastfood.com', fill: PINK, width: 500 },
]
  .map((f, i) =>
    word(P(i) + TILE_W / 2, FOOT_Y, f.text, {
      size: 44,
      fill: f.fill,
      width: f.width,
      spacing: 1,
      anchor: 'middle',
    }),
  )
  .join('');

/**
 * A hairline across all three tiles, above the footer line.
 *
 * It does two jobs. Across the grid it is a second continuous element, so the
 * three tiles read as one image rather than three that happen to share a
 * palette. Within a single tile it turns the space between the wordmark and the
 * footer from a gap into a margin - the same space, but deliberate.
 */
const rule = `<rect x="0" y="1055" width="${FULL_W}" height="3" fill="${MUTED}" opacity="0.35"/>`;

/**
 * The angled bands run the full width of all three tiles, so the grid reads as
 * one image rather than three that happen to share a colour. This is the only
 * element that deliberately crosses a panel boundary.
 */
const bands =
  `<g opacity="0.13"><g transform="rotate(-19 ${FULL_W / 2} ${TILE_H / 2})">` +
  `<rect x="-600" y="120" width="${FULL_W + 1200}" height="150" fill="${PINK}"/>` +
  `<rect x="-600" y="1120" width="${FULL_W + 1200}" height="150" fill="${PINK}"/>` +
  `</g></g>`;

const CONTENT = bands + panel1 + panel2 + panel3 + rule + foot;

function svgFor(offsetX, width) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${TILE_H}" ` +
    `viewBox="0 0 ${width} ${TILE_H}">` +
    `<rect width="${width}" height="${TILE_H}" fill="${INK}"/>` +
    `<g transform="translate(${-offsetX},0)">${CONTENT}</g>` +
    `</svg>`
  );
}

async function render(svg, width, file) {
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: { loadSystemFonts: true },
  })
    .render()
    .asPng();
  await writeFile(path.join(OUT, file), png);
  return png.length;
}

await mkdir(OUT, { recursive: true });

// The three tiles, plus the whole banner so the join can be checked in one look.
const NAMES = ['wff-ig-1-left.png', 'wff-ig-2-centre.png', 'wff-ig-3-right.png'];

for (let i = 0; i < PANELS; i += 1) {
  const bytes = await render(svgFor(P(i), TILE_W), TILE_W, NAMES[i]);
  console.log(`${NAMES[i].padEnd(24)} ${TILE_W}x${TILE_H}  ${(bytes / 1024).toFixed(1)} kB`);
}

const previewBytes = await render(svgFor(0, FULL_W), FULL_W, 'wff-ig-preview.png');
console.log(
  `${'wff-ig-preview.png'.padEnd(24)} ${FULL_W}x${TILE_H}  ${(previewBytes / 1024).toFixed(1)} kB`,
);

console.log(`
Safe band is y ${SAFE_TOP}-${SAFE_BOTTOM}; everything that matters is inside it,
so the tiles survive the grid going back to square.

POST THE RIGHT-HAND TILE FIRST. Instagram fills the grid newest-first from the
top left, so posting left-to-right puts the banner on backwards:

  1. wff-ig-3-right.png
  2. wff-ig-2-centre.png
  3. wff-ig-1-left.png

Then pin all three. Check the row and swap by unpinning and re-pinning if the
order comes out reversed - pinning order is what decides it, not posting order.`);
