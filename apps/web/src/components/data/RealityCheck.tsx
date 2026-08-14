import { useTranslations } from 'next-intl';
import { grams, unitCount } from '@/lib/format';

/**
 * The quantity stack - the thing people screenshot.
 *
 * Sugar as 4 g cubes, salt as 6 g level teaspoons, saturated fat as 5 g pats of
 * butter, drawn flat-vector in the mark's language and at TRUE RELATIVE SCALE to
 * each other: a teaspoon glyph is wider than a cube glyph in the same proportion
 * as 6 g is to 4 g. The eye then compares them without being told to.
 *
 * Partial units are drawn partial. 9 g of sugar is two cubes and a quarter cube,
 * never "2.25 cubes" rounded to something tidier than the truth.
 *
 * Zero JavaScript. Every stack carries a plain sentence in the DOM immediately
 * after it - that is what a screen reader gets, and what survives plain mode.
 *
 * NO EXERCISE EQUIVALENTS, EVER. The unit is always a physical quantity of the
 * substance itself, never a quantity of the reader's time, effort or body.
 */

const PX_PER_GRAM = 5;
const MAX_DRAWN_UNITS = 40;

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
          strokeWidth="3"
        />
        <path d="M4 14 H36" stroke="var(--color-ink)" strokeWidth="2" opacity="0.35" />
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
          strokeWidth="3"
        />
        <path d="M26 20 H37" stroke="var(--color-ink)" strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path
        d="M5 27 L13 13 H35 L27 27 Z"
        fill="var(--color-paper)"
        stroke="var(--color-ink)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Stack({ kind, grams }: { kind: Kind; grams: number }) {
  const per = UNIT_GRAMS[kind];
  const size = per * PX_PER_GRAM * 1.6;
  const total = grams / per;
  const whole = Math.min(Math.floor(total), MAX_DRAWN_UNITS);
  const fraction = total - Math.floor(total);

  return (
    <div className="flex flex-wrap items-end gap-1" aria-hidden="true">
      {Array.from({ length: whole }, (_, i) => (
        <Glyph key={i} kind={kind} size={size} />
      ))}
      {fraction > 0.02 && whole < MAX_DRAWN_UNITS ? (
        <div
          className="overflow-hidden"
          style={{ width: `${Math.max(fraction * size, 2)}px`, height: `${size}px` }}
        >
          <Glyph kind={kind} size={size} />
        </div>
      ) : null}
    </div>
  );
}

type Row = { kind: Kind; grams: number | null };

export function RealityCheck({ rows, locale }: { rows: Row[]; locale: string }) {
  const t = useTranslations('item.reality');

  const unitKey = { sugar: 'cubeUnit', salt: 'spoonUnit', saturates: 'patUnit' } as const;

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

        // The unit count is formatted to a string before it reaches ICU.
        // Passing it as a number makes ICU choose a plural form for a fraction,
        // which is unreliable across locales, and prints 0.417 where 0.42 is
        // the honest precision for a figure we derived by division.
        const sentence = t('sentence', {
          value: grams(locale, row.grams),
          nutrient: label.toLocaleLowerCase(locale),
          units: t(unitKey[row.kind], {
            count: unitCount(locale, row.grams / UNIT_GRAMS[row.kind]),
            grams: UNIT_GRAMS[row.kind],
          }),
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
          </div>
        );
      })}
    </section>
  );
}
