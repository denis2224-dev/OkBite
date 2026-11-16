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

test.describe('English device locale defaults to Romanian and switches language in onboarding', () => {
  test.use({ locale: 'en-US' });

  test('starts in Romanian despite en-US browser locale and switches cleanly to Russian', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'ro');
    await expect(page.getByText('Pasul 1 din 4')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Alege limba', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Русский', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
    await expect(page.getByText('Шаг 1 из 4')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Выберите язык', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Пропустить', exact: true }).click();
    await expect(page.getByRole('tab', { name: 'Сканер', exact: true })).toHaveAttribute('aria-selected', 'true');
  });
});
