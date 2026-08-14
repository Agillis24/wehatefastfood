/**
 * Can two colours be TOLD APART? - which is a different question from
 * `scripts/contrast.mjs`, and the one that actually matters for the traffic
 * lights.
 *
 * WHY THIS EXISTS
 * docs/BRAND.md originally justified the FSA red by its WCAG contrast ratio
 * against the brand pink, requiring 3.00:1 as "separation". That instrument is
 * wrong for the job. WCAG contrast is a ratio of relative luminance - it
 * measures LIGHTNESS DIFFERENCE and knows nothing about hue. The control case
 * proves it: #FF0000 and #7A0000 are the same hue, 0.0 degrees apart, and score
 * 2.87:1 - indistinguishable, by that metric, from a "passing" pair.
 *
 * So we measure perceptual difference (CIEDE2000) under normal vision AND under
 * simulated protanopia, deuteranopia and tritanopia, and we report the WORST
 * case. A palette is only as safe as its worst pair for its worst reader.
 *
 *   node scripts/color-separation.mjs
 *
 * Dichromat simulation: Vienot, Brettel & Mollon (1999), applied in linear RGB.
 * Difference metric: CIEDE2000 (Sharma, Wu & Dalal 2005 formulation).
 */

import { pathToFileURL } from 'node:url';

// ---------------------------------------------------------------- conversions

const toLinear = (c) => {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

const toSrgb = (c) => {
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(Math.max(c, 0), 1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, v)) * 255);
};

const parse = (hex) => {
  const h = hex.replace('#', '');
  return [
    toLinear(parseInt(h.slice(0, 2), 16)),
    toLinear(parseInt(h.slice(2, 4), 16)),
    toLinear(parseInt(h.slice(4, 6), 16)),
  ];
};

const format = (lin) => `#${lin.map((c) => toSrgb(c).toString(16).padStart(2, '0')).join('')}`;

// ------------------------------------------------- dichromat simulation (1999)

/** Applied to LINEAR rgb. Each row is a linear combination of the input channels. */
const DICHROMAT = {
  protan: [
    [0, 2.02344, -2.52581],
    [0, 1, 0],
    [0, 0, 1],
  ],
  deutan: [
    [1, 0, 0],
    [0.494207, 0, 1.24827],
    [0, 0, 1],
  ],
  tritan: [
    [1, 0, 0],
    [0, 1, 0],
    [-0.395913, 0.801109, 0],
  ],
};

function simulate(lin, kind) {
  if (kind === 'normal') return lin;
  const m = DICHROMAT[kind];
  return m.map((row) => row[0] * lin[0] + row[1] * lin[1] + row[2] * lin[2]);
}

// ------------------------------------------------------------------ Lab, dE00

function linToLab([r, g, b]) {
  const X = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
  const Y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const Z = 0.0193339 * r + 0.119192 * g + 0.9503041 * b;

  // D65
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t) / 116 + 16 / 116);
  const fx = f(X / 0.95047);
  const fy = f(Y / 1.0);
  const fz = f(Z / 1.08883);

  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

const deg = (r) => (r * 180) / Math.PI;
const rad = (d) => (d * Math.PI) / 180;

/** CIEDE2000. Sharma, Wu & Dalal (2005). */
function deltaE00([L1, a1, b1], [L2, a2, b2]) {
  const kL = 1,
    kC = 1,
    kH = 1;

  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cbar = (C1 + C2) / 2;

  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cbar, 7) / (Math.pow(Cbar, 7) + Math.pow(25, 7))));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;

  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);

  const h1p = C1p === 0 ? 0 : (deg(Math.atan2(b1, a1p)) + 360) % 360;
  const h2p = C2p === 0 ? 0 : (deg(Math.atan2(b2, a2p)) + 360) % 360;

  const dLp = L2 - L1;
  const dCp = C2p - C1p;

  let dhp;
  if (C1p * C2p === 0) dhp = 0;
  else if (Math.abs(h2p - h1p) <= 180) dhp = h2p - h1p;
  else if (h2p - h1p > 180) dhp = h2p - h1p - 360;
  else dhp = h2p - h1p + 360;

  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(rad(dhp) / 2);

  const Lbarp = (L1 + L2) / 2;
  const Cbarp = (C1p + C2p) / 2;

  let hbarp;
  if (C1p * C2p === 0) hbarp = h1p + h2p;
  else if (Math.abs(h1p - h2p) <= 180) hbarp = (h1p + h2p) / 2;
  else if (h1p + h2p < 360) hbarp = (h1p + h2p + 360) / 2;
  else hbarp = (h1p + h2p - 360) / 2;

  const T =
    1 -
    0.17 * Math.cos(rad(hbarp - 30)) +
    0.24 * Math.cos(rad(2 * hbarp)) +
    0.32 * Math.cos(rad(3 * hbarp + 6)) -
    0.2 * Math.cos(rad(4 * hbarp - 63));

  const dTheta = 30 * Math.exp(-Math.pow((hbarp - 275) / 25, 2));
  const Rc = 2 * Math.sqrt(Math.pow(Cbarp, 7) / (Math.pow(Cbarp, 7) + Math.pow(25, 7)));
  const Sl = 1 + (0.015 * Math.pow(Lbarp - 50, 2)) / Math.sqrt(20 + Math.pow(Lbarp - 50, 2));
  const Sc = 1 + 0.045 * Cbarp;
  const Sh = 1 + 0.015 * Cbarp * T;
  const Rt = -Math.sin(rad(2 * dTheta)) * Rc;

  return Math.sqrt(
    Math.pow(dLp / (kL * Sl), 2) +
      Math.pow(dCp / (kC * Sc), 2) +
      Math.pow(dHp / (kH * Sh), 2) +
      Rt * (dCp / (kC * Sc)) * (dHp / (kH * Sh)),
  );
}

