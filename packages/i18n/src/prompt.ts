/**
 * The translation prompt, shared by tier 1 (build time) and tier 2 (on demand)
 * so the two tiers cannot drift into producing different Czech.
 */

export type GlossaryTerm = { term: string; why?: string; note?: string };

export type Glossary = {
  doNotTranslate: GlossaryTerm[];
  translateConsistently: GlossaryTerm[];
  voice: string;
};

/**
 * Fields that tier 2 is NOT allowed to translate.
 *
 * Decided 2026-08-14. Machine-translating a claim about evidence into a
 * language nobody on the project can read is how this site publishes something
 * it cannot stand behind. These stay in English with a visible notice, and
 * tier-2 pages carry noindex so a thin machine rendering never competes with
 * the reviewed one in search.
 */
export const TIER2_FORBIDDEN_FIELDS = [
  'evidenceSummary',
  'notableDivergence',
  'ourTake',
  'longIntro',
  'articleBody',
] as const;

export function buildTranslationPrompt(options: {
  targetLocale: string;
  targetLanguageName: string;
  namespace: string;
  glossary: Glossary;
  source: unknown;
}): string {
  const { targetLocale, targetLanguageName, namespace, glossary, source } = options;

  const doNot = glossary.doNotTranslate
    .map((t) => `- ${t.term}${t.why ? ` (${t.why})` : ''}`)
    .join('\n');

  const consistent = glossary.translateConsistently
    .map((t) => `- ${t.term}${t.note ? ` - ${t.note}` : ''}`)
    .join('\n');

  return `You are translating the user interface of an independent, evidence-based resource about what is in fast food. Target language: ${targetLanguageName} (${targetLocale}). Namespace: ${namespace}.

VOICE
${glossary.voice}

NEVER TRANSLATE THESE
${doNot}

TRANSLATE THESE CONSISTENTLY, EVERY TIME
${consistent}

HARD RULES
1. Return JSON only. No prose before or after, no markdown fence.
2. The output must have EXACTLY the same key structure as the input. Same keys, same nesting, same number of leaves. Do not add a key. Do not drop a key. Do not reorder nesting.
3. ICU placeholders such as {count}, {value}, {market} must appear in the output with identical names. You may move them within a sentence to suit the grammar. You may not rename, add or remove one.
4. ICU plural and select blocks keep their syntax. Use the plural categories the target language actually has - do not copy English's two-form structure into a language with more.
5. Translate meaning, not word order. A stiff literal rendering of this voice is a failed translation.
6. If the source states a limitation, an uncertainty or a refusal, the translation states it with the same force. Never soften "not published" into something that sounds like zero. Never strengthen a hedged claim.
7. Do not add advice, warnings, encouragement or politeness the source does not contain.

SOURCE JSON
${JSON.stringify(source, null, 2)}`;
}
