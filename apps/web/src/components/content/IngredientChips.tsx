import { useTranslations } from 'next-intl';
import type { Component } from '@wff/content';
import type { Additive, Ingredient } from '@wff/content';

/**
 * The ingredient list as tappable chips, additives visually distinguished.
 *
 * The drawer is a native <details>, not a hand-rolled dialog. That gives
 * keyboard operation, screen-reader semantics and correct focus behaviour for
 * free, works with zero JavaScript, and keeps the reader on the page - which is
 * what the brief asks for. A <dialog> would need showModal(), i.e. an island,
 * on a page whose entire remaining JS budget is about 26 kB.
 *
 * Additives are marked with a text glyph as well as a border, because colour
 * and weight alone are not a distinction everyone can see.
 */

type Props = {
  ingredients: Ingredient[];
  additives: Additive[];
  allergens: string[];
  mayContain: string[];
  components: Component[];
};

function Entry({ children, term }: { children: React.ReactNode; term: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-data text-xs tracking-widest uppercase">{term}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

export function IngredientChips({
  ingredients,
  additives,
  allergens,
  mayContain,
  components,
}: Props) {
  const t = useTranslations('item.ingredients');
  const tA = useTranslations('allergen');

  /*
   * An allergen declaration is not an ingredient list, and this component used
   * to return early when there were no ingredients - taking the allergens with
   * it. Every item in the repo is in that state today, so the effect was that
   * two hundred and forty-four allergen declarations were held and none of them
   * reached a page. A company may publish what a product contains for allergen
   * purposes while publishing nothing about its recipe, and for a reader with
   * an allergy that first list is the one that matters.
   */
  const noComposition =
    ingredients.length === 0 && additives.length === 0 && components.length === 0;

  return (
    <section aria-labelledby="ingredients-title" className="flex flex-col gap-4">
      <h2 id="ingredients-title" className="font-display text-2xl font-extrabold">
        {t('title')}
      </h2>

      {noComposition ? <p className="text-[var(--surface-muted)]">{t('none')}</p> : null}

      {/*
        The declaration as the company printed it, component by component. Not
        parsed into entities and not summarised: splitting "Enriched Flour
        (bleached Wheat Flour, Niacin)" into parts means deciding where one
        ingredient ends and another begins, and every such decision would be
        ours rather than the source's. The reader gets the label, not our
        reading of it.
      */}
      {components.length > 0 ? (
        <dl className="flex flex-col gap-3">
          {components.map((c) => (
            <div key={c.name} className="flex flex-col gap-1 border-s-[3px] border-ink ps-3">
              <dt className="font-data text-xs tracking-widest uppercase">{c.name}</dt>
              <dd className="text-sm">{c.declaration}</dd>
              {c.allergens.length > 0 ? (
                <dd className="text-xs text-[var(--surface-muted)]">
                  {t('allergens')}
                  {': '}
                  {c.allergens.map((a) => tA(a)).join(', ')}
                </dd>
              ) : null}
            </div>
          ))}
        </dl>
      ) : null}

      <ul className="flex flex-wrap gap-2">
        {ingredients.map((ingredient) => (
          <li key={ingredient.slug}>
            <span className="inline-flex min-h-11 items-center border-[1.5px] border-[var(--surface-rule)] px-3 py-2 text-sm">
              {ingredient.names[0]}
            </span>
          </li>
        ))}
      </ul>

      {additives.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {additives.map((additive) => (
            <li key={additive.slug}>
              <details className="border-[1.5px] border-ink">
                <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-semibold">
                  <span className="font-data border-[1.5px] border-ink bg-pink px-1 text-xs text-ink">
                    {additive.eNumber ?? t('additive')}
                  </span>
                  <span>{additive.names[0]}</span>
                  <span className="ms-auto font-data text-xs text-[var(--surface-muted)]">
                    {t('openEntry')}
                  </span>
                </summary>

                <dl className="flex flex-col gap-3 border-t-[1.5px] border-ink px-3 py-3">
                  <Entry term={t('whatItIs')}>{additive.whatItIs}</Entry>
                  <Entry term={t('whyItIsHere')}>{additive.whyItIsInYourFood}</Entry>
                  <Entry term={t('evidence')}>{additive.evidenceSummary}</Entry>
                  <Entry term={t('regulatory')}>
                    <span className="block">
                      {t('eu')}
                      {': '}
                      {additive.regulatoryStatus.eu}
                    </span>
                    <span className="block">
                      {t('uk')}
                      {': '}
                      {additive.regulatoryStatus.uk}
                    </span>
                    <span className="block">
                      {t('us')}
                      {': '}
                      {additive.regulatoryStatus.us}
                    </span>
                  </Entry>
                  {additive.notableDivergence !== null ? (
                    <Entry term={t('divergence')}>{additive.notableDivergence}</Entry>
                  ) : null}
                </dl>
              </details>
            </li>
          ))}
        </ul>
      ) : null}

      {/*
        Two lists, never one. "Contains" names what is in the recipe; "may
        contain" warns about a shared kitchen. Printing them together would turn
        a warning into an ingredient - a meal needlessly refused by someone with
        a mild intolerance, and a reason to distrust the declared list, which is
        the one that matters most.
      */}
      {allergens.length > 0 ? (
        <p className="text-sm">
          <span className="font-data text-xs tracking-widest uppercase">{t('allergens')}</span>
          <span className="ms-2">{allergens.map((a) => tA(a)).join(', ')}</span>
        </p>
      ) : null}

      {mayContain.length > 0 ? (
        <p className="text-sm text-[var(--surface-muted)]">
          <span className="font-data text-xs tracking-widest uppercase">{t('mayContain')}</span>
          <span className="ms-2">{mayContain.map((a) => tA(a)).join(', ')}</span>
        </p>
      ) : null}
    </section>
  );
}
