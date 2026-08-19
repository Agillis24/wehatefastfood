/**
 * Carousel slides for a daily post, as SVG.
 *
 * WHY NOT THE SPECIMEN CARD. The card is a data sheet built for the web and for
 * link previews, and it earns its keep there. Dropped into a feed it fails
 * twice over. It shows whichever three nutrients the item happens to carry,
 * which for a contradiction post meant a headline about 838 kJ against 51 kJ
 * sitting above "SUGAR 0.065 g". And it spreads three sparse rows over 1350px,
 * so most of the picture is empty. Nobody stops scrolling for a spreadsheet.
 *
 * THREE SLIDES, ONE JOB EACH:
 *
 *   1. THE HOOK. One number, as large as it will go, and a line saying what it
 *      is. Nothing else competes with it.
 *   2. THE EVIDENCE. Both figures side by side with the arithmetic between
 *      them, so the claim can be checked rather than believed.
 *   3. WHO SAID IT. Chain, item, the source and the date a person checked it.
 *
 * INK SURFACE, NOT PAPER. docs/BRAND.md §4 leaves pink unrestricted on ink and
 * limits it on paper, and a dark slide holds a feed better than a cream one.
 * The web stays paper; this is the same palette used the other way up.
 *
 * NO CHAIN LOGOS, NO BRAND COLOURS, NO PHOTOGRAPHY, per docs/LEGAL.md. Chain
 * names are text in our own type, exactly as on the site.
 */

const esc = (v) =>
  String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const SLIDE = { width: 1080, height: 1350 };

const DISPLAY = 'Archivo, Arial Black, Helvetica, sans-serif';
const MONO = 'IBM Plex Mono, Consolas, monospace';

/**
 * Break a line at word boundaries.
 *
 * Measured in characters rather than glyph widths, which is crude and good
 * enough here because every string on these slides is short and the caller
 * picks a size that leaves room. Anything long enough for the estimate to
 * matter belongs in the caption, not on the picture.
 */
function wrap(value, perLine) {
  const words = String(value).split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > perLine && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

const text = (x, y, size, fill, value, opts = {}) =>
  `<text x="${x.toFixed(0)}" y="${y.toFixed(0)}" font-family="${opts.font ?? MONO}" ` +
  `font-size="${size.toFixed(1)}" font-weight="${opts.weight ?? 400}" ` +
  `letter-spacing="${opts.spacing ?? 0}" fill="${fill}"` +
  `${opts.anchor ? ` text-anchor="${opts.anchor}"` : ''}>${esc(value)}</text>`;

function block(x, y, size, fill, value, opts = {}) {
  const lines = wrap(value, opts.perLine ?? 24);
  const step = size * (opts.leading ?? 1.16);
  return {
    svg: lines.map((line, i) => text(x, y + i * step, size, fill, line, opts)).join(''),
    height: (lines.length - 1) * step,
  };
}

function frame(body, c) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SLIDE.width} ${SLIDE.height}" ` +
    `width="${SLIDE.width}" height="${SLIDE.height}">` +
    `<rect width="${SLIDE.width}" height="${SLIDE.height}" fill="${c.ink}"/>` +
    body +
    '</svg>'
  );
}

/**
 * The footer that sits on every slide. Wordmark left, address right.
 *
 * NO STRIKE-THROUGH HERE. The full mark strikes out the word LOVE, and at this
 * size there is no room for it, so the rule was landing across "WE" instead and
 * reading as a printing fault rather than a joke.
 *
 * The address is on the picture rather than only in the caption because a
 * screenshot of a slide travels without its caption, and a claim with no way
 * back to its source is the one thing this project cannot ship.
 */
function footer(c, y = SLIDE.height - 64) {
  return (
    text(72, y, 30, c.paper, 'WE', { font: DISPLAY, weight: 900, spacing: 1 }) +
    text(126, y, 30, c.pink, 'HATE FAST FOOD', { font: DISPLAY, weight: 900, spacing: 1 }) +
    text(SLIDE.width - 72, y, 26, c.greyLight, 'wehatefastfood.com', { anchor: 'end' })
  );
}

/**
 * Slide 1. One number and what it is.
 *
 * The size is chosen from the length of the figure so "94 %" and "1,2×" both
 * fill the width instead of one being a wall and the other a whisper.
 */
function hook(slide, c) {
  const size = Math.min(320, 1900 / Math.max(String(slide.hero).length, 3));
  const sub = block(72, 700, 52, c.paper, slide.heroSub, { perLine: 26, leading: 1.25 });
  /*
   * THE PRODUCT IS NAMED ON THE PICTURE. A big number floating on its own is a
   * claim about nothing, and the caption underneath is not always read. Chain
   * above the figure, product below the sentence, so the slide answers "of
   * what" without anybody having to scroll.
   */
  const who = block(72, sub.height + 830, 40, c.greyLight, slide.item, {
    perLine: 30,
    leading: 1.2,
  });
  return frame(
    text(72, 300, 32, c.greyLight, slide.chain.toUpperCase(), { spacing: 8 }) +
      text(72, 580, size, c.pink, slide.hero, { font: DISPLAY, weight: 900, spacing: -4 }) +
      sub.svg +
      who.svg +
      text(72, SLIDE.height - 150, 26, c.greyLight, 'PŘEJEĎTE DÁL', { spacing: 6 }) +
      footer(c),
    c,
  );
}

/** Slide 2. Both figures, and the sum between them. */
function evidence(slide, c) {
  const rows = slide.rows
    .map((row, i) => {
      const y = 420 + i * 230;
      return (
        text(72, y, 30, c.greyLight, row.label, { spacing: 4 }) +
        text(72, y + 110, 96, row.accent ? c.pink : c.paper, row.value, {
          font: DISPLAY,
          weight: 900,
        })
      );
    })
    .join('');
  const note = block(72, 1090, 34, c.greyLight, slide.note, { perLine: 42, leading: 1.3 });
  const head = block(72, 260, 46, c.paper, slide.item, {
    perLine: 26,
    leading: 1.15,
    font: DISPLAY,
    weight: 700,
  });
  return frame(
    text(72, 180, 30, c.pink, slide.chain.toUpperCase(), { spacing: 8 }) +
      head.svg +
      rows +
      note.svg +
      footer(c),
    c,
  );
}

/** Slide 3. Whose figures these are, and where to check them. */
function attribution(slide, c) {
  const name = block(72, 300, 76, c.paper, slide.item, {
    perLine: 18,
    leading: 1.1,
    font: DISPLAY,
    weight: 900,
  });
  const source = block(72, 700, 34, c.greyLight, slide.source, { perLine: 40, leading: 1.35 });
  return frame(
    text(72, 200, 30, c.pink, slide.chain, { spacing: 6 }) +
      name.svg +
      source.svg +
      text(72, 1120, 44, c.paper, 'wehatefastfood.com', { font: DISPLAY, weight: 900 }) +
      text(72, 1176, 28, c.greyLight, 'Celý rozpis i zdroj', {}) +
      footer(c),
    c,
  );
}

/**
 * All three slides for one finding.
 *
 * `slides` is plain data assembled by the caller from the item record, so this
 * file never decides what a figure means. It only decides how big it is.
 */
export function carouselSvg(slides, tokens) {
  const c = {
    ink: tokens['--color-ink'],
    paper: tokens['--color-paper'],
    pink: tokens['--color-pink'],
    greyLight: tokens['--color-grey-light'],
  };
  return [hook(slides, c), evidence(slides, c), attribution(slides, c)];
}
