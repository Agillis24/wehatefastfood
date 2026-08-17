/**
 * The Specimen Card, as SVG.
 *
 * ONE drawing, four destinations: the Open Graph image, the Instagram square,
 * the Instagram portrait, and the opening frame of a video. That is the whole
 * reason the card exists as a concept (docs/BRAND.md §3) - if each channel had
 * its own artwork they would drift, and the point of the card is that they
 * cannot.
 *
 * Hand-written SVG rather than satori. Satori would let us reuse the React
 * component, but it also means shipping a JSX-to-SVG engine to render four
 * static images per item. The card is about twenty shapes; this file is the
 * whole renderer, it has no dependencies, and resvg turns it into a PNG.
 *
 * LAYOUT: the header flows from the top, the chips and wordmark are anchored to
 * the bottom, and the quantity stack takes whatever is left. The glyphs are then
 * sized to fill the width at the busiest row, so a 50 g sugar item and a 4 g one
 * both read at a glance instead of one being a smear and the other a speck.
 *
 * NO CHAIN LOGOS, NO BRAND COLOURS, NO PHOTOGRAPHY. Chain names are text, in
 * our own type. See docs/LEGAL.md.
 */

const esc = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Grams per drawn unit. Must match packages/design-tokens/tokens.json. */
export const UNITS = { sugar: 4, salt: 6, saturates: 5 };

const BAND_FILL = { high: 'tl-high', medium: 'tl-med', low: 'tl-low' };
/** Amber takes ink text; red and green take paper. See docs/BRAND.md §4. */
const BAND_TEXT = { high: 'paper', medium: 'ink', low: 'paper' };

export const PRESETS = {
  og: { width: 1200, height: 630, label: 'og' },
  square: { width: 1080, height: 1080, label: 'ig-square' },
  portrait: { width: 1080, height: 1350, label: 'ig-portrait' },
  video: { width: 1920, height: 1080, label: 'video' },
};

const MAX_GLYPHS = 16;

function glyph(kind, x, y, size, colours) {
  const u = size / 40;
  const n = (v) => (v * u).toFixed(2);
  const px = (v) => (x + v * u).toFixed(2);
  const py = (v) => (y + v * u).toFixed(2);

  if (kind === 'sugar') {
    return (
      `<rect x="${px(3)}" y="${py(3)}" width="${n(34)}" height="${n(34)}" fill="${colours.fill}" stroke="${colours.line}" stroke-width="${n(3.5)}"/>` +
      `<path d="M ${px(3)} ${py(13)} H ${px(37)}" stroke="${colours.line}" stroke-width="${n(2.5)}" opacity="0.4"/>`
    );
  }
  if (kind === 'salt') {
    return (
      `<ellipse cx="${px(16)}" cy="${py(21)}" rx="${n(13)}" ry="${n(10)}" fill="${colours.fill}" stroke="${colours.line}" stroke-width="${n(3.5)}"/>` +
      `<path d="M ${px(28)} ${py(21)} H ${px(39)}" stroke="${colours.line}" stroke-width="${n(5)}" stroke-linecap="round"/>`
    );
  }
  return `<path d="M ${px(3)} ${py(30)} L ${px(12)} ${py(12)} H ${px(37)} L ${px(28)} ${py(30)} Z" fill="${colours.fill}" stroke="${colours.line}" stroke-width="${n(3.5)}" stroke-linejoin="round"/>`;
}

function stack(kind, grams, x, y, size, colours) {
  if (grams === null || grams === undefined) return '';
  const per = UNITS[kind];
  const total = grams / per;
  const whole = Math.min(Math.floor(total), MAX_GLYPHS);
  const fraction = total - Math.floor(total);
  const step = size * 1.08;

  let out = '';
  for (let i = 0; i < whole; i += 1) out += glyph(kind, x + i * step, y, size, colours);

  /*
   * A partial unit is the WHOLE unit ghosted, with the fraction solid on top -
   * the way a half-filled star reads as half.
   *
   * Clipping alone was tried in both this file and the web component, and it is
   * wrong for the same reason in both: a teaspoon carries its meaning in its
   * outline, so 0.42 of one comes out as a crescent that reads as a rendering
   * fault rather than as a quantity, and its handle falls outside the clip and
   * disappears entirely. Fixed in RealityCheck.tsx first; this is the same fix
   * in the second implementation of the same drawing.
   */
  if (fraction > 0.02 && whole < MAX_GLYPHS) {
    const cx = x + whole * step;
    const id = `c${kind}${Math.round(cx)}${Math.round(y)}`;
    out +=
      // The unit that would be there, so the fraction has something to be a
      // fraction OF. Faint enough to read as absent.
      `<g opacity="0.3">${glyph(kind, cx, y, size, colours)}</g>` +
      `<clipPath id="${id}"><rect x="${cx.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(fraction * size, 3).toFixed(1)}" height="${size.toFixed(1)}"/></clipPath>` +
      `<g clip-path="url(#${id})">${glyph(kind, cx, y, size, colours)}</g>`;
  }
  return out;
}

