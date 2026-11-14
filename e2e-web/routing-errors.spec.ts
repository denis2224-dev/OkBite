import { expect, test, type Page } from '@playwright/test';

const notFound = {
  ro: {
    title: 'Pagina nu a fost găsită',
    description: 'Adresa nu există sau pagina a fost mutată.',
    scan: 'Mergi la scanare',
  },
  en: {
    title: 'Page not found',
    description: 'This address does not exist or the page has moved.',
    scan: 'Go to scan',
  },
} as const;

async function ready(page: Page, language: 'ro' | 'en' = 'ro') {
  await page.goto('/');
  await page.evaluate(async language => {
    localStorage.setItem('okbite.lang', language);
    const request = indexedDB.open('okbite-profile', 1);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onupgradeneeded = () => request.result.createObjectStore('profile');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('profile', 'readwrite');
      transaction.objectStore('profile').put(JSON.stringify({ goals: [], allergens: [], avoid: [], onboarded: true }), 'profile');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  }, language);
  await page.reload();
}

for (const language of ['ro', 'en'] as const) {
  test(`${language}: unknown URL shows the localized not-found screen`, async ({ page }) => {
    await ready(page, language);
    const copy = notFound[language];
    await page.goto('/this-page-does-not-exist');
    await expect(page.getByRole('heading', { name: copy.title, exact: true })).toBeVisible();
    await expect(page.getByText(copy.description, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: copy.scan, exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
  });
}

test('/_sitemap does not enumerate application routes or admin', async ({ page }) => {
  await ready(page);
  await page.goto('/_sitemap');
  await expect(page.getByRole('heading', { name: notFound.ro.title, exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /sitemap/i })).toHaveCount(0);
  await expect(page.getByText(/\badmin\b/i)).toHaveCount(0);
});

test('unknown product shows not-found actions instead of a bad-request message', async ({ page }) => {
  await ready(page);
  await page.goto('/product/does-not-exist');
  await expect(page.getByText('Produsul nu a fost găsit.', { exact: true })).toBeVisible();
  await expect(page.getByText('Verifică datele introduse.', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Scanează codul de bare', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Deschide istoricul', exact: true })).toBeVisible();
});
