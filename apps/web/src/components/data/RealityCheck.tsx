import { useTranslations } from 'next-intl';
import { grams } from '@/lib/format';

/**
 * The quantity stack - the thing people screenshot.
 *
 * Sugar as 4 g cubes, salt as 6 g level teaspoons, saturated fat as 5 g pats of
 * butter, drawn flat-vector in the mark's language and at TRUE RELATIVE SCALE to
 * each other: a teaspoon glyph is wider than a cube glyph in the same proportion
 * as 6 g is to 4 g. The eye then compares them without being told to.
 *
 * Partial units are drawn partial. 9 g of sugar is two cubes and a quarter cube,
 * never "2.25 cubes" rounded to something tidier than the truth. A partial unit
 * is drawn as the WHOLE unit ghosted with the fraction solid on top, the way a
 * half-filled star reads as half. Simply clipping the glyph was tried and was
 * wrong: a teaspoon carries its meaning in its outline, so 0.42 of one came out
 * as a crescent that read as a rendering fault rather than as a quantity.
 *
 * Zero JavaScript. Every stack carries a plain sentence in the DOM immediately
 * after it - that is what a screen reader gets, and what survives plain mode.
 *
 * NO EXERCISE EQUIVALENTS, EVER. The unit is always a physical quantity of the
 * substance itself, never a quantity of the reader's time, effort or body.
 */

/**
 * Pixels per gram of the unit being drawn.
 *
 * This constant is what holds the three stacks at TRUE RELATIVE SCALE: a 6 g
 * teaspoon comes out half again as wide as a 4 g cube because it holds half
 * again as much. The comparison between the rows is the point of the whole
 * component, so the size is derived from the mass rather than picked per row.
 *
 * Raised from 5 after seeing it on the live site. At the old size the glyphs
 * read as faint outlines, lighter than the caption underneath them - a poor
 * showing for the element the page is built around.
 */
const PX_PER_GRAM = 11;

/**
 * Past this many the stack is a texture rather than a count, and each further
 * glyph adds rows without adding meaning. Nothing is hidden by stopping: the
 * exact figure is in the heading and the sentence below states the true count.
 */
const MAX_DRAWN_UNITS = 30;

type Kind = 'sugar' | 'salt' | 'saturates';

const UNIT_GRAMS: Record<Kind, number> = { sugar: 4, salt: 6, saturates: 5 };

function Glyph({ kind, size }: { kind: Kind; size: number }) {
  const common = { width: size, height: size, viewBox: '0 0 40 40', 'aria-hidden': true } as const;

  if (kind === 'sugar') {
    return (
      <svg {...common}>
        <rect
          x="4"
          y="4"
          width="32"
          height="32"
          fill="var(--color-paper)"
          stroke="var(--color-ink)"
          strokeWidth="4"
        />
        <path d="M4 14 H36" stroke="var(--color-ink)" strokeWidth="2.5" opacity="0.35" />
      </svg>
    );
  }

  if (kind === 'salt') {
    return (
      <svg {...common}>
        <ellipse
          cx="15"
          cy="20"
          rx="12"
          ry="9"
          fill="var(--color-paper)"
          stroke="var(--color-ink)"
          strokeWidth="4"
        />
        <path d="M26 20 H37" stroke="var(--color-ink)" strokeWidth="5" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path
        d="M5 27 L13 13 H35 L27 27 Z"
        fill="var(--color-paper)"
        stroke="var(--color-ink)"
        strokeWidth="4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Stack({ kind, grams }: { kind: Kind; grams: number }) {
  const per = UNIT_GRAMS[kind];
  const size = per * PX_PER_GRAM;
  const total = grams / per;
  const whole = Math.min(Math.floor(total), MAX_DRAWN_UNITS);
  const fraction = total - Math.floor(total);

  return (
    <div className="flex flex-wrap items-end gap-1.5" aria-hidden="true">
      {Array.from({ length: whole }, (_, i) => (
        <Glyph key={i} kind={kind} size={size} />
      ))}
      {fraction > 0.02 && whole < MAX_DRAWN_UNITS ? (
        <div className="relative" style={{ width: `${size}px`, height: `${size}px` }}>
          {/* The unit that would be there, so the fraction has something to be a
              fraction OF. Faint enough to read as absent. */}
          <div className="absolute inset-0 opacity-30">
            <Glyph kind={kind} size={size} />
          </div>
          {/* The part that is actually there, at full strength. */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ width: `${Math.max(fraction * size, 3)}px` }}
          >
            <Glyph kind={kind} size={size} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * `added` carries the added-sugars figure on the sugar row, and is null on every
 * other row and in every market that does not publish one.
 *
 * It is a second sentence rather than a fourth stack on purpose. Two towers of
 * sugar cubes on one page, one a subset of the other, reads as twice the sugar;
 * the number is worth stating and not worth drawing twice. It is also the only
 * figure on the panel that separates sugar that arrived with the food from sugar
 * the company put in - which is the whole argument of the page.
 */
type Row = { kind: Kind; grams: number | null; added?: number | null };

export function RealityCheck({ rows, locale }: { rows: Row[]; locale: string }) {
  const t = useTranslations('item.reality');

  /**
   * One complete sentence per nutrient, rather than one sentence with the
   * nutrient interpolated.
   *
   * Czech showed why: "obsahuje 9 g cukr" is wrong, it needs the genitive
   * "cukru", and an inflected language cannot take a nominative label from a
   * heading and drop it into a sentence slot. Interpolating nouns into
   * sentences only looks like it works in English.
   */
  const sentenceKey = {
    sugar: 'sentenceSugar',
    salt: 'sentenceSalt',
    saturates: 'sentenceSaturates',
  } as const;

  return (
    <section aria-labelledby="reality-title" className="flex flex-col gap-5">
      <h2 id="reality-title" className="font-display text-2xl font-extrabold">
        {t('title')}
      </h2>

      {rows.map((row) => {
        const label = t(row.kind);

        if (row.grams === null) {
          return (
            <div key={row.kind} className="flex flex-col gap-1">
              <h3 className="font-data text-xs tracking-widest uppercase">{label}</h3>
              <p className="text-[var(--surface-muted)]">
                {t('notPublished', { nutrient: label })}
              </p>
            </div>
          );
        }

        // Rounded to two decimals BEFORE ICU sees it, so the plural category is
        // chosen for the number the reader is actually shown. Passed as a
        // number, not a string, or ICU cannot select a category at all - and
        // Czech needs `many` for decimals to get the case right.
        const count = Math.round((row.grams / UNIT_GRAMS[row.kind]) * 100) / 100;
        const sentence = t(sentenceKey[row.kind], {
          value: grams(locale, row.grams),
          count,
          grams: UNIT_GRAMS[row.kind],
        });

        return (
          <div key={row.kind} className="flex flex-col gap-2">
            <h3 className="font-data text-xs tracking-widest uppercase">
              {label}
              <span className="ms-2 font-semibold" data-numeric>
                {grams(locale, row.grams)}
              </span>
            </h3>
            <div data-viz>
              <Stack kind={row.kind} grams={row.grams} />
            </div>
            {/* The sentence is the accessible equivalent AND what plain mode keeps. */}
            <p className="text-sm">{sentence}</p>
            {row.added !== null && row.added !== undefined ? (
              <p className="text-sm">
                {t('addedSugar', {
                  added: grams(locale, row.added),
                  cubes: Math.round((row.added / UNIT_GRAMS[row.kind]) * 100) / 100,
                })}
              </p>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}
