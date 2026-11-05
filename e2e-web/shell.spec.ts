import { expect, test, type Page } from '@playwright/test';
import { ro } from '../apps/mobile/src/copy/ro';
const id = '0b6f3c1e-2d4a-4c8e-9f10-1a2b3c4d5e1f';
async function controlled(page: Page) {
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller);
}
test('links an installable Romanian manifest and valid existing icons', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ro');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest');
  const response = await request.get('/manifest.webmanifest');
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest).toMatchObject({ name: 'OkBite', display: 'standalone', start_url: '/', scope: '/', lang: 'ro' });
  for (const size of [192, 512]) {
    const icon = manifest.icons.find((icon: { sizes: string }) => icon.sizes === `${size}x${size}`);
    const bytes = await (await request.get(icon.src)).body();
    expect(bytes.readUInt32BE(16)).toBe(size);
    expect(bytes.readUInt32BE(20)).toBe(size);
  }
});
test('offline hard navigation loads the shell and a product saved in IndexedDB', async ({ page, context }) => {
  await page.goto(`/product/${id}`);
  await expect(page.getByText('Iaurt natural 2,5%', { exact: true })).toBeVisible();
  await controlled(page);
  await page.evaluate(() => caches.delete('okbite-lookup'));
  await context.setOffline(true);
  await page.goto('/about');
  await expect(page.getByRole('heading', { name: ro.nav.about, exact: true })).toBeVisible();
  await page.goto(`/product/${id}`);
  await expect(page.getByText('Iaurt natural 2,5%', { exact: true })).toBeVisible();
  await expect(page.getByText(ro.result.allergens, { exact: true })).toBeVisible();
});
test('the service worker never replays a cached POST response', async ({ page, context }) => {
  await page.goto('/'); await controlled(page);
  expect(await page.evaluate(() => fetch('/functions/v1/test-post', { method: 'POST' }).then(r => r.text()))).toBe('test-only');
  await context.setOffline(true);
  expect(await page.evaluate(() => fetch('/functions/v1/test-post', { method: 'POST' }).then(() => false, () => true))).toBe(true);
});
test('cross-origin lookup GET falls back to its cached response offline', async ({ page, context }) => {
  await page.goto('/'); await controlled(page);
  const url = `http://127.0.0.1:18767/functions/v1/lookup?id=${id}`;
  expect(await page.evaluate(url => fetch(url).then(r => r.json()), url)).toMatchObject({ status: 'found', product: { id } });
  await context.setOffline(true);
  expect(await page.evaluate(url => fetch(url).then(r => r.json()), url)).toMatchObject({ status: 'found', product: { id } });
});
