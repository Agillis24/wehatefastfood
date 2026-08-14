/**
 * WCAG 2.2 contrast audit for the We Hate Fast Food palette.
 * Every ratio quoted in docs/BRAND.md comes from this file. Never estimate a ratio.
 *   node scripts/contrast.mjs
 */

const lin = (c) => {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};
const L = (hex) => {
  const h = hex.replace('#', '');
  return (
    0.2126 * lin(parseInt(h.slice(0, 2), 16)) +
    0.7152 * lin(parseInt(h.slice(2, 4), 16)) +
    0.0722 * lin(parseInt(h.slice(4, 6), 16))
  );
};
const CR = (a, b) => {
  const la = L(a),
    lb = L(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

// --- The palette, as extracted from brand/*.svg ---
export const PALETTE = {
  pink: '#FF2D62', // brand accent. avatar ground, HATE, strike stroke
  paper: '#F6F2E8', // cream. heart fill, light ground, type on dark
  ink: '#16120F', // near-black. dark ground, type on light, patty band
  greyDark: '#8C8377', // struck-out LOVE on the ink ground
  greyLight: '#B9B2A4', // struck-out LOVE on paper; tagline on ink
  white: '#FFFFFF', // mono avatar only, never in the UI
};

const AA_BODY = 4.5,
  AA_LARGE = 3.0,
  AA_NONTEXT = 3.0;
const pad = (s, n) => String(s).padEnd(n);
const f = (n) => n.toFixed(2).padStart(6);

function row(label, fg, bg, need = AA_BODY) {
  const r = CR(fg, bg);
  const ok = r >= need;
  const note =
    need === AA_BODY
      ? ok
        ? 'AA body'
        : r >= AA_LARGE
          ? 'large/non-text only'
          : 'FAIL'
      : ok
        ? 'AA non-text'
        : 'FAIL';
  console.log(`  ${pad(label, 34)} ${f(r)}:1  ${ok ? 'PASS' : 'FAIL'}  ${note}`);
  return { label, ratio: r, ok };
}

const P = PALETTE;

console.log('\n=== LIGHT SURFACE: paper #F6F2E8 (the website) ===');
row('ink text', P.ink, P.paper);
row('pink text', P.pink, P.paper);
row('greyLight text', P.greyLight, P.paper);
row('greyDark text', P.greyDark, P.paper);
row('pink as rule/icon/focus', P.pink, P.paper, AA_NONTEXT);

console.log('\n=== DARK SURFACE: ink #16120F (video, YouTube, dark UI) ===');
row('paper text', P.paper, P.ink);
row('pink text', P.pink, P.ink);
row('greyLight text', P.greyLight, P.ink);
row('greyDark text', P.greyDark, P.ink);

console.log('\n=== PINK SURFACE: #FF2D62 (avatar ground, marker highlight) ===');
row('ink text', P.ink, P.pink);
row('paper text', P.paper, P.pink);

console.log('\n=== TRAFFIC LIGHTS: separation from brand pink is the constraint ===');
const CANDIDATES = {
  'HIGH #B3261E': '#B3261E',
  'HIGH #8C1D18': '#8C1D18',
  'HIGH #7A1410': '#7A1410',
  'MED  #F0A500': '#F0A500',
  'MED  #D98C00': '#D98C00',
  'LOW  #1E6E3C': '#1E6E3C',
  'LOW  #1B5E34': '#1B5E34',
};
console.log('  chip           ink-on  paper-on  vs-paper-bg  vs-ink-bg  SEPARATION-vs-PINK');
for (const [name, hex] of Object.entries(CANDIDATES)) {
  console.log(
    `  ${pad(name, 14)}${f(CR(P.ink, hex))} ${f(CR(P.paper, hex))}   ${f(CR(hex, P.paper))}   ${f(CR(hex, P.ink))}      ${f(CR(hex, P.pink))}`,
  );
}

console.log('\n=== LOGO INTERNALS (non-text, need 3:1 to hold their edges) ===');
row('heart paper on pink ground', P.paper, P.pink, AA_NONTEXT);
row('patty ink on heart paper', P.ink, P.paper, AA_NONTEXT);
row('slash ink on pink ground', P.ink, P.pink, AA_NONTEXT);
row('dark-avatar pink patty on paper', P.pink, P.paper, AA_NONTEXT);
console.log('');
