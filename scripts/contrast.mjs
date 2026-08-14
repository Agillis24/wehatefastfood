const lin = c => { c /= 255; return c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); };
const L = hex => { const h = hex.replace('#',''); const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
  return 0.2126*lin(r) + 0.7152*lin(g) + 0.0722*lin(b); };
const CR = (a,b) => { const la = L(a), lb = L(b); const hi = Math.max(la,lb), lo = Math.min(la,lb); return (hi+0.05)/(lo+0.05); };
const f = n => n.toFixed(2);
const verdict = (r, kind) => {
  if (kind === 'body') return r >= 4.5 ? 'AA body OK' : (r >= 3 ? 'FAIL body / OK large+UI' : 'FAIL');
  if (kind === 'ui')   return r >= 3   ? 'AA non-text OK' : 'FAIL non-text';
  return '';
};
const BEIGE='#f6f2e8', INK='#16120f', PINK='#ff2d62';
const pairs = [
  ['ink on beige',            INK,   BEIGE, 'body'],
  ['pink on beige (as TEXT)', PINK,  BEIGE, 'body'],
  ['ink on pink (pink FILL)', INK,   PINK,  'body'],
  ['beige on pink',           BEIGE, PINK,  'body'],
  ['pink vs beige (UI edge)', PINK,  BEIGE, 'ui'],
];
console.log('--- base palette ---');
for (const [n,a,b,k] of pairs) { const r = CR(a,b); console.log(`${n.padEnd(28)} ${f(r).padStart(6)}:1   ${verdict(r,k)}`); }

console.log('\n--- candidate traffic lights on beige ground ---');
const cands = {
  'HIGH  #B3261E (orig)': '#B3261E',
  'HIGH  #8C1D18 (oxblood)': '#8C1D18',
  'HIGH  #7A1410 (deeper)': '#7A1410',
  'MED   #F0A500': '#F0A500',
  'MED   #D98C00': '#D98C00',
  'LOW   #1E6E3C': '#1E6E3C',
  'LOW   #1B5E34': '#1B5E34',
};
for (const [n,hex] of Object.entries(cands)) {
  const onBeige = CR(hex, BEIGE), wInk = CR(INK, hex), wPaper = CR(BEIGE, hex), vsPink = CR(hex, PINK);
  console.log(`${n.padEnd(24)} edge-vs-beige ${f(onBeige).padStart(5)}  ink-on ${f(wInk).padStart(5)}  paper-on ${f(wPaper).padStart(5)}  SEPARATION-vs-PINK ${f(vsPink).padStart(5)}`);
}
console.log('\n--- muted candidates on beige (need >=4.5 body) ---');
for (const m of ['#6B6355','#5C5648','#736A5C','#4F4A3E']) console.log(`${m}  ${f(CR(m,BEIGE))}:1`);
