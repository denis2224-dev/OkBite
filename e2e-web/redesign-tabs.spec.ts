import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const tabs = ['Istoric', 'Compară', 'Scanează', 'Alergii', 'Profil'];
const entry = JSON.parse(readFileSync('apps/mobile/src/test/preview-data.json', 'utf8'))[0];

test.describe('N9 five-tab redesign acceptance', () => {
  test.use({ serviceWorkers: 'block' });

  test('tabs appear in order with Scan selected at startup', async ({ page }) => {
    // needs W2 (UI9-allergies-tab): without app/(tabs)/allergies.tsx the router drops the Alergii tab.
    test.fixme(true, 'Enable after W2 (UI9-allergies-tab) merges app/(tabs)/allergies.tsx.');
    await page.goto('/');
    await expect(page.getByRole('tablist').getByRole('tab')).toHaveText(tabs);
    await expect(page.getByRole('tab', { name: 'Scanează', exact: true })).toHaveAttribute('aria-selected', 'true');
  });

  for (const [name, heading] of [['Istoric', 'Istoric'], ['Compară', 'Comparație'], ['Alergii', 'Alergiile tale'], ['Profil', 'Profil']]) {
    test(`${name} opens its screen and can return to Scan`, async ({ page }) => {
      // needs W2 (UI9-allergies-tab): the Alergii route and its heading land with that branch.
      test.fixme(name === 'Alergii', 'Enable after W2 (UI9-allergies-tab) merges app/(tabs)/allergies.tsx.');
      await page.goto('/');
      await page.getByRole('tab', { name, exact: true }).click();
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      await expect(page.getByRole('tab', { name, exact: true })).toHaveAttribute('aria-selected', 'true');
      await page.getByRole('tab', { name: 'Scanează', exact: true }).click();
      await expect(page.getByRole('tab', { name: 'Scanează', exact: true })).toHaveAttribute('aria-selected', 'true');
    });
  }

  for (const [row, heading] of [['Setări', 'Setări'], ['Despre', 'Despre']]) {
    test(`Profil → ${row} row opens ${heading} with no tab selected`, async ({ page }) => {
      await page.goto('/');
      await page.getByRole('tab', { name: 'Profil', exact: true }).click();
      await page.getByRole('button', { name: row, exact: true }).click();
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Profil', exact: true })).toHaveAttribute('aria-selected', 'false');
      await expect(page.locator('[role="tab"][aria-selected="true"]')).toHaveCount(0);
    });
  }
});

test('comparison remains reachable from a stubbed product result', async ({ page }) => {
    await page.route('**/functions/v1/lookup*', route => route.fulfill({ json: { status: 'found', ...entry } }));
    await page.goto(`/product/${entry.product.id}`);
    await page.getByRole('button', { name: 'Compară cu alt produs', exact: true }).click();
    await expect(page).toHaveURL(/\/compare(?:\?|$)/);
});
