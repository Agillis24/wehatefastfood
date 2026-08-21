import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { useTranslations } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import {
  FSA_NUTRIENTS,
  bandFor,
  referenceIntakePercent,
  resolvePer100,
  pickBasis,
  panelConsistency,
  type ConsistencyFinding,
  type Additive,
  type BandResult,
  type Chain,
  type Ingredient,
  type MenuItem,
  type MarketVariant,
  type Source,
} from '@wff/content';
import { AVAILABLE_LOCALES } from '@/i18n/routing';
import { getContent } from '@/lib/content';
import { pageMetadata } from '@/lib/metadata';
import { itemOgImage } from '@/lib/og';
import { grams, isoDate } from '@/lib/format';
import { RealityCheck } from '@/components/data/RealityCheck';
import { ReferenceIntake } from '@/components/data/ReferenceIntake';
import { TrafficLights } from '@/components/data/TrafficLights';
import { PanelConsistency } from '@/components/data/PanelConsistency';
import { IngredientChips } from '@/components/content/IngredientChips';
import { SourceList } from '@/components/content/SourceList';
import { ItemStructuredData } from '@/components/content/StructuredData';
import { MarketDiff, type DiffEntry, type MarketComparison } from '@/components/data/MarketDiff';
import {
  Disclaimers,
  MarketSwitcher,
  PlainToggle,
  SiteFooter,
  SiteHeader,
} from '@/components/ui/Chrome';

/**
 * The centrepiece. Get this page right and the project works.
 *
 * Statically generated once per (locale, chain, item, MARKET) - the market is a
 * path segment precisely so each set of figures is its own real page with its
 * own canonical URL. See lib/url.ts.
 *
 * Zero client JavaScript: the visualisations are server-rendered SVG, the
 * additive drawer is a native <details>, the market switcher is a row of links
 * and plain-data mode is a CSS checkbox.
 */

type Params = { locale: string; chain: string; item: string; market: string };

export const dynamicParams = false;

export async function generateStaticParams() {
  const repo = await getContent();
  const items = await repo.listItems();

  return AVAILABLE_LOCALES.flatMap((locale) =>
    items.flatMap((item) =>
      item.variants.map((variant) => ({
        locale,
        chain: item.chainSlug,
        item: item.slug,
        market: variant.market,
      })),
    ),
  );
}

async function load(params: Params) {
  const repo = await getContent();
  const item = await repo.getItem(params.chain, params.item);
  if (!item) return null;

  const chain = await repo.getChain(params.chain);
  if (!chain) return null;

  const variant = item.variants.find((v) => v.market === params.market.toUpperCase());
  const thresholds = await repo.getFsaThresholds();
  const intakes = await repo.getReferenceIntakes();

  const ingredients: Ingredient[] = [];
  const additives: Additive[] = [];
  if (variant) {
    for (const ref of variant.ingredientRefs) {
      const found = await repo.getIngredient(ref);
      if (found) ingredients.push(found);
    }
    for (const ref of variant.additiveRefs) {
      const found = await repo.getAdditive(ref);
      if (found) additives.push(found);
    }
  }

  // --- market diff -----------------------------------------------------
  // Labels are resolved for every slug referenced by ANY variant, not just the
  // one on screen, or the other market's column would list bare slugs.
  const labels = new Map<string, DiffEntry>();
  for (const v of item.variants) {
    for (const ref of v.ingredientRefs) {
      if (labels.has(ref)) continue;
      const found = await repo.getIngredient(ref);
      if (found) labels.set(ref, { slug: ref, label: found.names[0] ?? ref, isAdditive: false });
    }
    for (const ref of v.additiveRefs) {
      if (labels.has(ref)) continue;
      const found = await repo.getAdditive(ref);
      if (found) labels.set(ref, { slug: ref, label: found.names[0] ?? ref, isAdditive: true });
    }
  }

  const entriesOf = (v: (typeof item.variants)[number]) =>
    new Set([...v.ingredientRefs, ...v.additiveRefs]);

  const comparisons: MarketComparison[] = [];
  if (variant) {
    const here = entriesOf(variant);
    for (const other of item.variants) {
      if (other.market === variant.market) continue;
      const there = entriesOf(other);
      const resolve = (slugs: string[]) =>
        slugs.map((slug) => labels.get(slug)).filter((e): e is DiffEntry => e !== undefined);

      comparisons.push({
        otherMarket: other.market,
        onlyHere: resolve([...here].filter((slug) => !there.has(slug))),
        onlyThere: resolve([...there].filter((slug) => !here.has(slug))),
        shared: resolve([...here].filter((slug) => there.has(slug))),
      });
    }
  }

  return { item, chain, variant, thresholds, intakes, ingredients, additives, comparisons };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const resolved = await params;
  const data = await load(resolved);
  const t = await getTranslations({ locale: resolved.locale, namespace: 'brand' });
  if (!data) return { title: t('name') };

  const market = resolved.market.toUpperCase();

  /*
   * The description was the site-wide tagline on every item page, which meant
   * several thousand pages describing themselves identically - the one thing a
   * meta description must not do, since it is what a search result and an
   * assistant's summary both quote.
   *
   * Our own take when we have written one; otherwise a factual line naming the
   * item, the chain and the market. Nothing is asserted here that is not
   * already on the page, and no figure is quoted, because a description is not
   * revalidated when a figure is.
   */
  const meta = await getTranslations({ locale: resolved.locale, namespace: 'item.meta' });
  const description =
    data.item.ourTake ??
    meta('description', { item: data.item.name, chain: data.chain.name, market });

  // Its own Specimen Card when one was rendered; the site-wide card otherwise.
  const image = itemOgImage(resolved.chain, resolved.item, market);

  return pageMetadata({
    locale: resolved.locale,
    ...(image ? { image } : {}),
    path: `/chains/${resolved.chain}/${resolved.item}/${market}`,
    // The market is in the title because two of these pages differ only by it.
    title: `${data.item.name} - ${data.chain.name} (${market})`,
    description,
  });
}

