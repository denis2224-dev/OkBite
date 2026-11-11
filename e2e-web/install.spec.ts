import { expect, test } from '@playwright/test';
import { ro } from '../apps/mobile/src/copy/ro';
import { light } from '../apps/mobile/src/theme/tokens';

test('manifest shortcut opens the root Scan tab and matches the existing shell theme', async ({ request }) => {
  const manifest = await (await request.get('/manifest.webmanifest')).json();
  expect(manifest).toMatchObject({ theme_color: light.primary, background_color: light.ground,
    shortcuts: [{ name: 'Scanează', short_name: 'Scanează', url: '/' }] });
});

test('iPhone guidance opens explicitly, stays reachable in dark landscape, and persists dismissal', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'platform', { value: 'iPhone' }));
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByText(ro.pwa.install.iosHint)).toHaveCount(0);
  await page.getByRole('button', { name: ro.pwa.install.title, exact: true }).click();
  await expect(page.getByRole('dialog', { name: ro.pwa.install.title })).toBeVisible();
  await expect(page.getByText(ro.pwa.install.iosHint)).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('install-ios-dark.png') });
  await page.setViewportSize({ width: 812, height: 375 });
  await page.evaluate(() => {
    const text = [...document.querySelectorAll<HTMLElement>('div,span')].filter(el => [...el.childNodes].some(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()));
    const sizes = text.map(el => [el, getComputedStyle(el).fontSize, getComputedStyle(el).lineHeight] as const);
    for (const [el, size, height] of sizes) { el.style.fontSize = `${parseFloat(size) * 2}px`; if (height !== 'normal') el.style.lineHeight = `${parseFloat(height) * 2}px`; }
  });
  const close = page.getByRole('button', { name: ro.app.close, exact: true });
  await close.scrollIntoViewIfNeeded();
  await expect(close).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('install-ios-dark-landscape-200.png') });
  await page.keyboard.press('Escape');
  await expect(page.getByText(ro.pwa.install.iosHint)).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('okbite.install.dismissed.v1'))).toBe('1');
  await page.reload();
  await expect(page.getByRole('button', { name: ro.pwa.install.title, exact: true })).toHaveCount(0);
});

test('Android invitation installs directly and exposes browser rejection', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'platform', { value: 'Linux' }));
  await page.goto('/');
  await expect(page.getByRole('button', { name: ro.home.design.demo, exact: true })).toBeVisible();
  await page.evaluate(() => {
    window.dispatchEvent(Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: async () => { throw new Error('Browser refused installation'); },
      userChoice: Promise.resolve({ outcome: 'dismissed' }),
    }));
  });
  await page.getByRole('button', { name: ro.pwa.install.title, exact: true }).click();
  await expect(page.getByText(ro.pwa.install.failed)).toBeVisible();
  await expect(page.getByRole('button', { name: ro.pwa.install.title, exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: ro.app.close, exact: true }).click();
  await expect(page.getByText(ro.pwa.install.failed)).toHaveCount(0);
});
