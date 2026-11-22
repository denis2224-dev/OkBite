import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { LookupResponse, type Ingredient } from '../packages/shared/src/contract';
import { productScore } from '../packages/shared/src/score';
import { ro } from '../apps/mobile/src/copy/ro';
import { en } from '../apps/mobile/src/copy/strings.en';

// Acceptance flows N15 a-h. Products come from the existing preview fixtures, served by the e2e demo
// server or stubbed per test; they are illustrative and never food facts.
const fixtures = JSON.parse(readFileSync('apps/mobile/src/test/preview-data.json', 'utf8')).map(
  (entry: unknown) => LookupResponse.parse({ status: 'found', ...(entry as object) }),
);
type Found = Extract<(typeof fixtures)[number], { status: 'found' }>;
const found = fixtures as Found[];
const yogurt = found[0]!;
const gluten = found.find((entry) => entry.product.allergens.includes('Gluten'))!;
const unavailable = found.find((entry) => entry.score.score === null)!;
const additiveEntry = found.find((entry) => entry.product.ingredients.some((ingredient: Ingredient) => ingredient.group === 'add'));
const additive = additiveEntry?.product.ingredients.find((ingredient: Ingredient) => ingredient.group === 'add');
if (!yogurt || !gluten || !unavailable || !additiveEntry || !additive)
  throw new Error('Expected yogurt, gluten and unavailable preview fixtures');

const firstLaunch = { cookies: [], origins: [] };
const stub = (page: Page, entry: Found) =>
  page.route('**/functions/v1/lookup*', (route) => route.fulfill({ json: entry }));
const tab = (page: Page, name: string) => page.getByRole('tab', { name, exact: true });
const yogurtScore = productScore(yogurt.product, yogurt.score);
if (yogurtScore.score === null || !yogurtScore.tier)
  throw new Error('Expected a scored yogurt fixture');

test.describe('first launch', () => {
  test.use({ serviceWorkers: 'block', storageState: firstLaunch });

  test('a · first launch skip opens Scan', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/onboarding$/);
    await page.getByRole('button', { name: ro.onboarding.skip, exact: true }).click();
    await expect(tab(page, ro.nav.scan)).toHaveAttribute('aria-selected', 'true');
    await expect(page).not.toHaveURL(/onboarding/);
  });

  test('b · gluten preference warns on result', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/onboarding$/);
    await page.getByRole('button', { name: ro.onboarding.continue, exact: true }).click();
    await page.getByRole('button', { name: ro.onboarding.continue, exact: true }).click();
    await page.getByRole('checkbox', { name: ro.allergens.Gluten, exact: true }).click();
    await page.getByRole('button', { name: ro.onboarding.continue, exact: true }).click();
    await page.getByRole('button', { name: ro.onboarding.done, exact: true }).click();
    await expect(tab(page, ro.nav.scan)).toHaveAttribute('aria-selected', 'true');
    await stub(page, gluten);
    await page.goto(`/product/${gluten.product.id}`);
    await expect(
      page.getByRole('heading', { name: gluten.product.name, exact: true }),
    ).toBeVisible();
    await expect(page.getByTestId('profile-alert-contains')).toContainText(
      ro.result.containsAllergen(ro.allergens.Gluten.toLocaleLowerCase()),
    );
  });
});

