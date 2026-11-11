import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

const tabs = ['Despre', 'Istoric', 'Scanează', 'Profil', 'Setări'];
const entry = JSON.parse(readFileSync('apps/mobile/src/test/preview-data.json', 'utf8'))[0];

test.describe('N9 five-tab redesign acceptance', () => {
  test.fixme(true, 'Enable when N3 mounts the five-tab shell; N15 verifies final onboarding and result integration.');
  test.use({ serviceWorkers: 'block' });

  test('tabs appear in order with Scan selected at startup', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('tablist').getByRole('tab')).toHaveText(tabs);
    await expect(page.getByRole('tab', { name: 'Scanează', exact: true })).toHaveAttribute('aria-selected', 'true');
  });

  for (const [name, heading] of [['Despre', 'Despre OkBite'], ['Istoric', 'Istoric'], ['Profil', 'Profil'], ['Setări', 'Setări']]) {
    test(`${name} opens its screen and can return to Scan`, async ({ page }) => {
      await page.goto('/');
      await page.getByRole('tab', { name, exact: true }).click();
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      await expect(page.getByRole('tab', { name, exact: true })).toHaveAttribute('aria-selected', 'true');
      await page.getByRole('tab', { name: 'Scanează', exact: true }).click();
      await expect(page.getByRole('tab', { name: 'Scanează', exact: true })).toHaveAttribute('aria-selected', 'true');
    });
  }

});

test('comparison remains reachable from a stubbed product result', async ({ page }) => {
    await page.route('**/functions/v1/lookup*', route => route.fulfill({ json: { status: 'found', ...entry } }));
    await page.goto(`/product/${entry.product.id}`);
    await page.getByRole('button', { name: 'Compară cu alt produs', exact: true }).click();
    await expect(page).toHaveURL(/\/compare(?:\?|$)/);
});
