import { expect, test } from '@playwright/test';

/*
 * This suite was written against content/_seed/ and against a bilingual site,
 * and both of those went away on the same day: the seed was deleted when the
 * first real chain shipped, and `en` was withdrawn when the site became
 * Czech-first. Every test here referred to EXAMPLE BURGER CO under /en/, so the
 * whole file had been failing silently - `npm run check` runs the unit tests
 * and not this suite, and nothing else was watching.
 *
 * It now runs against real content in the one locale the site offers. Two
 * consequences worth stating rather than discovering later:
 *
 *   - Assertions are on Czech strings, which are the strings a reader sees. A
 *     test asserting English on a Czech-only site tests nothing.
 *   - The market pair is US/CA, because those are the markets we hold. The
 *     item is Egg McMuffin precisely because it holds BOTH, which is what makes
 *     the market switch testable at all.
 */

/** Real, and holds two markets - which is why the market tests can exist. */
const ITEM = '/cs/chains/mcdonalds/egg-mcmuffin/US/';

test('home to chain to item', async ({ page }) => {
  await page.goto('/cs/');
  await page
    .getByRole('link', { name: /Řetězce/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/cs\/chains/);
  await page
    .getByRole('link', { name: /McDonald/i })
    .first()
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('McDonald');
});

test('switching market changes the numbers AND the URL', async ({ page }) => {
  // The whole reason market is a path segment: a shared link must show the
  // recipient the same figures as the sender.
  await page.goto(ITEM);
  await expect(page).toHaveURL(/\/US\/$/);
  await page.getByRole('link', { name: 'CA', exact: true }).click();
  await expect(page).toHaveURL(/\/CA\/$/);
});

test('the two markets really do carry different figures', async ({ page }) => {
  /*
   * The market switch is only worth having if the markets differ, and for this
   * item they do: the published US Egg McMuffin is 310 kcal and the Canadian
   * one is 290. Asserting the DIFFERENCE rather than either number means the
   * test survives a re-import that corrects both, and fails loudly if the two
   * markets are ever collapsed into one set of figures - which is the mistake
   * this whole axis exists to prevent.
   */
  await page.goto('/cs/chains/mcdonalds/egg-mcmuffin/US/');
  const us = await page.locator('main').innerText();
  await page.goto('/cs/chains/mcdonalds/egg-mcmuffin/CA/');
  const ca = await page.locator('main').innerText();
  expect(us).not.toEqual(ca);
});

test('every traffic light carries a word, not only a colour', async ({ page }) => {
  // Canada, because the FSA bands need a portion weight to compute a per-100 g
  // figure and the American calculator publishes none. On a US page there are
  // legitimately no bands at all - see the next test.
  await page.goto('/cs/chains/mcdonalds/egg-mcmuffin/CA/');
  const table = page.getByRole('table').first();
  await expect(table).toBeVisible();
  const words = await page.getByText(/^(VYSOKÉ|STŘEDNÍ|NÍZKÉ)$/).count();
  expect(words).toBeGreaterThan(0);
});

test('a market with no portion weight shows figures and no bands, rather than guessing', async ({
  page,
}) => {
  /*
   * McDonald's USA publishes figures per portion and no weight at all, so no
   * per-100 g value exists and no band can be computed. The honest outcome is
   * the figures with the bands absent - never a band derived from a portion
   * size we invented.
   */
  await page.goto('/cs/chains/mcdonalds/egg-mcmuffin/US/');
  await expect(page.getByText('310')).toBeVisible();
  expect(await page.getByText(/^(VYSOKÉ|STŘEDNÍ|NÍZKÉ)$/).count()).toBe(0);
});

test('the reality check keeps its sentence when the pictures are off', async ({ page }) => {
  await page.goto(ITEM);
  const sentence = page.getByText(/Tato porce obsahuje .* cukru/);
  await expect(sentence).toBeVisible();
  await page.getByText('Jen čísla').click();
  // Plain mode removes the drawing and never the fact.
  await expect(sentence).toBeVisible();
});

test('an item page carries its disclaimers', async ({ page }) => {
  await page.goto(ITEM);
  // Deliberately present more than once: BRIEF §12 requires the non-affiliation
  // notice on the page AND in the footer, so `.first()` is the assertion, not a
  // workaround for a duplicate.
  await expect(page.getByText(/Nejsme spojeni se žádnou firmou/).first()).toBeVisible();
  await expect(page.getByText(/nejsou lékařská ani výživová doporučení/i).first()).toBeVisible();
  expect(await page.getByText(/Nejsme spojeni se žádnou firmou/).count()).toBeGreaterThanOrEqual(2);
});

test('no exercise-equivalent language anywhere on an item page', async ({ page }) => {
  await page.goto(ITEM);
  const body = (await page.locator('body').innerText()).toLowerCase();
  const banned = [
    // English, in case a string ever lands untranslated.
    'burn it off',
    'burn off',
    'treadmill',
    // Czech, which is what would actually appear.
    'spálit',
    'vyběhat',
    'odběhat',
    'kolik musíte',
  ];
  for (const phrase of banned) {
    expect(body, `"${phrase}" must never appear`).not.toContain(phrase);
  }
});

test('the decoder works without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/cs/decoder/');
  // Every entry is server-rendered; only the controls are hidden.
  await expect(page.getByRole('listitem').first()).toBeVisible();
  await expect(page.locator('#decoder-controls')).toBeHidden();
  await context.close();
});