export function specimenCardSvg(card, preset, tokens, surface = 'paper') {
  const { width, height } = PRESETS[preset];

  const c = {
    paper: tokens['--color-paper'],
    ink: tokens['--color-ink'],
    pink: tokens['--color-pink'],
    muted: tokens['--color-muted'],
    'tl-high': tokens['--color-tl-high'],
    'tl-med': tokens['--color-tl-med'],
    'tl-low': tokens['--color-tl-low'],
  };

  const bg = surface === 'ink' ? c.ink : c.paper;
  const fg = surface === 'ink' ? c.paper : c.ink;
  const dim = surface === 'ink' ? tokens['--color-grey-light'] : c.muted;
  const glyphColours = { fill: bg, line: fg };

  const pad = Math.round(width * 0.06);
  const inner = width - pad * 2;
  const k = width / 1200;

  const display = 'Archivo, Arial Black, Helvetica, sans-serif';
  const mono = 'IBM Plex Mono, Consolas, monospace';

  const text = (x, y, size, fill, value, opts = {}) =>
    `<text x="${x.toFixed(0)}" y="${y.toFixed(0)}" font-family="${opts.font ?? mono}" font-size="${size.toFixed(1)}"` +
    `${opts.weight ? ` font-weight="${opts.weight}"` : ''}${opts.spacing ? ` letter-spacing="${opts.spacing.toFixed(1)}"` : ''}` +
    ` fill="${fill}">${esc(value)}</text>`;

  const parts = [`<rect width="${width}" height="${height}" fill="${bg}"/>`];

  // --- header, from the top ------------------------------------------------
  let y = pad + 26 * k;
  parts.push(
    text(pad, y, 22 * k, dim, `SPECIMEN ${card.specimenId} · VERIFIED ${card.verifiedOn}`, {
      spacing: 2 * k,
    }),
  );

  y += 38 * k;
  parts.push(text(pad, y, 26 * k, dim, card.chainName));

  y += 68 * k;
  const nameSize = Math.max(
    34 * k,
    Math.min(84 * k, (inner / Math.max(card.itemName.length, 8)) * 1.7),
  );
  parts.push(text(pad, y, nameSize, fg, card.itemName, { font: display, weight: 900 }));

  // The -19 degree brand angle, as a rule UNDER the name and clear of it.
  //
  // It must not cross the item name. The strike is the brand's gesture, never a
  // verdict on a food (docs/BRAND.md §2), and a diagonal through a product name
  // reads as exactly that verdict. Two earlier versions of this layout did it by
  // accident, because rotating a rect by -19 degrees about its left end lifts
  // the far end by width * sin(19deg) - so the clearance is computed from the
  // geometry rather than guessed, and stays correct if the width changes.
  const ruleWidth = 120 * k;
  const ruleRise = ruleWidth * Math.sin((19 * Math.PI) / 180);
  y += ruleRise + 26 * k;
  parts.push(
    `<g transform="rotate(-19 ${pad} ${y.toFixed(0)})"><rect x="${pad}" y="${y.toFixed(0)}" width="${ruleWidth.toFixed(0)}" height="${(8 * k).toFixed(0)}" fill="${c.pink}"/></g>`,
  );

  const headerBottom = y + 30 * k;

  // --- anchored to the bottom: wordmark, then chips above it ---------------
  const wordmarkY = height - pad * 0.55;
  const wordmarkSize = 30 * k;
  parts.push(text(pad, wordmarkY, wordmarkSize, fg, 'WE', { font: display, weight: 900 }));
  parts.push(
    text(pad + wordmarkSize * 2.05, wordmarkY, wordmarkSize, c.pink, 'HATE FAST FOOD', {
      font: display,
      weight: 900,
    }),
  );

  const chipH = 58 * k;
  const chipGap = 12 * k;
  const chipW = Math.min(240 * k, (inner - chipGap * 3) / 4);
  const chipsY = wordmarkY - wordmarkSize - chipH - 20 * k;

  card.bands.forEach((band, index) => {
    const x = pad + index * (chipW + chipGap);
    parts.push(
      `<rect x="${x.toFixed(0)}" y="${chipsY.toFixed(0)}" width="${chipW.toFixed(0)}" height="${chipH.toFixed(0)}" fill="${c[BAND_FILL[band.band]]}" stroke="${fg}" stroke-width="${(2.5 * k).toFixed(1)}"/>`,
    );
    parts.push(
      text(
        x + 16 * k,
        chipsY + chipH * 0.66,
        24 * k,
        c[BAND_TEXT[band.band]],
        `${band.label} ${band.word}`,
        { weight: 600, spacing: 1.5 * k },
      ),
    );
  });

  // --- the quantity stack fills what is left -------------------------------
  const rows = [
    ['sugar', 'SUGAR', card.sugarG],
    ['salt', 'SALT', card.saltG],
    ['saturates', 'SAT FAT', card.saturatesG],
  ];

  const available = chipsY - 20 * k - headerBottom;
  const rowHeight = available / rows.length;

  // One glyph size for all three rows, so the drawn units stay at TRUE RELATIVE
  // SCALE to each other - that comparison is the whole point of the stack.
  const labelWidth = 320 * k;
  const busiest = Math.max(
    ...rows.map(([kind, , grams]) =>
      grams === null || grams === undefined
        ? 1
        : Math.min(Math.ceil(grams / UNITS[kind]), MAX_GLYPHS),
    ),
    1,
  );
  // Capped so a one-cube item does not render a single enormous square, and
  // floored so a busy one stays legible rather than becoming a texture.
  const glyphSize = Math.max(
    28 * k,
    Math.min(rowHeight * 0.92, (inner - labelWidth) / (busiest * 1.08), 132 * k),
  );

  rows.forEach(([kind, label, grams], index) => {
    const rowY = headerBottom + index * rowHeight;
    const baseline = rowY + rowHeight * 0.62;

    parts.push(text(pad, baseline, 26 * k, fg, label, { spacing: 2 * k }));
    parts.push(
      text(pad + 180 * k, baseline, 30 * k, fg, grams === null ? 'not published' : `${grams} g`, {
        weight: 600,
      }),
    );
    parts.push(
      stack(
        kind,
        grams,
        pad + labelWidth,
        rowY + (rowHeight - glyphSize) / 2,
        glyphSize,
        glyphColours,
      ),
    );
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${parts.join('')}</svg>`;
}
