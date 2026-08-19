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

  /*
   * THE OPTION NAMES MATTER AND TWO OF THEM WERE WRONG.
   *
   * resvg-js 2.6.2 takes `defaultFontFamily` as a STRING and has separate
   * `sansSerifFamily` and `monospaceFamily` keys. This passed an object
   * `{ sansSerif, monospace }`, which is not a shape the option accepts, so it
   * was discarded and every generic fell back to resvg's own serif.
   *
   * AND THE FAMILY NAMES ARE NOT THE FILE NAMES. Archivo.ttf declares its
   * family as "Archivo SemiBold" and PublicSans.ttf as "Public Sans Thin",
   * because both are variable fonts named after the instance they were cut
   * from. Asking for "Archivo" matched nothing.
   *
   * Between the two faults nothing drawn through resvg has ever used the brand
   * type. It went unnoticed for as long as it did because every image this
   * pipeline rendered was ASCII, where a serif fallback reads as a design
   * choice rather than a bug. The first Czech display text made it obvious:
   * "Patatas s pepřovou omáčkou" came out serif on a slide whose next line was
   * not.
   */
  return {
    loadSystemFonts: false,
    fontFiles: FILES,
    defaultFontFamily: 'Archivo SemiBold',
    sansSerifFamily: 'Archivo SemiBold',
    monospaceFamily: 'IBM Plex Mono',
  };
}