test.describe('returning user', () => {
  test.use({ serviceWorkers: 'block' });

  test('c · the result page shows the score, In short and the report sheet', async ({ page }) => {
    let lookups = 0;
    await page.route('**/functions/v1/lookup*', route => { lookups++; return route.fulfill({ json: yogurt }); });
    await page.goto(`/product/${yogurt.product.id}`);
    await expect(page.getByRole('heading', { name: yogurt.product.name, exact: true })).toBeVisible();
    expect(lookups).toBe(1);
    await expect(page.getByTestId('product-score')).toHaveAccessibleName(
      `${ro.history.score(yogurtScore.score!)} · ${ro.tiers[yogurtScore.tier!]}`,
    );
    await expect(page.getByRole('heading', { name: ro.result.inShort, exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: ro.result.whatsInside, exact: true })).toBeVisible();
    // The processing card and the "De ce?" points breakdown are gone.
    await expect(page.getByText(ro.processing.title, { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: ro.tiers.why, exact: true })).toHaveCount(0);
    await expect(page.getByTestId('deduction-row')).toHaveCount(0);
    await page.getByRole('button', { name: ro.result.report, exact: true }).click();
    await expect(page.getByRole('textbox', { name: ro.result.reportLabel, exact: true })).toBeVisible();
    await page.getByRole('button', { name: ro.app.cancel, exact: true }).click();
    await expect(page.getByRole('textbox', { name: ro.result.reportLabel, exact: true })).toHaveCount(0);
  });

  test('c · additive details open from the result page', async ({ page }) => {
    await stub(page, additiveEntry);
    await page.goto(`/product/${additiveEntry.product.id}`);
    await expect(page.getByRole('heading', { name: additiveEntry.product.name, exact: true })).toBeVisible();
    await page.getByRole('button', { name: additive.name, exact: false }).click();
    await expect(page.getByRole('heading', { name: additive.name, exact: true })).toBeVisible();
  });

  test('d · processing and missing nutrition stay unknown', async ({ page }) => {
    await stub(page, unavailable);
    await page.goto(`/product/${unavailable.product.id}`);
    await expect(
      page.getByRole('heading', { name: unavailable.product.name, exact: true }),
    ).toBeVisible();
    await expect(page.getByText(ro.result.scoreUnavailable, { exact: true }).first()).toBeVisible();
    await expect(page.getByTestId('product-score')).toHaveCount(0);
    await expect(page.getByText(/\b0 din 100/)).toHaveCount(0);
    await expect(page.getByText(ro.result.insufficientNutrition, { exact: true })).toBeVisible();
    // Null nutrients are omitted, never shown as zero.
    for (const key of ['sat', 'sugar', 'salt', 'fiber'] as const) {
      await expect(page.getByText(ro.result.nutrients[key], { exact: true })).toHaveCount(0);
    }
    await expect(page.getByText('0 g', { exact: true })).toHaveCount(0);
  });

  test('e · history lists saved products as photo, rating and verdict, with no search', async ({ page }) => {
    for (const entry of [yogurt, gluten]) {
      await stub(page, entry);
      await page.goto(`/product/${entry.product.id}`);
      await expect(
        page.getByRole('heading', { name: entry.product.name, exact: true }),
      ).toBeVisible();
    }
    await page.goto('/');
    await tab(page, ro.nav.history).click();
    const open = (name: string) =>
      page.getByRole('button', { name: new RegExp(`^${ro.history.open(name)}`) });
    await expect(open(yogurt.product.name)).toBeVisible();
    await expect(open(gluten.product.name)).toBeVisible();
    await expect(page.getByRole('textbox', { name: ro.history.search, exact: true })).toHaveCount(0);
    // Rows show the score and verdict only: the product name is read aloud, not drawn.
    await expect(page.getByText(yogurt.product.name, { exact: true })).toHaveCount(0);
  });

  test('f · history clear and onboarding reset persist', async ({ page }) => {
    await stub(page, yogurt);
    await page.goto(`/product/${yogurt.product.id}`);
    await expect(
      page.getByRole('heading', { name: yogurt.product.name, exact: true }),
    ).toBeVisible();
    await page.goto('/');
    await tab(page, ro.nav.profile).click();
    await page.getByRole('button', { name: ro.nav.settings, exact: true }).click();
    await page.getByRole('button', { name: ro.settings.clearHistory, exact: true }).click();
    await page.getByRole('button', { name: ro.settings.clearHistoryConfirm, exact: true }).click();
    await expect(page.getByText(ro.history.cleared, { exact: true })).toBeVisible();
    await page.goto('/');
    await tab(page, ro.nav.history).click();
    await expect(page.getByText(ro.history.design.emptyTitle, { exact: true })).toBeVisible();
    await page.goto('/');
    await tab(page, ro.nav.profile).click();
    await page.getByRole('button', { name: ro.nav.settings, exact: true }).click();
    await page.getByRole('button', { name: ro.settings.resetOnboarding, exact: true }).click();
    await expect(page).toHaveURL(/\/onboarding$/);
    await page.reload();
    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(page.getByRole('button', { name: ro.onboarding.skip, exact: true })).toBeVisible();
  });

  test('h · English tabs result and Why survive reload', async ({ page }) => {
    await stub(page, yogurt);
    await page.goto('/');
    await tab(page, ro.nav.profile).click();
    await page.getByRole('button', { name: ro.nav.settings, exact: true }).click();
    await page.getByRole('button', { name: ro.settings.language, exact: true }).click(); // the languages open from this row
    await page.getByRole('button', { name: ro.settings.english, exact: true }).click(); // reloads the page
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await page.goto('/'); // Setări is a page of its own now, without the tab bar
    // The pill tab bar shows icons; each tab is named by its label.
    const tabs = page.getByRole('tablist').getByRole('tab');
    await expect(tabs).toHaveCount(4);
    for (const [index, name] of [en.nav.history, en.nav.compare, en.nav.scan, en.nav.profile].entries())
      await expect(tabs.nth(index)).toHaveAccessibleName(name);
    await page.goto(`/product/${yogurt.product.id}`);
    await expect(page.getByTestId('product-score')).toHaveAccessibleName(
      `${en.history.score(yogurtScore.score!)} · ${en.tiers[yogurtScore.tier!]}`,
    );
    await expect(page.getByRole('button', { name: en.tiers.why, exact: true })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: en.result.inShort, exact: true })).toBeVisible();
  });
});

test('g · offline tabs retain cached history', async ({ page, context }) => {
  await page.goto(`/product/${yogurt.product.id}`);
  await expect(page.getByRole('heading', { name: yogurt.product.name, exact: true })).toBeVisible();
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller);
  await page.evaluate(() => caches.delete('okbite-lookup'));
  await context.setOffline(true);
  for (const [name, heading] of [
    [ro.nav.history, ro.history.design.title],
    [ro.nav.compare, ro.compare.design.title],
    [ro.nav.profile, ro.profile.title],
  ] as const) {
    await page.goto('/');
    await tab(page, name).click();
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
  await page.goto('/history');
  await page
    .getByRole('button', { name: new RegExp(`^${ro.history.open(yogurt.product.name)}`) })
    .click();
  await expect(page.getByRole('heading', { name: yogurt.product.name, exact: true })).toBeVisible();
});
