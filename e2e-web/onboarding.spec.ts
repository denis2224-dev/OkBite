import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'block', storageState: { cookies: [], origins: [] } });

test('a first launch opens onboarding, Omite opens Scan and a reload stays on Scan', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByRole('button', { name: 'Omite', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Scanează', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.reload();
  await expect(page.getByRole('tab', { name: 'Scanează', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page).not.toHaveURL(/onboarding/);
});

test('a first-launch product link is not redirected to onboarding', async ({ page }) => {
  await page.goto('/product/5941234567890');
  await page.waitForTimeout(2000);
  await expect(page).toHaveURL(/\/product\/5941234567890$/);
});
