import { useTranslations } from 'next-intl';
import type { BandResult, FsaBand } from '@wff/content';
import { num } from '@/lib/format';

/**
 * UK front-of-pack bands, rendered as a real table.
 *
 * A table rather than a row of divs because that is what this is: nutrients
 * against bands and thresholds. It gets row and column headers, reflows at
 * 320 px without horizontal scrolling, survives text-spacing overrides, and
 * costs zero JavaScript.
 *
 * THE TEXT LABEL IS THE MECHANISM, NOT A FALLBACK. Red and amber are
 * indistinguishable to a deuteranope and no hex value fixes that - see
 * docs/BRAND.md §4. The colour is the redundancy. Never shrink or hide the word.
 */

const BAND_CLASS: Record<FsaBand, string> = {
  high: 'bg-tl-high text-paper',
  medium: 'bg-tl-med text-ink',
  low: 'bg-tl-low text-paper',
};

type Props = {
  bands: BandResult[];
  locale: string;
  isDrink: boolean;
  /** True while our copy of the official thresholds is still unverified. */
  provisional: boolean;
};

export function TrafficLights({ bands, locale, isDrink, provisional }: Props) {
  const t = useTranslations('item.lights');
  const tHeader = useTranslations('item.header');
  const tData = useTranslations('data');
  const tNutrient = useTranslations('item.intake');

  const bandWord = (band: FsaBand) =>
    band === 'high' ? tData('high') : band === 'medium' ? tData('medium') : tData('low');

  return (
    <section aria-labelledby="lights-title" className="flex flex-col gap-3">
      <h2 id="lights-title" className="font-display text-2xl font-extrabold">
        {t('title')}
      </h2>
      <p className="text-sm text-[var(--surface-muted)]">{t('subtitle')}</p>

      {provisional ? (
        <p className="border-s-4 border-pink ps-3 text-sm text-[var(--surface-muted)]">
          {tHeader('unverifiedThresholds')}
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-start">
          <caption className="sr-only">{t('title')}</caption>
          <thead>
            <tr className="font-data text-xs tracking-widest uppercase">
              <th scope="col" className="py-2 pe-3 text-start font-semibold">
                {t('nutrient')}
              </th>
              <th scope="col" className="py-2 pe-3 text-start font-semibold">
                {isDrink ? t('per100ml') : t('per100')}
              </th>
              <th scope="col" className="py-2 pe-3 text-start font-semibold">
                {t('band')}
              </th>
              <th scope="col" className="py-2 text-start font-semibold">
                {t('thresholds')}
              </th>
            </tr>
          </thead>
          <tbody>
            {bands.map((b) => (
              <tr key={b.nutrient} className="border-t border-[var(--surface-rule)]/40">
                <th scope="row" className="py-3 pe-3 text-start font-medium">
                  {tNutrient(b.nutrient === 'sugars' ? 'sugars' : b.nutrient)}
                </th>
                <td className="font-data py-3 pe-3" data-numeric>
                  {num(locale, b.per100)}
                </td>
                <td className="py-3 pe-3">
                  <span
                    className={`inline-block border-[1.5px] border-ink px-2 py-1 font-data text-xs font-semibold tracking-widest ${BAND_CLASS[b.band]}`}
                  >
                    {bandWord(b.band)}
                  </span>
                </td>
                <td className="font-data py-3 text-xs text-[var(--surface-muted)]" data-numeric>
                  <span className="block">
                    {t('lowAtOrBelow', { value: num(locale, b.thresholds.lowMax, 2) })}
                  </span>
                  <span className="block">
                    {t('highAbove', { value: num(locale, b.thresholds.highMin, 2) })}
                  </span>
                  {b.drivenByPortion ? (
                    <span className="mt-1 block text-ink">
                      {t('portionRule', { value: num(locale, b.thresholds.portionHigh, 2) })}
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
