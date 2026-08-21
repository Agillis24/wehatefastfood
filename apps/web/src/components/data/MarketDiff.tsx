import { useTranslations } from 'next-intl';

import { diffState } from '@/lib/market-diff';

/**
 * "Same product, different country" - the single most shareable thing on the
 * site, so it is built properly rather than as a novelty.
 *
 * Zero JavaScript. Every row carries a glyph as well as a position in a column,
 * so the distinction never rests on colour or layout alone.
 *
 * The caution line is not boilerplate. A market listing fewer additives may
 * simply declare differently, not be formulated differently, and presenting a
 * declaration gap as a recipe gap would be exactly the overreach this project
 * refuses. It is stated every time the component renders.
 */

export type DiffEntry = { slug: string; label: string; isAdditive: boolean };

export type MarketComparison = {
  otherMarket: string;
  onlyHere: DiffEntry[];
  onlyThere: DiffEntry[];
  shared: DiffEntry[];
};

function Row({ entry, glyph }: { entry: DiffEntry; glyph: string }) {
  return (
    <li className="flex items-baseline gap-2 py-1">
      <span aria-hidden="true" className="font-data font-bold">
        {glyph}
      </span>
      <span className="text-sm">
        {entry.label}
        {entry.isAdditive ? (
          <span className="font-data ms-2 pill bg-pink px-1 text-xs text-ink">
            {entry.slug.split('-')[0]?.toUpperCase()}
          </span>
        ) : null}
      </span>
    </li>
  );
}

function Column({
  heading,
  glyph,
  entries,
  emptyLabel,
}: {
  heading: string;
  glyph: string;
  entries: DiffEntry[];
  emptyLabel: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <h4 className="font-data text-xs tracking-widest uppercase">{heading}</h4>
      {entries.length === 0 ? (
        <p className="text-sm text-[var(--surface-muted)]">{emptyLabel}</p>
      ) : (
        <ul>
          {entries.map((entry) => (
            <Row key={entry.slug} entry={entry} glyph={glyph} />
          ))}
        </ul>
      )}
    </div>
  );
}

export function MarketDiff({
  market,
  comparisons,
}: {
  market: string;
  comparisons: MarketComparison[];
}) {
  const t = useTranslations('diff');

  return (
    <section aria-labelledby="diff-title" className="flex flex-col gap-4">
      <h2 id="diff-title" className="font-display text-2xl font-extrabold">
        {t('title')}
      </h2>
      <p className="max-w-prose text-sm text-[var(--surface-muted)]">{t('subtitle')}</p>

      {comparisons.length === 0 ? (
        <p className="text-[var(--surface-muted)]">{t('needTwoMarkets')}</p>
      ) : (
        comparisons.map((comparison) => {
          // Three states, not two - see lib/market-diff.ts for why, and its
          // tests for the case that would otherwise have shipped.
          const state = diffState(comparison);
          const noDeclarations = state === 'no-declarations';
          const nothingDiffers = state === 'nothing-differs';

          return (
            <div key={comparison.otherMarket} className="flex flex-col gap-3 card p-4">
              <h3 className="font-data text-sm tracking-widest uppercase" data-numeric>
                {market}
                {' / '}
                {comparison.otherMarket}
              </h3>

              {noDeclarations ? (
                <p className="text-sm">
                  {t('noDeclarations', { a: market, b: comparison.otherMarket })}
                </p>
              ) : nothingDiffers ? (
                <p className="text-sm">
                  {t('nothingDiffers', { a: market, b: comparison.otherMarket })}
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Column
                    heading={t('onlyIn', { market })}
                    glyph="+"
                    entries={comparison.onlyHere}
                    emptyLabel={t('absent')}
                  />
                  <Column
                    heading={t('onlyIn', { market: comparison.otherMarket })}
                    glyph="+"
                    entries={comparison.onlyThere}
                    emptyLabel={t('absent')}
                  />
                </div>
              )}

              {noDeclarations ? null : (
                <Column
                  heading={t('inBoth')}
                  glyph="="
                  entries={comparison.shared}
                  emptyLabel={t('absent')}
                />
              )}
            </div>
          );
        })
      )}

      <p className="max-w-prose border-s-4 border-[var(--surface-rule)] ps-3 text-xs text-[var(--surface-muted)]">
        {t('caution')}
      </p>
    </section>
  );
}
