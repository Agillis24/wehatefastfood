import { useTranslations } from 'next-intl';

/**
 * WE / LOVE (struck) / HATE / FAST FOOD.
 *
 * WHY THIS USES `textLength`
 * The delivered wordmark SVGs position the strike rule with a hard-coded width
 * that was measured against DejaVu Sans Condensed. That font does not exist on
 * Windows or macOS, so the fallback renders `LOVE` wider than the rule and the
 * final E is left unstruck - measured in-browser: LOVE ends at x 554, the rule
 * stops at x 512. The one element in the mark that must not fail, failing.
 *
 * `textLength` with `lengthAdjust="spacingAndGlyphs"` forces each word to
 * occupy exactly the width we specify, whatever font actually resolves. The
 * strike is then derived from that same constant, so it cannot drift. A missing
 * webfont now costs us slightly squeezed glyphs instead of a broken mark.
 *
 * Server component. Zero client JS.
 */

type Props = {
  /** `ink` flips the wordmark for dark surfaces. See docs/BRAND.md §4. */
  surface?: 'paper' | 'ink';
  className?: string;
  /** Rendered as the accessible name; the SVG itself is labelled, not read glyph by glyph. */
  title?: string;
};

// Geometry, in viewBox units. The strike derives from LOVE_W - never hard-code it twice.
const LOVE_X = 76;
const LOVE_W = 452;
const STRIKE_OVERHANG = 16;

export function Wordmark({ surface = 'paper', className, title }: Props) {
  const t = useTranslations('brand');

  const fg = surface === 'ink' ? 'var(--color-paper)' : 'var(--color-ink)';
  const struck = surface === 'ink' ? 'var(--color-grey-dark)' : 'var(--color-grey-light)';
  const label = title ?? t('name');

  return (
    <svg
      viewBox="0 0 1200 600"
      className={className}
      role="img"
      aria-label={label}
      style={{ fontFamily: 'var(--font-display)', fontWeight: 900 }}
    >
      <text x={80} y={140} fontSize={72} letterSpacing={6} fill={fg}>
        {t('wordmarkWe')}
      </text>

      <text
        x={LOVE_X}
        y={330}
        fontSize={160}
        textLength={LOVE_W}
        lengthAdjust="spacingAndGlyphs"
        fill={struck}
      >
        {t('wordmarkLove')}
      </text>

      {/* Derived from LOVE_X/LOVE_W, so it spans the whole word in any font. */}
      <rect
        x={LOVE_X - STRIKE_OVERHANG}
        y={262}
        width={LOVE_W + STRIKE_OVERHANG * 2}
        height={28}
        fill={fg}
      />

      <g transform="rotate(-7 640 300)">
        <text
          x={404}
          y={356}
          fontSize={176}
          textLength={496}
          lengthAdjust="spacingAndGlyphs"
          fill="var(--color-pink)"
        >
          {t('wordmarkHate')}
        </text>
      </g>

      <text
        x={76}
        y={520}
        fontSize={160}
        textLength={1016}
        lengthAdjust="spacingAndGlyphs"
        fill={fg}
      >
        {t('wordmarkFastFood')}
      </text>
    </svg>
  );
}
