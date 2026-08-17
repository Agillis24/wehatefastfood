import Script from 'next/script';

/**
 * Compare, on a statically exported site.
 *
 * The selection lives in the URL **hash**, not the path:
 *
 *   /en/compare/#GB/example-burger-co~example-double-burger/...~example-fries
 *
 * A hash is never sent to the server, so one static page answers every possible
 * selection. That is the whole trick, and it is what lets a comparison stay
 * shareable on a host that cannot render anything on demand. The previous
 * version put the selection in the path and needed a server.
 *
 * The figures come from compare-index.json, generated at build time by
 * scripts/search-index.mjs, so they are the same numbers as the item pages -
 * there is no second source that could drift.
 *
 * ~90 lines of plain DOM script. No React island: one would cost 11 kB on every
 * other route (docs/ARCHITECTURE.md §3), and this is the only page that needs
 * it.
 *
 * Without JavaScript the page shows its empty state and explains the format.
 * That is honest: a comparison is a query, and this host cannot answer queries
 * server-side.
 */

const SCRIPT = `
(function () {
  /*
   * Runs on window load, NOT at parse time, and looks its elements up on every
   * call.
   *
   * Touching the DOM before React hydrates makes React discard the server HTML,
   * re-render from scratch, and hand back NEW nodes - so anything written
   * earlier is silently lost and any cached element reference is left pointing
   * at a detached node. That failure is invisible: no error, just an empty
   * page. Found by a browser test, not by reading the code.
   */

  function parse() {
    var raw = decodeURIComponent((location.hash || '').replace(/^#/, ''));
    var parts = raw.split('/').filter(Boolean);
    return { market: (parts[0] || 'GB').toUpperCase(), items: parts.slice(1, 4) };
  }

  function cell(value, unit, notPublished) {
    if (value === null || value === undefined) return notPublished;
    return unit === 'kcal' ? String(Math.round(value)) : String(value) + ' g';
  }

  function render(root, empty, LABELS, index, selection) {
    var rows = ['energy', 'fat', 'saturates', 'sugars', 'salt'];
    var keys = { energy: 'kcal', fat: 'fat', saturates: 'sat', sugars: 'sugar', salt: 'salt' };
    var units = { energy: 'kcal', fat: 'g', saturates: 'g', sugars: 'g', salt: 'g' };

    var chosen = selection.items.map(function (id) {
      return index[id + '/' + selection.market] || { missing: id };
    });

    var html = '<p class="font-data text-xs uppercase tracking-widest">' +
      LABELS.market + ': <span data-numeric>' + selection.market + '</span></p>';

    html += '<div class="overflow-x-auto"><table class="w-full min-w-[32rem] border-collapse">';
    html += '<caption class="sr-only">' + LABELS.title + '</caption><thead><tr>';
    html += '<th scope="col" class="sticky start-0 bg-[var(--surface-bg)] py-2 pe-3 text-start">' +
      '<span class="font-data text-xs uppercase tracking-widest">' + LABELS.nutrient + '</span></th>';

    chosen.forEach(function (item) {
      html += '<th scope="col" class="py-2 pe-3 text-start">';
      html += item.missing
        ? '<span class="text-sm">' + LABELS.unknown.replace('{slug}', item.missing) + '</span>'
        : '<a class="font-display text-lg font-extrabold underline decoration-pink decoration-2" href="' +
          item.path + '/">' + item.title + '</a>';
      html += '</th>';
    });
    html += '</tr></thead><tbody>';

    rows.forEach(function (row) {
      var values = chosen.map(function (item) {
        return item.missing ? null : item[keys[row]];
      });
      var max = Math.max.apply(null, values.map(function (v) { return v || 0; }).concat([0]));

      html += '<tr class="border-t border-[var(--surface-rule)]/40">';
      html += '<th scope="row" class="sticky start-0 bg-[var(--surface-bg)] py-3 pe-3 text-start text-sm font-medium">' +
        LABELS.rows[row] + '</th>';

      values.forEach(function (value) {
        html += '<td class="py-3 pe-3 align-top"><span class="font-data block text-sm" data-numeric>' +
          cell(value, units[row], LABELS.notPublished) + '</span>';
        if (value !== null && value !== undefined && max > 0) {
          html += '<span data-viz aria-hidden="true" class="mt-1 block h-2 bg-pink" style="inline-size:' +
            Math.max((value / max) * 100, 2) + '%"></span>';
        }
        html += '</td>';
      });
      html += '</tr>';
    });

    html += '</tbody></table></div>';
    root.innerHTML = html;
    empty.hidden = true;
  }

  function run() {
    var root = document.getElementById('compare-result');
    var empty = document.getElementById('compare-empty');
    if (!root || !empty) return;

    var LABELS = JSON.parse(root.getAttribute('data-labels') || '{}');
    var selection = parse();

    if (selection.items.length === 0) {
      empty.hidden = false;
      root.innerHTML = '';
      return;
    }

    fetch('/compare-index.json')
      .then(function (r) { return r.json(); })
      .then(function (index) { render(root, empty, LABELS, index.items || {}, selection); })
      .catch(function () { empty.hidden = false; });
  }

  window.addEventListener('hashchange', run);
  run();
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
export function CompareScript() {
  return (
    <Script id="compare-hash" strategy="afterInteractive">
      {SCRIPT}
    </Script>
  );
}
