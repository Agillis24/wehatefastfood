import { useTranslations } from 'next-intl';
import { percent } from '@/lib/format';

/**
 * Percentage of an adult reference intake, as arcs with the number beside them.
 *
 * Presented neutrally and never as a budget the reader has spent. No "you have
 * used up X% of your day", no colour coding, no comparison to other people.
 * The frame is what is in the food, not what the reader should do about it.
 *
 * Pure SVG, zero JavaScript. The arc is decorative and hidden; the percentage
 * and its sentence are the content.
 */

const SIZE = 72;
const STROKE = 8;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type Row = { key: string; label: string; percent: number | null; reference: string };

function Arc({ value }: { value: number }) {
  // Beyond a full turn the arc stops being informative, so it caps and the
  // number beside it carries the real figure.
  const clamped = Math.min(value, 100);
  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke="var(--surface-rule)"
        strokeWidth={STROKE}
        opacity="0.25"
      />
      <circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        fill="none"
        stroke="var(--color-pink)"
        strokeWidth={STROKE}
        strokeLinecap="butt"
        strokeDasharray={`${(clamped / 100) * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
        transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
      />
    </svg>
  );
}

export function ReferenceIntake({
  rows,
  locale,
  provisional,
}: {
  rows: Row[];
  locale: string;
  /**
   * True while content/reference/reference-intakes.json is unverified.
   *
   * The traffic lights carried this caveat from the start and this table did
   * not, even though both are computed from a table written from working
   * knowledge. A percentage looks more like a plain fact than a colour does,
   * which makes the omission the worse of the two.
   */
  provisional: boolean;
}) {
  const t = useTranslations('item.intake');

  const shown = rows.filter((r) => r.percent !== null);
  if (shown.length === 0) return null;

  return (
    <section aria-labelledby="intake-title" className="flex flex-col gap-3">
      <h2 id="intake-title" className="font-display text-2xl font-extrabold">
        {t('title')}
      </h2>
      <p className="text-sm text-[var(--surface-muted)]">{t('subtitle')}</p>

      {provisional ? (
        <p className="border-s-4 border-pink ps-3 text-sm text-[var(--surface-muted)]">
          {t('unverified')}
        </p>
      ) : null}

      <ul className="flex flex-wrap gap-6">
        {shown.map((row) => (
          <li key={row.key} className="flex flex-col items-start gap-1">
            <div data-viz>
              <Arc value={row.percent ?? 0} />
            </div>
            <span className="font-data text-lg font-semibold" data-numeric>
              {percent(locale, row.percent ?? 0)}
            </span>
            <span className="font-data text-xs tracking-widest uppercase">{row.label}</span>
            <span className="sr-only">
              {t('ofReference', {
                percent: percent(locale, row.percent ?? 0),
                reference: row.reference,
              })}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