export default async function ItemPage({ params }: { params: Promise<Params> }) {
  const resolved = await params;
  setRequestLocale(resolved.locale);

  const data = await load(resolved);
  if (!data) notFound();

  const isDrink = data.item.category === 'drink';
  const per100 = data.variant ? resolvePer100(data.variant.nutrition) : null;
  const serving = data.variant ? (pickBasis(data.variant.nutrition, 'per-serving') ?? null) : null;

  /*
   * Every panel the variant holds, not just the one on screen: a contradiction
   * in the per-100 g column is as real as one per portion, and the reader is
   * being shown both sets of figures.
   */
  const findings: ConsistencyFinding[] = data.variant
    ? data.variant.nutrition.flatMap((p) => panelConsistency(p))
    : [];

  const bands: BandResult[] =
    per100 && data.thresholds
      ? FSA_NUTRIENTS.map((n) => bandFor(n, per100, serving, isDrink, data.thresholds!)).filter(
          (b): b is BandResult => b !== null,
        )
      : [];

  const intakeRows =
    serving && data.intakes
      ? (
          [
            ['energy', 'energyKcal'],
            ['fat', 'fatG'],
            ['saturates', 'saturatesG'],
            ['sugars', 'sugarsG'],
            ['salt', 'saltG'],
          ] as const
        ).map(([label, key]) => ({
          key: label,
          rawKey: key,
          percent: referenceIntakePercent(serving, key, data.intakes!),
          reference: String(data.intakes![key]),
        }))
      : [];

  return (
    <ItemView
      locale={resolved.locale}
      marketParam={resolved.market.toUpperCase()}
      item={data.item}
      chain={data.chain}
      variant={data.variant}
      bands={bands}
      intakeRows={intakeRows}
      ingredients={data.ingredients}
      additives={data.additives}
      comparisons={data.comparisons}
      isDrink={isDrink}
      servingG={serving?.servingSizeG ?? null}
      serving={serving}
      findings={findings}
      realityRows={[
        {
          kind: 'sugar' as const,
          grams: serving?.sugarsG ?? null,
          // Null in Canada, which publishes no added-sugars row at all. The
          // asymmetry is a fact about the two disclosure regimes, so it shows as
          // a missing sentence rather than as a zero.
          added: serving?.addedSugarsG ?? null,
        },
        { kind: 'salt' as const, grams: serving?.saltG ?? null },
        { kind: 'saturates' as const, grams: serving?.saturatesG ?? null },
      ]}
      bandsProvisional={data.thresholds?.status !== 'verified'}
      intakesProvisional={data.intakes?.status !== 'verified'}
    />
  );
}

