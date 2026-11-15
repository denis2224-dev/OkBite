import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { ro } from '../apps/mobile/src/copy/ro';
import { light } from '../apps/mobile/src/theme/tokens';

const ids = JSON.parse(readFileSync('apps/mobile/src/test/preview-data.json', 'utf8')).slice(0, 2).map((entry: { product: { id: string } }) => entry.product.id);
const DAY = 24 * 60 * 60 * 1000;
// The invitation waits until two different product results have been opened.
async function openTwoResults(page: Page) {
  for (const id of ids) {
    await page.goto(`/product/${id}`);
    await expect(page.getByRole('button', { name: ro.result.compare, exact: true })).toBeVisible();
  }
  await page.goto('/');
  await expect(page.getByRole('tab', { name: ro.nav.scan, exact: true })).toBeVisible();
}
const installButton = (page: Page) => page.getByRole('button', { name: ro.pwa.install.action, exact: true });

test('manifest shortcut opens the root Scan tab and matches the existing shell theme', async ({ request }) => {
  const manifest = await (await request.get('/manifest.webmanifest')).json();
  expect(manifest).toMatchObject({ theme_color: light.primary, background_color: light.ground,
    shortcuts: [{ name: 'Scanează', short_name: 'Scanează', url: '/' }] });
});

test('iPhone guidance waits for two results, opens from a bottom banner, stays reachable in landscape, and persists dismissal', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'platform', { value: 'iPhone' }));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('tab', { name: ro.nav.scan, exact: true })).toBeVisible();
  await expect(page.getByText(ro.pwa.install.title, { exact: true })).toHaveCount(0);
  await expect(installButton(page)).toHaveCount(0);
  await openTwoResults(page);
  await expect(page.getByText(ro.pwa.install.iosHint)).toHaveCount(0);
  const banner = await installButton(page).boundingBox();
  const nav = await page.getByRole('tablist').boundingBox();
  expect(banner && nav && banner.y > page.viewportSize()!.height / 2 && banner.y + banner.height <= nav.y).toBe(true);
  await page.screenshot({ path: test.info().outputPath('install-banner.png') });
  await installButton(page).click();
  await expect(page.getByRole('dialog', { name: ro.pwa.install.title })).toBeVisible();
  await expect(page.getByText(ro.pwa.install.iosHint)).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('install-ios.png') });
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
  await page.screenshot({ path: test.info().outputPath('install-ios-landscape-200.png') });
  await page.keyboard.press('Escape');
  await expect(page.getByText(ro.pwa.install.iosHint)).toHaveCount(0);
  const dismissedAt = Number(await page.evaluate(() => localStorage.getItem('okbite.install.dismissedAt.v1')));
  expect(Math.abs(Date.now() - dismissedAt)).toBeLessThan(5 * 60 * 1000);
  await page.reload();
  await expect(page.getByRole('tab', { name: ro.nav.scan, exact: true })).toBeVisible();
  await expect(installButton(page)).toHaveCount(0);
});

test('a dismissed invitation stays hidden for 30 days, then returns', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'platform', { value: 'iPhone' }));
  await openTwoResults(page);
  await expect(installButton(page)).toBeVisible();
  await page.evaluate(at => localStorage.setItem('okbite.install.dismissedAt.v1', String(at)), Date.now() - 29 * DAY);
  await page.reload();
  await expect(page.getByRole('tab', { name: ro.nav.scan, exact: true })).toBeVisible();
  await expect(installButton(page)).toHaveCount(0);
  await page.evaluate(at => localStorage.setItem('okbite.install.dismissedAt.v1', String(at)), Date.now() - 31 * DAY);
  await page.reload();
  await expect(installButton(page)).toBeVisible();
});

test('Android invitation installs directly and exposes browser rejection', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'platform', { value: 'Linux' }));
  await openTwoResults(page);
  await page.evaluate(() => {
    window.dispatchEvent(Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: async () => { throw new Error('Browser refused installation'); },
      userChoice: Promise.resolve({ outcome: 'dismissed' }),
    }));
  });
  await installButton(page).click();
  await expect(page.getByText(ro.pwa.install.failed)).toBeVisible();
  await expect(installButton(page)).toHaveCount(0);
  await page.getByRole('button', { name: ro.app.close, exact: true }).click();
  await expect(page.getByText(ro.pwa.install.failed)).toHaveCount(0);
});
