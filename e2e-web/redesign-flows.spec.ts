import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { LookupResponse } from '../packages/shared/src/contract';
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
if (!yogurt || !gluten || !unavailable)
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

  test('c · manual barcode opens result tier and Why', async ({ page }) => {
    await stub(page, yogurt);
    await page.goto('/');
    await page.getByRole('button', { name: ro.scan.manual, exact: true }).click();
    await page
      .getByRole('textbox', { name: ro.scan.manualTitle, exact: true })
      .fill(yogurt.product.code!);
    await page.getByRole('button', { name: ro.scan.search, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/product/${yogurt.product.id}`));
    await expect(page.getByTestId('product-score')).toHaveText(
      `${ro.history.score(yogurtScore.score!)} · ${ro.tiers[yogurtScore.tier!]}`,
    );
    await expect(page.getByText(ro.processing.title, { exact: true })).toBeVisible();
    await expect(page.getByText(ro.processing.unknown, { exact: true })).toBeVisible();
    await expect(page.getByTestId('deduction-row')).toHaveCount(0);
    await page.getByRole('button', { name: ro.tiers.why, exact: true }).click();
    expect(await page.getByTestId('deduction-row').count()).toBeGreaterThan(0);
  });

  test('d · processing and missing nutrition stay unknown', async ({ page }) => {
    await stub(page, unavailable);
    await page.goto(`/product/${unavailable.product.id}`);
    await expect(
      page.getByRole('heading', { name: unavailable.product.name, exact: true }),
    ).toBeVisible();
    await expect(page.getByText(ro.result.scoreUnavailable, { exact: true }).first()).toBeVisible();
    await expect(page.getByText(ro.processing.unknown, { exact: true })).toBeVisible();
    await expect(page.getByTestId('product-score')).toHaveCount(0);
    await expect(page.getByText(/\b0 din 100/)).toHaveCount(0);
    await expect(page.getByText(ro.result.insufficientNutrition, { exact: true })).toBeVisible();
    // Null nutrients are omitted, never shown as zero.
    for (const key of ['sat', 'sugar', 'salt', 'fiber'] as const) {
      await expect(page.getByText(ro.result.nutrients[key], { exact: true })).toHaveCount(0);
    }
    await expect(page.getByText('0 g', { exact: true })).toHaveCount(0);
  });

  test('e · history searches saved products', async ({ page }) => {
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
    await page
      .getByRole('textbox', { name: ro.history.search, exact: true })
      .fill(gluten.product.brand);
    await expect(open(gluten.product.name)).toBeVisible();
    await expect(open(yogurt.product.name)).toHaveCount(0);
    await page.getByRole('textbox', { name: ro.history.search, exact: true }).fill('zzzz');
    await expect(page.getByText(ro.history.noMatches, { exact: true })).toBeVisible();
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
    await page.getByRole('button', { name: ro.settings.english, exact: true }).click(); // reloads the page
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('tablist').getByRole('tab')).toHaveText([
      en.nav.history,
      en.nav.compare,
      en.nav.scan,
      en.nav.allergies,
      en.nav.profile,
    ]);
    await page.goto(`/product/${yogurt.product.id}`);
    await expect(page.getByTestId('product-score')).toHaveText(
      `${en.history.score(yogurtScore.score!)} · ${en.tiers[yogurtScore.tier!]}`,
    );
    await page.getByRole('button', { name: en.tiers.why, exact: true }).click();
    expect(await page.getByTestId('deduction-row').count()).toBeGreaterThan(0);
    await expect(page.getByText(en.processing.title, { exact: true })).toBeVisible();
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
    [ro.nav.allergies, ro.allergies.title],
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
