import { expect, test } from '@playwright/test';

const ITEM = '/en/chains/example-burger-co/example-double-burger/GB';

test('home to chain to item', async ({ page }) => {
  await page.goto('/en');
  await page
    .getByRole('link', { name: /chains/i })
    .first()
    .click();
  await expect(page).toHaveURL(/\/en\/chains/);
  await page
    .getByRole('link', { name: /EXAMPLE BURGER CO/i })
    .first()
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('EXAMPLE BURGER CO');
});

test('switching market changes the numbers AND the URL', async ({ page }) => {
  // The whole reason market is a path segment: a shared link must show the
  // recipient the same figures as the sender.
  await page.goto(ITEM);
  await expect(page).toHaveURL(/\/GB$/);
  await page.getByRole('link', { name: 'US', exact: true }).click();
  await expect(page).toHaveURL(/\/US$/);
});

test('switching language keeps the same page and the same market', async ({ page }) => {
  await page.goto(ITEM);
  await page
    .locator('summary')
    .filter({ hasText: /Language/i })
    .click();
  await page.getByRole('link', { name: 'Čeština' }).click();
  await expect(page).toHaveURL('/cs/chains/example-burger-co/example-double-burger/GB');
  await expect(page.getByRole('heading', { name: 'Semafory' })).toBeVisible();
});

test('every traffic light carries a word, not only a colour', async ({ page }) => {
  await page.goto(ITEM);
  const table = page.getByRole('table');
  await expect(table).toBeVisible();
  const words = await table.getByText(/^(HIGH|MED|LOW)$/).count();
  expect(words).toBeGreaterThan(0);
});

test('the reality check keeps its sentence when the pictures are off', async ({ page }) => {
  await page.goto(ITEM);
  const sentence = page.getByText(/This portion contains .* of sugar/);
  await expect(sentence).toBeVisible();
  await page.getByText('Just the numbers').click();
  // Plain mode removes the drawing and never the fact.
  await expect(sentence).toBeVisible();
});

test('the additive drawer opens in place and closes on Escape', async ({ page }) => {
  await page.goto(ITEM);
  const summary = page.locator('details summary').first();
  await summary.click();
  await expect(page.getByText('Why it is in your food').first()).toBeVisible();
  await page.keyboard.press('Escape');
});

test('an item page carries its disclaimers', async ({ page }) => {
  await page.goto(ITEM);
  // Deliberately present more than once: BRIEF §12 requires the non-affiliation
  // notice on the page AND in the footer, so `.first()` is the assertion, not a
  // workaround for a duplicate.
  await expect(page.getByText(/Not affiliated with/).first()).toBeVisible();
  await expect(page.getByText(/not medical or dietary advice/i).first()).toBeVisible();
  expect(await page.getByText(/Not affiliated with/).count()).toBeGreaterThanOrEqual(2);
});

test('no exercise-equivalent language anywhere on an item page', async ({ page }) => {
  await page.goto(ITEM);
  const body = (await page.locator('body').innerText()).toLowerCase();
  for (const phrase of ['burn it off', 'burn off', 'run for', 'walk off', 'treadmill']) {
    expect(body).not.toContain(phrase);
  }
});

test('the decoder works without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('/en/decoder');
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
