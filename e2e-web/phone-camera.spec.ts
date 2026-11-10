import { test, expect, chromium, type Page } from '@playwright/test';

const app = process.env.OKBITE_WEB_DEV_URL ?? '';
function errorsOn(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (/order of Hooks|Rendered (more|fewer) hooks|Invalid hook call/.test(message.text())) errors.push(message.text());
  });
  return errors;
}

test('insecure camera access explains HTTPS and keeps gallery and manual entry reachable', async ({ page }) => {
  const errors = errorsOn(page);
  await page.addInitScript(() => {
    Object.defineProperty(window, 'isSecureContext', { value: false });
    Object.defineProperty(navigator, 'mediaDevices', { value: undefined, configurable: true });
  });
  await page.goto(app + '/capture');
  await expect(page.getByText('Camera funcționează doar pe o conexiune securizată HTTPS.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Alege din galerie', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Deschide setările', exact: true })).toHaveCount(0);
  await page.goto(app + '/scan');
  await expect(page.getByText('Camera funcționează doar pe o conexiune securizată HTTPS.', { exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Introdu codul manual', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('denied browser camera offers instructions instead of a native settings action', async ({ page }) => {
  const errors = errorsOn(page);
  await page.addInitScript(() => Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: {
    getUserMedia: async () => { throw new DOMException('Denied', 'NotAllowedError'); },
  } }));
  await page.goto(app + '/capture');
  await expect(page.getByText('Permite accesul la cameră din setările acestui site, apoi reîncearcă.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Deschide setările', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Am permis accesul, reîncearcă', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('repeated capture and scan navigation preserves React hook ordering', async ({ page }) => {
  const errors = errorsOn(page);
  await page.goto(app + '/');
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'Fotografiază eticheta', exact: true }).click();
    await expect(page).toHaveURL(/\/capture$/);
    await page.getByRole('button', { name: 'Înapoi', exact: true }).click();
    await page.getByRole('button', { name: 'Scanează produsul', exact: true }).click();
    await expect(page).toHaveURL(/\/scan$/);
    await page.getByRole('button', { name: 'Înapoi', exact: true }).click();
  }
  expect(errors).toEqual([]);
});

test('supported capture becomes ready and a failed preview retains recovery actions', async ({ browserName, baseURL }) => {
  test.skip(browserName !== 'chromium', 'This test uses Chromium’s synthetic camera driver.');
  const browser = await chromium.launch({ args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
  try {
    const page = await browser.newPage();
    const errors = errorsOn(page);
    await page.goto((app || baseURL) + '/capture');
    await expect(page.getByRole('button', { name: 'Fă fotografia', exact: true })).toBeEnabled();
    await expect(page.locator('video')).toBeVisible();
    await page.addInitScript(() => {
      const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      let calls = 0;
      navigator.mediaDevices.getUserMedia = constraints => ++calls === 1 ? original(constraints) : Promise.reject(new DOMException('Busy', 'NotReadableError'));
    });
    await page.reload();
    await expect(page.getByText('Camera nu a putut porni. Închide alte aplicații care folosesc camera și reîncearcă.', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Alege din galerie', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Încearcă din nou', exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  } finally { await browser.close(); }
});