type ViewProps = {
  locale: string;
  marketParam: string;
  item: MenuItem;
  chain: Chain;
  variant: MarketVariant | undefined;
  bands: BandResult[];
  intakeRows: { key: string; rawKey: string; percent: number | null; reference: string }[];
  ingredients: Ingredient[];
  additives: Additive[];
  comparisons: MarketComparison[];
  isDrink: boolean;
  servingG: number | null;
  serving: import('@wff/content').NutritionFacts | null;
  findings: ConsistencyFinding[];
  realityRows: {
    kind: 'sugar' | 'salt' | 'saturates';
    grams: number | null;
    added?: number | null;
  }[];
  /**
   * Two flags, not one. The bands and the percentages come from two separate
   * reference tables with two separate verification states, and collapsing them
   * would eventually label one of them by the status of the other.
   */
  bandsProvisional: boolean;
  intakesProvisional: boolean;
};

function ItemView(props: ViewProps) {
  const t = useTranslations('item.header');
  const tIntake = useTranslations('item.intake');
  const tSources = useTranslations('item.sources');
  const tTake = useTranslations('item.ourTake');
  const { locale, item, chain, variant } = props;

  const markets = item.variants.map((v) => v.market);

  // An identifier, not prose, so it is composed here rather than inside JSX -
  // which is also what the no-bare-strings rule is telling us by refusing it.
  const specimenId = `${chain.slug.slice(0, 3).toUpperCase()}-${props.marketParam}`;

  return (
    <>
      <ItemStructuredData
        locale={locale}
        chain={chain}
        item={item}
        market={props.marketParam}
        serving={props.serving}
        verifiedOn={variant?.verifiedOn ?? null}
      />
      <SiteHeader locale={locale} />

      <main id="main" className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-8">
        <header className="flex flex-col gap-3">
          <p className="font-data text-xs tracking-widest uppercase">
            {chain.name}
            {' · '}
            <span data-numeric>{t('specimen')}</span> <span data-numeric>{specimenId}</span>
          </p>
          <h1 className="font-display text-4xl leading-none font-black sm:text-6xl">{item.name}</h1>

          <div className="flex flex-wrap items-center gap-4">
            <MarketSwitcher
              locale={locale}
              chain={item.chainSlug}
              item={item.slug}
              markets={markets}
              current={props.marketParam}
            />
            <PlainToggle />
          </div>

          {variant ? (
            <p className="font-data text-xs text-[var(--surface-muted)]" data-numeric>
              {t('verified')} {isoDate(locale, variant.verifiedOn)}
              {props.servingG !== null
                ? ` · ${t('servingSize')} ${grams(locale, props.servingG)}`
                : ''}
            </p>
          ) : null}
        </header>

        <div className="rule-strike" aria-hidden="true" />

        {variant === undefined ? (
          <section className="flex flex-col gap-3 card p-4">
            <h2 className="font-display text-3xl font-extrabold tracking-tight">
              {t('noDataTitle')}
            </h2>
            <p>{t('noDataBody')}</p>
            <p className="font-data text-sm">
              {t('marketsWeHold')} <span data-numeric>{markets.join(', ')}</span>
            </p>
          </section>
        ) : (
          <>
            <RealityCheck rows={props.realityRows} locale={locale} />

            <TrafficLights
              bands={props.bands}
              locale={locale}
              isDrink={props.isDrink}
              provisional={props.bandsProvisional}
            />

            <ReferenceIntake
              rows={props.intakeRows.map((r) => ({
                key: r.key,
                label: tIntake(r.key as 'energy'),
                percent: r.percent,
                reference: r.reference,
              }))}
              locale={locale}
              provisional={props.intakesProvisional}
            />

            <PanelConsistency findings={props.findings} locale={locale} />

            <IngredientChips
              ingredients={props.ingredients}
              additives={props.additives}
              allergens={variant.allergens}
              mayContain={variant.mayContain}
              components={variant.components}
            />

            <MarketDiff market={props.marketParam} comparisons={props.comparisons} />

            {item.ourTake !== undefined ? (
              <section
                aria-labelledby="take-title"
                className="border-s-4 border-pink bg-[var(--color-paper)] ps-4"
              >
                <h2 id="take-title" className="font-display text-3xl font-extrabold tracking-tight">
                  {tTake('title')}
                </h2>
                <p className="font-data text-xs text-[var(--surface-muted)]">{tTake('label')}</p>
                <p className="mt-2">{item.ourTake}</p>
              </section>
            ) : null}

            <SourceList
              locale={locale}
              groups={[
                { heading: tSources('forThisMarket'), sources: variant.sources as Source[] },
                { heading: tSources('forTheChain'), sources: chain.sources as Source[] },
              ]}
            />
          </>
        )}

        <div className="rule-strike" aria-hidden="true" />
        <Disclaimers />
      </main>

      <SiteFooter
        locale={locale}
        path={`/chains/${item.chainSlug}/${item.slug}/${props.marketParam}`}
      />
    </>
  );
}
