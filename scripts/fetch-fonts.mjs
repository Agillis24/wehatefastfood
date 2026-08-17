/**
 * Fetch the three typefaces the tokens name, once, into the repo.
 *
 *   node scripts/fetch-fonts.mjs
 *
 * The site has been rendering in fallbacks since Phase 1: the tokens name
 * Archivo, Public Sans and IBM Plex Mono and nothing ever downloaded them. So
 * the live site is not the design, and the Specimen Cards render differently on
 * CI than on a developer's machine because resvg falls back to whatever the
 * host happens to have. Same root cause, two symptoms.
 *
 * TWO FORMATS, FOR TWO CONSUMERS:
 *
 *   woff2 -> apps/web/src/fonts/    the site, via next/font/local
 *   ttf   -> assets/fonts/          resvg, which draws the cards and the
 *                                   Instagram tiles and cannot read woff2
 *
 * SUBSETTING IS GOOGLE'S, NOT OURS. Requesting the CSS with a modern browser
 * user-agent returns per-subset woff2 files already split by unicode-range, so
 * we take the `latin` and `latin-ext` ones and skip the rest. latin-ext is not
 * optional here - it carries ě š č ř ž ý á í é ú ů ď ť ň, which is to say it
 * carries Czech. A latin-only build renders the pilot locale in a fallback face
 * and nobody notices until a Czech reader does.
 *
 * The files are COMMITTED. They are OFL, redistribution is exactly what the
 * licence is for, and a build that reaches out to Google is a build that renders
 * differently when Google is unreachable - which is the bug being fixed.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB = path.join(ROOT, 'apps', 'web', 'public', 'fonts');
const CSS = path.join(ROOT, 'apps', 'web', 'src', 'styles', 'fonts.css');
const RASTER = path.join(ROOT, 'assets', 'fonts');

/** A real browser UA, or Google serves ancient truetype instead of woff2. */
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

/** Only these two. The rest of what Google offers is weight this site never uses. */
const SUBSETS = ['latin', 'latin-ext'];

const FAMILIES = [
  { name: 'Archivo', css: 'Archivo:wght@400;600;700;900', file: 'archivo' },
  { name: 'Public Sans', css: 'Public+Sans:wght@400;600;700', file: 'public-sans' },
  { name: 'IBM Plex Mono', css: 'IBM+Plex+Mono:wght@400;600', file: 'ibm-plex-mono' },
];

/**
 * The variable TTFs, from the upstream repositories rather than the CSS API -
 * Google's CSS never offers a variable file, and resvg wants one file per family
 * rather than one per weight.
 */
const TTF = [
  {
    file: 'Archivo.ttf',
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/archivo/Archivo%5Bwdth%2Cwght%5D.ttf',
  },
  {
    file: 'PublicSans.ttf',
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/publicsans/PublicSans%5Bwght%5D.ttf',
  },
  {
    file: 'IBMPlexMono-Regular.ttf',
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/ibmplexmono/IBMPlexMono-Regular.ttf',
  },
  {
    file: 'IBMPlexMono-SemiBold.ttf',
    url: 'https://raw.githubusercontent.com/google/fonts/main/ofl/ibmplexmono/IBMPlexMono-SemiBold.ttf',
  },
];

async function download(url, headers = {}) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${response.status} for ${url}`);
  return response;
}

const faces = [];

await mkdir(WEB, { recursive: true });
await mkdir(RASTER, { recursive: true });

// --- woff2, for the site ----------------------------------------------------

for (const family of FAMILIES) {
  const css = await (
    await download(`https://fonts.googleapis.com/css2?family=${family.css}&display=swap`, {
      'User-Agent': UA,
    })
  ).text();

  /*
   * The CSS is a run of @font-face blocks, each preceded by a comment naming
   * its subset. Split on the comments so a block can be attributed - the
   * unicode-range alone would mean reimplementing Google's subset table.
   */
  const blocks = css.split(/\/\*\s*/).slice(1);
  let written = 0;

  for (const block of blocks) {
    const subset = block.slice(0, block.indexOf(' ')).trim();
    if (!SUBSETS.includes(subset)) continue;

    const url = /src:\s*url\((https:[^)]+\.woff2)\)/.exec(block)?.[1];
    const weight = /font-weight:\s*(\d+)/.exec(block)?.[1];
    if (!url || !weight) continue;

    const range = /unicode-range:\s*([^;]+);/.exec(block)?.[1]?.trim();
    const name = `${family.file}-${weight}-${subset}.woff2`;
    const bytes = Buffer.from(await (await download(url)).arrayBuffer());
    await writeFile(path.join(WEB, name), bytes);
    console.log(`  ${name.padEnd(34)} ${(bytes.length / 1024).toFixed(1)} kB`);

    /*
     * The unicode-range comes with the file, and it is the point of splitting
     * them: a reader of the English site never downloads the Czech glyphs, and
     * a Czech reader downloads both without anyone choosing.
     */
    faces.push(
      [
        '@font-face {',
        `  font-family: '${family.name}';`,
        `  font-style: normal;`,
        `  font-weight: ${weight};`,
        // swap, not block: the text is the content, and a fallback for 100ms
        // beats an empty page.
        `  font-display: swap;`,
        `  src: url('/fonts/${name}') format('woff2');`,
        ...(range ? [`  unicode-range: ${range};`] : []),
        '}',
      ].join('\n'),
    );
    written += 1;
  }

  if (written === 0) throw new Error(`no subsets matched for ${family.name}`);
}

/*
 * GENERATED, not hand-written. Eighteen @font-face blocks kept in step with
 * eighteen files by hand is a promise nobody keeps; regenerating them from the
 * files that were actually downloaded means the two cannot disagree.
 */
await writeFile(
  CSS,
  [
    '/*',
    ' * GENERATED by scripts/fetch-fonts.mjs. Do not edit.',
    ' *',
    ' * Self-hosted rather than loaded from Google, for two reasons that are not',
    ' * about speed: /privacy states that this site loads nothing from a third',
    ' * party, and a test fails if any page requests another host. The other is',
    ' * that a font fetched at request time is a font that is missing when the',
    ' * host is unreachable.',
    ' */',
    '',
    faces.join('\n\n'),
    '',
  ].join('\n'),
  'utf8',
);
console.log(`\n  fonts.css                          ${faces.length} @font-face blocks`);

// --- ttf, for resvg ---------------------------------------------------------

console.log('');
for (const font of TTF) {
  const bytes = Buffer.from(await (await download(font.url)).arrayBuffer());
  await writeFile(path.join(RASTER, font.file), bytes);
  console.log(`  ${font.file.padEnd(34)} ${(bytes.length / 1024).toFixed(1)} kB`);
}

console.log(`
woff2 -> apps/web/public/fonts  (served) + src/styles/fonts.css (generated)
ttf   -> assets/fonts         (resvg: specimen cards, OG image, IG tiles)

Both are committed. OFL, so redistribution is the point of the licence, and a
build that fetches from Google at build time renders differently when Google is
unreachable - which is the failure this replaces.`);
