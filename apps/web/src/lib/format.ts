/**
 * Every number, date and unit goes through Intl. Never string-concatenated,
 * because a decimal comma is not a cosmetic difference in a language that uses
 * one, and neither is a date order.
 */

export function num(locale: string, value: number, maximumFractionDigits = 1): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(value);
}

export function percent(locale: string, value: number): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(value / 100);
}

export function grams(locale: string, value: number): string {
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: 'gram',
    unitDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(value);
}

export function isoDate(locale: string, iso: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}

/**
 * "two and a quarter" for the plain-language sentence beside a quantity stack.
 * Falls back to the numeral when the fraction is not one we have a word for -
 * an approximate word would be a less precise claim than the number.
 */
export function unitCount(locale: string, value: number): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value);
}