test('the item page fits 360 px without horizontal scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(ITEM);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});

test('the root redirects into the locale without JavaScript', async ({ browser }) => {
  /*
   * A static export has no middleware, so "/" is a hand-written meta refresh in
   * apps/web/public/index.html - a file that inherits nothing and therefore
   * gets left behind by every change made everywhere else. It was: it went on
   * sending English-preferring browsers to /en/ after /en/ stopped existing.
   * This asserts the destination, not merely that a redirect happened, because
   * "it redirected" was true of the broken version too.
   */
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/');
  await page.waitForURL(/\/cs\/$/, { timeout: 5000 });
  await context.close();
});

test('compare assembles a shareable comparison from the URL hash', async ({ page }) => {
  // The selection is in the hash so ONE static page answers every combination.
  await page.goto('/cs/compare/#US/mcdonalds~egg-mcmuffin/mcdonalds~big-breakfast');
  const table = page.getByRole('table');
  await expect(table).toBeVisible();
  await expect(table).toContainText('Egg McMuffin');
  await expect(table).toContainText('Big Breakfast');
  // Figures come from the build-time index, so they must match the item page.
  await expect(table).toContainText('310');
});

test('compare shows its empty state with no selection', async ({ page }) => {
  await page.goto('/cs/compare/');
  await expect(page.getByText(/Zatím nic nevybráno/)).toBeVisible();
});

test('the decoder filter actually filters, with JavaScript on', async ({ page }) => {
  // The only previous decoder test ran with JavaScript disabled, so a script
  // that never executed would still have passed it.
  await page.goto('/cs/decoder/');
  const controls = page.locator('#decoder-controls');
  await expect(controls).toBeVisible();

  const entries = page.locator('[data-entry]');
  const total = await entries.count();
  expect(total).toBeGreaterThan(1);

  await page.locator('#decoder-query').fill('e621');
  await expect(entries.filter({ visible: true })).toHaveCount(1);

  await page.locator('#decoder-query').fill('');
  await expect(entries.filter({ visible: true })).toHaveCount(total);
});

test('every footer link resolves', async ({ page }) => {
  // The footer shipped to production linking to /legal, /privacy and /sources
  // before any of them existed, so every reader who trusted the chrome got a
  // 404. A link in the site's own furniture is a promise the site makes about
  // itself; this test is what keeps that promise checkable.
  //
  // One locale now, so one pass. The loop is gone rather than left running once
  // - a loop over a single-element list reads as though it is still covering
  // something.
  await page.goto('/cs/');
  const hrefs = await page
    .locator('footer nav a')
    .evaluateAll((links) => links.map((a) => (a as HTMLAnchorElement).getAttribute('href') ?? ''));
  expect(hrefs.length).toBeGreaterThan(0);

  for (const href of hrefs) {
    const response = await page.goto(href);
    expect(response?.status(), `${href} should not be a dead link`).toBeLessThan(400);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }
});

test('no page offers a language the site does not serve', async ({ page }) => {
  /*
   * Withdrawing `en` is only true if nothing still advertises it. An hreflang
   * or a language-switcher link pointing at /en/ is a 404 the site hands the
   * reader itself, and it would survive every other test here.
   */
  for (const path of ['/cs/', ITEM, '/cs/decoder/']) {
    await page.goto(path);
    const hrefs = await page
      .locator('a[href], link[rel="alternate"]')
      .evaluateAll((els) => els.map((e) => e.getAttribute('href') ?? ''));
    expect(
      hrefs.filter((h) => /^\/en(\/|$)/.test(h)),
      `${path} must not link into a withdrawn locale`,
    ).toEqual([]);
  }
});

test('the privacy page does not outlive its own claim', async ({ page, baseURL }) => {
  // /privacy states that the site loads nothing from anybody else. That is a
  // promise about every page, so it is asserted rather than trusted: if someone
  // adds an analytics snippet or a hosted font, this fails before a reader is
  // told something untrue.
  const ownHost = new URL(baseURL ?? 'http://localhost').host;
  const foreign: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).host !== ownHost) foreign.push(request.url());
  });

  for (const path of ['/cs/', '/cs/privacy/', ITEM, '/cs/decoder/']) {
    await page.goto(path);
  }
  expect(foreign, 'no page may load anything from a third party').toEqual([]);
});

test('unverified reference data is labelled provisional wherever it is used', async ({ page }) => {
  /*
   * /methodology tells readers that anything derived from the unverified
   * threshold and reference-intake tables is labelled on the page where it
   * appears. That was true of the traffic lights and, for a while, quietly
   * false of the reference-intake percentages - which look more like plain
   * facts than a colour does.
   *
   * On the Canadian page, because that is where a band is actually computed.
   */
  await page.goto('/cs/chains/mcdonalds/egg-mcmuffin/CA/');
  await expect(page.getByText(/prahů zatím nikdo neporovnal/i).first()).toBeVisible();
  await expect(page.getByText(/referenčních hodnot příjmu zatím nikdo neporovnal/i)).toBeVisible();
});
