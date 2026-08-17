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
import { resvgFonts } from './lib/fonts.mjs';
import sharp from 'sharp';
import { TRIPTYCH_COPY, HASHTAGS } from './lib/instagram-copy.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'packages', 'design-tokens', 'brand', 'instagram');

/**
 * A second copy, served by the site.
 *
 * The Instagram Content Publishing API does not accept an upload: it is given a
 * URL and fetches the image itself, so "media must be hosted on a publicly
 * accessible server at the time of the attempt". A tile that exists only in the
 * repo cannot be posted by scripts/ig-publish.mjs.
 *
 * Committed rather than gitignored, unlike the per-item share cards. There are
 * three of them, they change when the brand changes rather than when a figure
 * does, and the publish script needs their URLs to be stable and predictable
 * rather than content-hashed.
 */
const WEB_OUT = path.join(ROOT, 'apps', 'web', 'public', 'social');

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

const STACK = 'Archivo, sans-serif';

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

/**
 * JPEG settings, and they are not the defaults for a reason.
 *
 * This is flat vector art: hard edges, saturated pink on near-black. JPEG's
 * default 4:2:0 chroma subsampling throws away three quarters of the colour
 * resolution, which on that particular pair produces visible fringing along
 * every letter edge - the one place a wordmark cannot afford it. 4:4:4 keeps
 * the colour at full resolution and costs a few kB on an image this flat.
 *
 * The JPEG exists only because Meta's content-publishing reference lists JPEG
 * as the image format. The PNG remains the real asset for everything else.
 */
async function toJpeg(png, file) {
  return sharp(png)
    .flatten({ background: INK })
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4', mozjpeg: true })
    .toFile(path.join(WEB_OUT, file.replace(/.png$/, '.jpg')));
}

async function render(svg, width, file) {
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: resvgFonts(),
  })
    .render()
    .asPng();

  await writeFile(path.join(OUT, file), png);
  await writeFile(path.join(WEB_OUT, file), png);

  // Only the three tiles are ever posted; the wide preview is for checking the
  // join and would just be dead weight in the export.
  const jpeg = file.includes('preview') ? null : await toJpeg(png, file);

  return { png: png.length, jpeg: jpeg?.size ?? null };
}

await mkdir(OUT, { recursive: true });
await mkdir(WEB_OUT, { recursive: true });

// The three tiles, plus the whole banner so the join can be checked in one look.
const NAMES = ['wff-ig-1-left.png', 'wff-ig-2-centre.png', 'wff-ig-3-right.png'];

for (let i = 0; i < PANELS; i += 1) {
  const { png, jpeg } = await render(svgFor(P(i), TILE_W), TILE_W, NAMES[i]);
  console.log(
    `${NAMES[i].padEnd(24)} ${TILE_W}x${TILE_H}  ${(png / 1024).toFixed(1)} kB png  ` +
      `${(jpeg / 1024).toFixed(1)} kB jpg`,
  );
}

const preview = await render(svgFor(0, FULL_W), FULL_W, 'wff-ig-preview.png');
console.log(
  `${'wff-ig-preview.png'.padEnd(24)} ${FULL_W}x${TILE_H}  ${(preview.png / 1024).toFixed(1)} kB png`,
);

/*
 * The captions ship next to the images.
 *
 * Posting is a manual step - there is no Instagram integration here, and
 * publishing to somebody's account is not something to automate quietly. So the
 * one thing that CAN go wrong unaided is the words being retyped from memory at
 * the moment of posting, and this file is what prevents that.
 */
const doc = [
  '# Pinned triptych - what to post, and in what order',
  '',
  'Generated by `npm run brand:instagram`. Do not edit by hand; edit',
  '`scripts/lib/instagram-copy.mjs` and regenerate.',
  '',
  '## Order',
  '',
  'POST THE RIGHT-HAND TILE FIRST. Instagram fills the grid newest-first from the',
  'top left, so posting left to right puts the banner up backwards.',
  '',
  'Then pin all three. The row order is decided by PINNING order, not posting',
  'order - if it comes out reversed, unpin and re-pin in the opposite sequence.',
  '',
  `Tiles are ${TILE_W}x${TILE_H} (4:5). Everything load-bearing sits inside the`,
  `central square, y ${SAFE_TOP}-${SAFE_BOTTOM}, so the artwork survives the grid`,
  'going back to 1:1.',
  '',
  ...TRIPTYCH_COPY.flatMap((tile) => [
    '---',
    '',
    `## ${tile.order}. ${tile.file}  (${tile.position})`,
    '',
    '### Alt text - EN',
    '',
    tile.alt.en,
    '',
    '### Alt text - CS',
    '',
    tile.alt.cs,
    '',
    '### Caption - EN',
    '',
    '```',
    tile.caption.en,
    '',
    HASHTAGS.en,
    '```',
    '',
    '### Caption - CS',
    '',
    '```',
    tile.caption.cs,
    '',
    HASHTAGS.cs,
    '```',
    '',
  ]),
].join('\n');

await writeFile(path.join(OUT, 'POSTING.md'), `${doc}\n`, 'utf8');

console.log(`${'POSTING.md'.padEnd(24)} captions, alt text and posting order`);
console.log(`
POST THE RIGHT-HAND TILE FIRST - Instagram fills the grid newest-first from the
top left, so posting left to right puts the banner up backwards:

${TRIPTYCH_COPY.map((t) => `  ${t.order}. ${t.file}`).join('\n')}

Captions and alt text for each are in POSTING.md next to the images.`);
