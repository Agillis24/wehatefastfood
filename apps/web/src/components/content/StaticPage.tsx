import type { ReactNode } from 'react';
import { SiteFooter, SiteHeader } from '@/components/ui/Chrome';

/**
 * The shell for the pages that are prose rather than data: about, methodology,
 * legal, privacy, sources.
 *
 * They are footer-linked from every page on the site, so they are not optional
 * furniture - a footer that links to a 404 is worse than a footer with no link.
 * They also carry the claims the rest of the site asks to be believed on, which
 * is why methodology and privacy are written as carefully as any item page.
 */

export type Section = { heading: string; body: string[] };

/**
 * Sections arrive from the message catalogue via `t.raw`, which is typed
 * `unknown` because a catalogue is data and data can be wrong. Rather than
 * assert the shape, we check it: a malformed section is dropped and the rest of
 * the page still renders. A translation that mangles one entry should not take
 * the privacy policy off the air.
 */
export function toSections(raw: unknown): Section[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((entry): Section[] => {
    if (typeof entry !== 'object' || entry === null) return [];
    const { heading, body } = entry as Record<string, unknown>;
    if (typeof heading !== 'string' || !Array.isArray(body)) return [];
    return [{ heading, body: body.filter((p): p is string => typeof p === 'string') }];
  });
}

export function StaticPage({
  locale,
  path,
  title,
  lede,
  sections,
  children,
}: {
  locale: string;
  /** Locale-less, so the footer can offer the same page in another language. */
  path: string;
  title: string;
  lede: string;
  sections: Section[];
  children?: ReactNode;
}) {
  return (
    <>
      <SiteHeader locale={locale} />

      <main id="main" className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8">
        <header className="flex flex-col gap-3">
          <h1 className="font-display text-4xl leading-none font-black sm:text-6xl">{title}</h1>
          <p className="max-w-prose text-lg">{lede}</p>
        </header>

        <div className="rule-strike" aria-hidden="true" />

        {sections.map((section) => (
          <section key={section.heading} className="flex flex-col gap-3">
            <h2 className="font-display text-3xl font-extrabold tracking-tight">
              {section.heading}
            </h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="max-w-prose">
                {paragraph}
              </p>
            ))}
          </section>
        ))}

        {children}

        {/*
          No <Disclaimers /> here. The footer renders them a few hundred pixels
          below, and on a page this short the reader simply got the same two
          paragraphs twice. Item and decoder pages keep their own copy because
          there the figures are far above the fold and the footer is not.
        */}
      </main>

      <SiteFooter locale={locale} path={path} />
    </>
  );
}
