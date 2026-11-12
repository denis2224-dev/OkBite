import { test, expect } from '@playwright/test';

// R4 Settings regression (Setări opens from a row in Profil); uses R1's local demo server, never live services.
test('theme choices expose their checked state and stay reachable in landscape', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 812, height: 375 });
  await page.goto('/');
  await page.getByRole('tab', { name: 'Profil', exact: true }).click();
  await page.getByRole('button', { name: 'Setări', exact: true }).click();
  const dark = page.getByRole('radio', { name: 'Mod întunecat', exact: true });
  const light = page.getByRole('radio', { name: 'Mod luminos', exact: true });
  await expect(page.getByRole('radio', { name: 'După telefon', exact: true })).toHaveAttribute('aria-checked', 'true');
  await dark.click();
  await expect(dark).toHaveAttribute('aria-checked', 'true');
  await expect(light).toHaveAttribute('aria-checked', 'false');
  await light.click();
  await expect(light).toHaveAttribute('aria-checked', 'true');
  await expect(dark).toHaveAttribute('aria-checked', 'false');
  const terms = page.getByRole('button', { name: 'Termeni de utilizare', exact: true });
  await terms.scrollIntoViewIfNeeded();
  await expect(terms).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
