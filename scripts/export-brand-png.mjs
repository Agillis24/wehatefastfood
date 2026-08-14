/**
 * Rasterise the brand SVGs in packages/design-tokens/brand to PNG.
 *
 *   node scripts/export-brand-png.mjs                 # all targets
 *   node scripts/export-brand-png.mjs watermark-disc  # one target by suffix
 *
 * Backgrounds stay transparent: resvg composites onto nothing unless the SVG
 * itself paints a rect, so a source file with no background rect produces a
 * PNG with a real alpha channel. Do not add a background here.
 *
 * Cross-platform, no shell operators, per BRIEF §0.6.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'packages', 'design-tokens', 'brand');

/** @type {{file: string, sizes: number[]}[]} */
const TARGETS = [
  { file: 'wff-watermark-disc.svg', sizes: [1080] },
  { file: 'wff-watermark-light.svg', sizes: [1080] },
  { file: 'wff-avatar-primary.svg', sizes: [1080] },
  { file: 'wff-avatar-dark.svg', sizes: [1080] },
];

const filter = process.argv[2];
const selected = filter ? TARGETS.filter((t) => t.file.includes(filter)) : TARGETS;

if (selected.length === 0) {
  console.error(`No brand asset matches "${filter}".`);
  process.exit(1);
}

await mkdir(SRC, { recursive: true });

for (const target of selected) {
  const svg = await readFile(path.join(SRC, target.file), 'utf8');

  for (const size of target.sizes) {
    const resvg = new Resvg(svg, {
      fitTo: { mode: 'width', value: size },
      // No `background` key at all - that is what keeps the alpha channel.
      font: { loadSystemFonts: false }, // these marks are pure geometry; fail loudly if that changes
    });
    const png = resvg.render().asPng();

    const out = path.join(SRC, `${path.basename(target.file, '.svg')}-${size}.png`);
    await writeFile(out, png);

    console.log(
      `${path.relative(ROOT, out).padEnd(58)} ${size}x${size}  ${(png.length / 1024).toFixed(1)} kB`,
    );
  }
}
