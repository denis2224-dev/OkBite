import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

// A left-edge swipe in Safari (or Android's back gesture) runs the browser's back. Tab presses replace the
// page, so going back from a nav-bar page never lands on the previously opened tab.
test('browser back from a nav-bar page does not return to the previous tab', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('tab', { name: 'Scanează', exact: true })).toHaveAttribute('aria-selected', 'true');
  const start = await page.evaluate(() => history.length);
  await page.getByRole('tab', { name: 'Istoric', exact: true }).click();
  await expect(page).toHaveURL(/\/history$/);
  await page.getByRole('tab', { name: 'Compară', exact: true }).click();
  await expect(page).toHaveURL(/\/compare$/);
  expect(await page.evaluate(() => history.length)).toBe(start);
  await page.goBack();
  await expect(page).not.toHaveURL(/\/history$/);
});

test('a page opened from Profil still goes back to Profil', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Profil', exact: true }).click();
  await page.getByRole('button', { name: 'Setări', exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/profile$/);
});
