import { useTranslations } from 'next-intl';
import type { ConsistencyFinding } from '@wff/content';

import { grams } from '@/lib/format';

/**
 * Where a company's own panel disagrees with itself.
 *
 * The tone is the whole design. This is not an accusation and it does not say
 * which figure is wrong - it shows two numbers the company published and the
 * arithmetic between them, so a reader can check it on the same page. Anything
 * stronger would be us asserting a fact we cannot source; anything weaker would
 * be hiding one we can.
 *
 * It renders nothing when there is nothing to report, which is almost always.
 */
export function PanelConsistency({
  findings,
  locale,
}: {
  findings: ConsistencyFinding[];
  locale: string;
}) {
  const t = useTranslations('item.consistency');
  if (findings.length === 0) return null;

  return (
    <section aria-labelledby="consistency-title" className="flex flex-col gap-3 card p-4">
      <h2 id="consistency-title" className="font-display text-xl font-extrabold tracking-tight">
        {t('title')}
      </h2>
      <p className="max-w-prose text-sm text-[var(--surface-muted)]">{t('lede')}</p>

      <ul className="flex flex-col gap-2">
        {findings.map((f) => (
          <li key={f.kind} className="text-sm">
            {f.kind === 'energy-mismatch' ? (
              <span data-numeric>
                {t('energy', {
                  stated: f.stated,
                  implied: f.implied,
                  percent: Math.abs(f.deviationPercent),
                })}
              </span>
            ) : null}
            {f.kind === 'saturates-exceeds-fat' ? (
              <span data-numeric>
                {t('saturates', {
                  saturates: grams(locale, f.saturates),
                  fat: grams(locale, f.fat),
                })}
              </span>
            ) : null}
            {f.kind === 'sugars-exceed-carbohydrate' ? (
              <span data-numeric>
                {t('sugars', {
                  sugars: grams(locale, f.sugars),
                  carbohydrate: grams(locale, f.carbohydrate),
                })}
              </span>
            ) : null}
          </li>
        ))}
      </ul>

      <p className="max-w-prose text-sm">{t('weDoNotCorrect')}</p>
    </section>
  );
}
