/**
 * The default share image: apps/web/public/og/wff-share.png, 1200x630.
 *
 *   node scripts/export-og-default.mjs
 *
 * This is what every page that has no Specimen Card of its own hands to
 * Facebook, WhatsApp, Slack, Discord, LinkedIn and the rest. It goes into
 * apps/web/public/ rather than exports/, which is the difference that matters:
 * scripts/social-cards.mjs writes per-item cards into exports/social/, that
 * directory is gitignored, and the step is not in the production build - so no
 * deployment has ever contained a single OG image. A share card that only
 * exists on one laptop is not a share card.
 *
 * 1200x630 is the size every consumer resizes from without cropping. PNG rather
 * than WebP or SVG: WhatsApp and several others still refuse both, and this is
 * the one image that has to work everywhere.
 *
 * No font is trusted - every string carries an explicit textLength, and the
 * strike is derived from the same constant as the word it crosses. See
 * scripts/export-instagram-grid.mjs for what happens when that is skipped.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { resvgFonts } from './lib/fonts.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'apps', 'web', 'public', 'og');

const W = 1200;
const H = 630;

const INK = '#16120F';
const PAPER = '#F6F2E8';
const PINK = '#FF2D62';
const GREY = '#8C8377';
const MUTED = '#B9B2A4';

const STACK = 'Archivo, sans-serif';

const word = (x, y, text, { size, fill, width, spacing = 2, anchor = 'start' }) =>
  `<text x="${x}" y="${y}" font-family="${STACK}" font-weight="bold" font-size="${size}" ` +
  `letter-spacing="${spacing}" fill="${fill}" textLength="${width}" ` +
  `lengthAdjust="spacingAndGlyphs" text-anchor="${anchor}">${text}</text>`;

const LOVE_X = 80;
const LOVE_BASE = 268;
const LOVE_SIZE = 150;
const LOVE_W = 400;
const STRIKE_H = 30;
const STRIKE_Y = LOVE_BASE - (LOVE_SIZE * 0.72) / 2 - STRIKE_H / 2;

// HATE starts about three quarters along LOVE: far enough to overwrite it,
// not so far that the word being corrected is no longer readable.
const HATE_X = LOVE_X + Math.round(LOVE_W * 0.72);
const HATE_BASE = LOVE_BASE + 30;

const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
  `<rect width="${W}" height="${H}" fill="${INK}"/>` +
  `<g opacity="0.13"><g transform="rotate(-19 ${W / 2} ${H / 2})">` +
  `<rect x="-400" y="40" width="${W + 800}" height="90" fill="${PINK}"/>` +
  `<rect x="-400" y="560" width="${W + 800}" height="90" fill="${PINK}"/>` +
  `</g></g>` +
  word(LOVE_X + 4, LOVE_BASE - 178, 'WE', { size: 66, fill: PAPER, width: 132, spacing: 8 }) +
  word(LOVE_X, LOVE_BASE, 'LOVE', { size: LOVE_SIZE, fill: GREY, width: LOVE_W }) +
  `<rect x="${LOVE_X - 24}" y="${STRIKE_Y}" width="${LOVE_W + 48}" height="${STRIKE_H}" fill="${PAPER}"/>` +
  `<g transform="rotate(-7 ${HATE_X + 200} ${HATE_BASE - 45})">` +
  word(HATE_X, HATE_BASE, 'HATE', { size: 162, fill: PINK, width: 400 }) +
  `</g>` +
  word(LOVE_X, 482, 'FAST FOOD', { size: 145, fill: PAPER, width: 1040 }) +
  `<rect x="0" y="530" width="${W}" height="2" fill="${MUTED}" opacity="0.35"/>` +
  word(LOVE_X, 580, "What's actually in it — and why they put it there.", {
    size: 34,
    fill: MUTED,
    width: 620,
    spacing: 1,
  }) +
  word(W - LOVE_X, 580, 'wehatefastfood.com', {
    size: 34,
    fill: PINK,
    width: 300,
    spacing: 1,
    anchor: 'end',
  }) +
  `</svg>`;

await mkdir(OUT, { recursive: true });

const png = new Resvg(svg, {
  fitTo: { mode: 'width', value: W },
  font: resvgFonts(),
})
  .render()
  .asPng();

const file = path.join(OUT, 'wff-share.png');
await writeFile(file, png);

console.log(
  `${path.relative(ROOT, file).padEnd(40)} ${W}x${H}  ${(png.length / 1024).toFixed(1)} kB`,
);
