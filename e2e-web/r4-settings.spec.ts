import { test, expect } from '@playwright/test';

// R4 Settings regression (Setări opens from a row in Profil); uses R1's local demo server, never live services.
// OkBite is light only: Setări offers no appearance choice, even when the phone is in dark mode.
test('Setări has no theme choice, stays light and reachable in landscape', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 812, height: 375 });
  await page.goto('/');
  await page.getByRole('tab', { name: 'Profil', exact: true }).click();
  await page.getByRole('button', { name: 'Setări', exact: true }).click();
  await expect(page.getByRole('radio')).toHaveCount(0);
  await expect(page.getByText('Mod întunecat', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).not.toBe('rgb(15, 31, 23)');
  const terms = page.getByRole('button', { name: 'Termeni de utilizare', exact: true });
  await terms.scrollIntoViewIfNeeded();
  await expect(terms).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
