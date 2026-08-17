/**
 * The words that go with the pinned triptych, in posting order.
 *
 * Here rather than in a chat message, and emitted next to the images rather
 * than kept separately, because a caption that lives somewhere else is a
 * caption that gets rewritten from memory at the moment of posting.
 *
 * POSTING ORDER, NOT READING ORDER. The array is ordered the way the posts go
 * up - right tile first - because Instagram fills the grid newest-first from
 * the top left. Each caption therefore has to make sense when it is the ONLY
 * one published: nobody can see the finished banner while the first two are
 * going out, and the third has followers who saw the other two days ago.
 *
 * Voice rules from docs/BRAND.md and docs/LEGAL.md §6 apply here as much as to
 * the site: hostile to the industry, never to the person eating the food. No
 * diets, no good and bad foods, no exercise equivalents, no bodies.
 *
 * ALT TEXT IS NOT OPTIONAL and is not a keyword dump. It describes what is in
 * the picture, for someone who cannot see it. Instagram will auto-generate a
 * far worse one if this is left blank.
 */

export const TRIPTYCH_COPY = [
  {
    file: 'wff-ig-3-right.png',
    position: 'right',
    order: 1,
    alt: {
      en: 'The word FOOD in heavy cream type on a near-black background, with a faint pink diagonal band behind it and the address wehatefastfood.com underneath.',
      cs: 'Slovo FOOD těžkým krémovým písmem na téměř černém pozadí, za ním slabý růžový šikmý pruh a pod tím adresa wehatefastfood.com.',
    },
    caption: {
      en: `Start here.

We read the nutrition disclosures so you do not have to: what is in it, how much of it, and the commercial reason the company put it there. Every figure carries its source and the date a person last checked it.

No diet. No plan. No before-and-after. What you do with the numbers is your business.

Two more pieces of this picture to come.`,
      cs: `Začínáme.

Čteme nutriční údaje za tebe: co v tom je, kolik toho je a jaký obchodní důvod měla firma to tam dát. Každé číslo má svůj zdroj a datum, kdy se na něj naposledy díval člověk.

Žádná dieta. Žádný plán. Žádné „předtím a potom". Co s těmi čísly uděláš, je tvoje věc.

Zbývají dva díly obrázku.`,
    },
  },
  {
    file: 'wff-ig-2-centre.png',
    position: 'centre',
    order: 2,
    alt: {
      en: 'The word FAST in heavy cream type on a near-black background, with a faint pink diagonal band behind it and the line "What’s actually in it — and why they put it there" underneath.',
      cs: 'Slovo FAST těžkým krémovým písmem na téměř černém pozadí, za ním slabý růžový šikmý pruh a pod tím věta „What’s actually in it — and why they put it there".',
    },
    caption: {
      en: `Piece two.

None of this is secret. It is published, because the law says it has to be. It is also scattered across country-specific PDFs, buried under marketing copy, given per 100 g when you are eating 340 g, and set in type that would embarrass a pharmacist.

We do the boring part.`,
      cs: `Druhý díl.

Nic z toho není tajné. Zveřejňuje se to, protože to ukládá zákon. Zároveň je to rozeseté po PDF zvlášť pro každou zemi, schované pod marketingovým textem, uvedené na 100 g, když sníš 340 g, a vysázené písmem, za které by se styděla i lékárna.

My děláme tu nudnou část.`,
    },
  },
  {
    file: 'wff-ig-1-left.png',
    position: 'left',
    order: 3,
    alt: {
      en: 'The words WE LOVE struck through with a heavy cream bar, and HATE written across the strike at an angle in bright pink, on a near-black background. The handle @wehatefastfood sits underneath.',
      cs: 'Slova WE LOVE přeškrtnutá silnou krémovou čarou a přes škrt napsané šikmo jasně růžové HATE, na téměř černém pozadí. Pod tím je @wehatefastfood.',
    },
    caption: {
      en: `And that is the picture.

We are hostile to an industry: to recipes designed around cost and shelf life, to portions that grew while the price stayed familiar, to marketing that spends more on the word "fresh" than the kitchen does.

We are not hostile to anyone eating the food. It is cheap, it is fast, it is everywhere, and often it is the only thing within reach.

The snark points up.`,
      cs: `A je to celé.

Jsme nepřátelští vůči odvětví: vůči recepturám stavěným kolem ceny a trvanlivosti, vůči porcím, které vyrostly, zatímco cena zůstala povědomá, vůči marketingu, který utratí za slovo „čerstvé" víc než kuchyně.

Nejsme nepřátelští vůči nikomu, kdo to jí. Je to levné, rychlé, všude a často je to jediné, co je po ruce.

Rýpeme směrem nahoru.`,
    },
  },
];

/**
 * Kept short and on-topic on purpose.
 *
 * A wall of tags reads as reach-buying, which is the opposite of what a site
 * asking to be believed on its sourcing wants to look like. None of these
 * names a company: docs/LEGAL.md §1 allows a brand name to identify a product
 * under discussion, and a hashtag identifies nothing - it just borrows an
 * audience.
 */
export const HASHTAGS = {
  en: '#fastfood #nutrition #foodlabels #ingredients #additives #foodpolitics #ultraprocessed',
  cs: '#fastfood #výživa #složení #etikety #aditiva #éčka #jídlo',
};
