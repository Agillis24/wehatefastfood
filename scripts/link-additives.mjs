/**
 * Connect decoder entries to the food they are actually in.
 *
 *   node scripts/link-additives.mjs           report only
 *   node scripts/link-additives.mjs --write   set additiveRefs
 *
 * An entry in the decoder is a reference page. An entry LINKED to an item is the
 * thing this site is for: here is what is in it, and here is why the company put
 * it there. Nothing links until the ingredient declarations and the decoder
 * overlap, and for a long time they did not - the decoder held two substances
 * that appear in nothing the repo holds.
 *
 * NO MAPPING TABLE. Matching is against each additive's own `names`, so an entry
 * declares its own synonyms and links appear the moment it lands. A separate
 * table would be a third place to keep in step with the other two.
 *
 * MATCHING IS EXACT, ON A WHOLE SUBSTANCE. "Sodium Nitrite" and "Sodium Nitrate"
 * differ by two letters and are different substances with different entries;
 * substring matching would put the wrong page on somebody's bacon. So a
 * declaration is split into the substances it names and each is compared whole.
 *
 * ONLY WHAT THE DECLARATION CALLS AN ADDITIVE. A substance counts when it
 * follows a functional-class marker - "preservative: Sodium Nitrite". Where the
 * class stops applying is not marked in these declarations, so only the
 * substance immediately after the colon is taken. That UNDER-counts: a class
 * introducing two substances loses the second. Under-counting links to less than
 * is there and never to something that is not, which is the right direction to
 * be wrong in.
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const WRITE = process.argv.includes('--write');

const CLASSES = [
  'acidity regulators?',
  'stabilisers?',
  'antioxidants?',
  'preservatives?',
  'emulsifiers?',
  'colours?',
  'colouring',
  'flavour enhancers?',
  'thickeners?',
  'raising agents?',
  'anticaking agents?',
  'humectants?',
  'firming agents?',
  'sweeteners?',
  'acids?',
  /*
   * The Czech names for the same classes. Without them this script could not
   * match a single Czech declaration whatever else it did, and Czech
   * declarations are now most of what this site holds.
   */
  'regul[áa]tor kyselosti',
  'stabiliz[áa]tor(?:y)?',
  'antioxidant(?:y)?',
  'konzervant(?:y)?',
  'emulg[áa]tor(?:y)?',
  'emulga[čc]n[íi] soli',
  'barvivo',
  'barviva',
  'zv[ýy]raz[ňn]ova[čc] chuti',
  'zahu[šs][ťt]ovadlo',
  'kyp[řr]ic[íi] l[áa]tk(?:a|y)',
  'protisp[ée]kav[áa] l[áa]tka',
  'zvlh[čc]uj[íi]c[íi] l[áa]tka',
  'sladidlo',
  'kyselina',
  'odp[ěe][ňn]ova[čc]',
].join('|');

/*
 * TWO SHAPES, NOT ONE. English declarations write "antioxidant: tocopherols";
 * Czech ones write "regulátor kyselosti (hydrogenuhličitan sodný)". Only the
 * colon form was recognised, so every Czech declaration read as carrying no
 * additives at all. The parenthesised form stops at the closing bracket, which
 * the colon form must not do - "tokoferol (E306)" is one substance there.
 */
const NAMED_COLON = new RegExp(String.raw`\b(?:${CLASSES})\s*:\s*([^,;.]+)`, 'gi');
const NAMED_PAREN = new RegExp(String.raw`\b(?:${CLASSES})\s*\(\s*([^(),;]+)\)`, 'gi');

/*
 * Czech letters are FOLDED, not deleted. Stripping everything outside [a-z0-9]
 * turned "hydrogenuhličitan sodný" into "hydrogenuhli itan sodn ", so a Czech
 * synonym in the decoder could never match a Czech declaration no matter what
 * either of them said.
 */
const FOLD = {
  á: 'a',
  č: 'c',
  ď: 'd',
  é: 'e',
  ě: 'e',
  í: 'i',
  ň: 'n',
  ó: 'o',
  ř: 'r',
  š: 's',
  ť: 't',
  ú: 'u',
  ů: 'u',
  ý: 'y',
  ž: 'z',
};
const norm = (s) =>
  s
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[áčďéěíňóřšťúůýž]/g, (c) => FOLD[c] ?? c)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

// --- the decoder's own vocabulary -----------------------------------------
const additivesDir = path.join(ROOT, 'content', 'additives');
const bySynonym = new Map();
let additiveCount = 0;
for (const file of readdirSync(additivesDir)) {
  const a = JSON.parse(readFileSync(path.join(additivesDir, file), 'utf8'));
  additiveCount += 1;
  for (const name of [...a.names, a.eNumber].filter(Boolean)) {
    const k = norm(name);
    if (k) bySynonym.set(k, a.slug);
  }
}

// --- what the declarations name -------------------------------------------
const itemsDir = path.join(ROOT, 'content', 'items');
const unmatched = new Map();
const linked = [];
let changed = 0;

for (const chain of readdirSync(itemsDir)) {
  for (const file of readdirSync(path.join(itemsDir, chain))) {
    const full = path.join(itemsDir, chain, file);
    const rec = JSON.parse(readFileSync(full, 'utf8'));
    let touched = false;

    for (const variant of rec.variants) {
      const refs = new Set();
      for (const comp of variant.components ?? []) {
        const hits = [
          ...comp.declaration.matchAll(NAMED_COLON),
          ...comp.declaration.matchAll(NAMED_PAREN),
        ];
        for (const m of hits) {
          const substance = m[1].trim();
          const slug = bySynonym.get(norm(substance));
          if (slug) {
            refs.add(slug);
            linked.push({ item: `${chain}/${rec.slug}`, substance, slug });
          } else {
            const k = norm(substance);
            if (!unmatched.has(k)) unmatched.set(k, { name: substance, items: new Set() });
            unmatched.get(k).items.add(`${chain}/${rec.slug}`);
          }
        }
      }
      const next = [...refs].sort();
      if (JSON.stringify(next) !== JSON.stringify(variant.additiveRefs)) {
        variant.additiveRefs = next;
        touched = true;
      }
    }

    if (touched) {
      changed += 1;
      if (WRITE) writeFileSync(full, JSON.stringify(rec, null, 2) + '\n', 'utf8');
    }
  }
}

console.log(`${WRITE ? 'ZAPSÁNO' : 'NANEČISTO'}`);
console.log(`  hesel v dekodéru: ${additiveCount}  (${bySynonym.size} synonym)`);
console.log(
  `  napojení: ${linked.length}  ve ${new Set(linked.map((l) => l.item)).size} položkách`,
);
console.log(`  položek změněno: ${changed}`);
for (const l of linked.slice(0, 12)) {
  console.log(`     ${l.item.padEnd(34)} ${l.substance.slice(0, 32).padEnd(34)} -> ${l.slug}`);
}

/*
 * The unmatched list is the work queue, in the order that would connect the most
 * food. It is printed every run precisely because it is the useful output while
 * the decoder is still small.
 */
console.log(`\n  bez hesla v dekodéru: ${unmatched.size}`);
for (const [, v] of [...unmatched].sort((a, b) => b[1].items.size - a[1].items.size).slice(0, 15)) {
  console.log(`     ${v.name.slice(0, 40).padEnd(42)} v ${v.items.size} položkách`);
}