// ------------------------------------------------------------------- the tool

const VISIONS = ['normal', 'protan', 'deutan', 'tritan'];

/** Worst-case CIEDE2000 across normal and all three dichromacies. */
export function separation(hexA, hexB) {
  const a = parse(hexA);
  const b = parse(hexB);
  const per = {};
  for (const v of VISIONS) {
    per[v] = deltaE00(linToLab(simulate(a, v)), linToLab(simulate(b, v)));
  }
  const worstVision = VISIONS.reduce((w, v) => (per[v] < per[w] ? v : w), 'normal');
  return { per, worst: per[worstVision], worstVision };
}

/**
 * Thresholds. CIEDE2000 was designed so that 1.0 is roughly one just-noticeable
 * difference under reference conditions. On a phone, in daylight, at chip size,
 * with the two colours not adjacent, the usable floor is far higher.
 */
const JND = 2.3;
const RISKY = 10;

function verdict(dE) {
  if (dE < JND) return 'SAME COLOUR to this reader';
  if (dE < 5) return 'CONFUSABLE';
  if (dE < RISKY) return 'weak';
  return 'ok';
}

// --------------------------------------------------------------------- report

const PALETTE = {
  pink: '#FF2D62',
  paper: '#F6F2E8',
  ink: '#16120F',
  'tl-high': '#B5301F',
  'tl-med': '#D98C00',
  'tl-low': '#1B5E34',
};

const runDirectly =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (runDirectly) {
  console.log('\n=== CONTROL: why WCAG contrast cannot answer this question ===');
  const control = separation('#FF0000', '#7A0000');
  console.log(
    `  #FF0000 vs #7A0000 - identical hue, and WCAG scores them 2.87:1.\n` +
      `  Worst-case dE2000: ${control.worst.toFixed(1)} (${control.worstVision})  ->  ${verdict(control.worst)}`,
  );

  console.log('\n=== The pairs that carry meaning ===');
  console.log('  pair'.padEnd(34) + 'normal  protan  deutan  tritan   WORST   verdict');

  const bands = ['tl-high', 'tl-med', 'tl-low'];
  const pairs = [];
  // Each band against the brand accent: can a warning be mistaken for identity?
  for (const band of bands) pairs.push([band, 'pink']);
  // Each band against every other: can the three levels be told apart?
  for (let i = 0; i < bands.length; i += 1) {
    for (let j = i + 1; j < bands.length; j += 1) pairs.push([bands[i], bands[j]]);
  }
  // Each band against the surfaces it is drawn on: does the chip hold its edge?
  for (const band of bands) {
    pairs.push([band, 'paper']);
    pairs.push([band, 'ink']);
  }
  pairs.push(['pink', 'paper']);
  pairs.push(['pink', 'ink']);

  let worstOverall = { worst: Infinity };
  for (const [x, y] of pairs) {
    const s = separation(PALETTE[x], PALETTE[y]);
    if (s.worst < worstOverall.worst) worstOverall = { ...s, x, y };
    const cells = VISIONS.map((v) => s.per[v].toFixed(1).padStart(6)).join('  ');
    console.log(
      `  ${`${x} vs ${y}`.padEnd(32)}${cells}  ${s.worst.toFixed(1).padStart(6)}   ${verdict(s.worst)}`,
    );
  }

  console.log(
    `\n  Worst pair in the palette: ${worstOverall.x} vs ${worstOverall.y} ` +
      `at dE ${worstOverall.worst.toFixed(1)} under ${worstOverall.worstVision}.`,
  );
  console.log(
    `  A palette is only as safe as its worst pair for its worst reader.\n` +
      `  Below ${JND} the two colours are the same colour to that reader.\n`,
  );

  console.log('=== How the dichromat sees the palette ===');
  for (const [name, hex] of Object.entries(PALETTE)) {
    const sims = VISIONS.slice(1)
      .map((v) => `${v} ${format(simulate(parse(hex), v))}`)
      .join('   ');
    console.log(`  ${name.padEnd(10)} ${hex}   ${sims}`);
  }
  console.log('');
}
