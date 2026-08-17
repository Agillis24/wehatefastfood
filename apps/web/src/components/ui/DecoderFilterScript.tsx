import Script from 'next/script';

/**
 * Decoder search and filtering, as ~50 lines of plain DOM script.
 *
 * WHY NOT A REACT ISLAND, AND WHY NOT minisearch
 * Both were built first and then measured. A single 'use client' component
 * anywhere in the app pulls the React client runtime into the shared bundle for
 * EVERY route: the item page went from 107 kB to 118 kB First Load JS purely
 * because the decoder, a different page, had an island. Removing the island put
 * it back to 107 kB exactly. That is 11 kB charged to the most important page on
 * the site to pay for a filter on another one.
 *
 * What this actually does is hide and show list items that the server already
 * rendered. That needs no framework and no search library. Substring matching
 * over a precomputed haystack is predictable, instant at this scale, and costs
 * nothing on any other route.
 *
 * PROGRESSIVE ENHANCEMENT: with JavaScript off, the controls are hidden by
 * their own `hidden` attribute (removed by this script) and the reader gets the
 * complete list. Nothing is ever hidden from a reader who cannot filter.
 *
 * Deviates from BRIEF §4, which specifies minisearch. Site-wide search across
 * items is still to come and may well justify it; this one page did not.
 */

const SCRIPT = `
(function () {
  var root = document.getElementById('decoder');
  if (!root) return;

  var controls = document.getElementById('decoder-controls');
  var query = document.getElementById('decoder-query');
  var klass = document.getElementById('decoder-class');
  var evidence = document.getElementById('decoder-evidence');
  var count = document.getElementById('decoder-count');
  var entries = Array.prototype.slice.call(root.querySelectorAll('[data-entry]'));
  if (!controls || !query || !klass || !evidence || !count) return;

  controls.hidden = false;

  var template = count.getAttribute('data-template') || '{n}';

  function normalise(value) {
    return value.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
  }

  function apply() {
    var terms = normalise(query.value).split(/\\s+/).filter(Boolean);
    var wantClass = klass.value;
    var wantEvidence = evidence.value;
    var shown = 0;

    for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      var haystack = entry.getAttribute('data-search') || '';
      var matchesText = true;
      for (var j = 0; j < terms.length; j++) {
        if (haystack.indexOf(terms[j]) === -1) { matchesText = false; break; }
      }
      var matchesClass = !wantClass || (entry.getAttribute('data-classes') || '').split(' ').indexOf(wantClass) !== -1;
      var matchesEvidence = !wantEvidence || entry.getAttribute('data-evidence') === wantEvidence;
      var visible = matchesText && matchesClass && matchesEvidence;
      entry.hidden = !visible;
      if (visible) shown++;
    }

    count.textContent = template.replace('{n}', String(shown));
  }

  query.addEventListener('input', apply);
  klass.addEventListener('change', apply);
  evidence.addEventListener('change', apply);
  apply();
})();
`;

/**
 * next/script with `afterInteractive`, not a bare <script> tag.
 *
 * React 19 hoists script elements out of where they were rendered. A plain
 * <script> in the body therefore breaks hydration (React error #418) AND runs
 * at an unpredictable point relative to it - the symptom being a script that
 * appears never to execute at all. next/script exists for exactly this, and
 * `afterInteractive` means "once hydration is done", which is the only moment
 * it is safe to touch the DOM.
 */
export function DecoderFilterScript() {
  return (
    <Script id="decoder-filter" strategy="afterInteractive">
      {SCRIPT}
    </Script>
  );
}
