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
      cs: `Ahoj. Jsme We Hate Fast Food.

Budeme rozebírat, co je doopravdy v jídle, které si koupíš u okýnka. Složku po složce. Éčko po éčku.

Nic z toho není tajné. Firmy to musí zveřejnit. Jenom to nikdo nečte, protože je to schované v PDF a vysázené tak, aby se to číst nedalo.

Tak to přečteme za tebe.

Sleduj nás. Teď to teprve začíná.`,
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
      cs: `O čem to bude.

Fast food není jídlo, které by ti někdo uvařil. Je to výrobek. Navržený tak, aby byl levný, vydržel a chutnal všude stejně. Podle toho vypadá i složení.

Sůl, cukr, tuk a dlouhý seznam látek, které tam nejsou kvůli chuti, ale kvůli výrobě. Zdravé to není a nikdo to ani netvrdí. Jenom se o tom nemluví nahlas.

My budeme.`,
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
      cs: `Na koho máme vztek.

Na firmy, ne na tebe. Na receptury stavěné kolem ceny a trvanlivosti. Na porce, které vyrostly, zatímco cena zůstala povědomá. Na reklamu, která utratí za slovo „čerstvé" víc než kuchyně.

Jestli to jíš, nic ti vyčítat nebudeme. Je to levné, rychlé a často jediné, co je po ruce.

Všechno najdeš na wehatefastfood.com. Jsme i na YouTube a na Facebooku. Sleduj nás všude, ať ti nic neuteče.`,
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
