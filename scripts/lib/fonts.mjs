import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The font files every resvg render must use, and the settings that make the
 * render the same everywhere.
 *
 * `loadSystemFonts: true` is why a Specimen Card drawn on CI did not match one
 * drawn on a laptop: resvg fell back to whatever the host happened to have -
 * DejaVu on ubuntu, Arial on Windows - from a byte-identical SVG. It was
 * measured, not theorised: the same item produced hash d170a592 locally and
 * 22df6249 on the runner.
 *
 * So system fonts are OFF and the files are named. A missing file then fails
 * loudly rather than silently substituting, which is the whole point.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIR = path.join(ROOT, 'assets', 'fonts');

const FILES = [
  'Archivo.ttf',
  'PublicSans.ttf',
  'IBMPlexMono-Regular.ttf',
  'IBMPlexMono-SemiBold.ttf',
].map((name) => path.join(DIR, name));

export function resvgFonts() {
  const missing = FILES.filter((file) => !existsSync(file));
  if (missing.length > 0) {
    throw new Error(
      `fonts missing: ${missing.map((f) => path.basename(f)).join(', ')}\n` +
        'Run `npm run fonts` to fetch them. They are committed, so this normally\n' +
        'means the download never happened rather than that they were deleted.',
    );
  }

  return {
    loadSystemFonts: false,
    fontFiles: FILES,
    defaultFontFamily: {
      sansSerif: 'Archivo',
      monospace: 'IBM Plex Mono',
    },
  };
}
