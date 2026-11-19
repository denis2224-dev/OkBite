import { randomUUID } from 'node:crypto';
import { expect, test as base, type Page } from '@playwright/test';
import { ro } from '../apps/mobile/src/copy/ro';

const test = base.extend<{
  sharedWaterId: string;
}>({
  sharedWaterId: async ({ request }, provide) => {
    const waterId = randomUUID();
    expect((await request.post(`/__test/session?id=${waterId}`, {
      data: { scenario: 'water-shared', sharedId: waterId },
    })).ok()).toBe(true);
    await provide(waterId);
  },
});

async function uploadPhoto(page: Page) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: ro.add.gallery, exact: true }).click();
  await (await chooser).setFiles('apps/mobile/public/icon-192.png');
}

test('water flow: partial bottle shows estimated range, second device fills missing minerals, repeat lookup reflects unverified update', async ({ browser, sharedWaterId }) => {
  const ctxA = await browser.newContext({ storageState: 'e2e-web/onboarded.storage.json' });
  const ctxB = await browser.newContext({ storageState: 'e2e-web/onboarded.storage.json' });
  const deviceA = randomUUID();
  const deviceB = randomUUID();
  await ctxA.addInitScript((id: string) => localStorage.setItem('okbite.deviceId', id), deviceA);
  await ctxB.addInitScript((id: string) => localStorage.setItem('okbite.deviceId', id), deviceB);

  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  // Register both devices in test server against the same shared partial water bottle.
  await pageA.request.post(`/__test/session?id=${deviceA}`, { data: { scenario: 'water-shared', sharedId: sharedWaterId } });
  await pageB.request.post(`/__test/session?id=${deviceB}`, { data: { scenario: 'water-shared', sharedId: sharedWaterId } });

  // Device A opens partial Nordica-like water: sees estimated range (not 100/100) + enrichment CTA.
  await pageA.goto(`/product/${sharedWaterId}`);
  await expect(pageA.getByTestId('product-score-range')).toHaveText(/60–100/);
  await expect(pageA.getByText(ro.result.water.missingInputs, { exact: true })).toHaveCount(0);
  await pageA.getByRole('button', { name: ro.result.water.addOrUpdateChemistry, exact: true }).click();

  // Device A scans clearer label and saves filled calcium + explicit 0 nitrate.
  await expect(pageA.getByText(ro.result.water.panelTitle, { exact: true })).toBeVisible();
  await uploadPhoto(pageA);
  await expect(pageA.getByTestId('water-fields')).toBeVisible();
  await pageA.getByRole('button', { name: ro.add.confirmSave, exact: true }).click();

  await expect(pageA).toHaveURL(new RegExp(`/product/${sharedWaterId}$`));
  await expect(pageA.getByTestId('water-unverified-note').filter({ visible: true }).last()).toBeVisible();
  await expect(pageA.getByTestId('water-card').filter({ visible: true }).last()).toContainText('42 mg/l');

  // Device B looks up the same product independently and receives the saved enrichment.
  await pageB.goto(`/product/${sharedWaterId}`);
  await expect(pageB.getByTestId('water-unverified-note')).toBeVisible();
  await expect(pageB.getByTestId('water-card')).toContainText('42 mg/l');
  await expect(pageB.getByTestId('water-card')).toContainText('0 mg/l');
  await expect(pageB.getByTestId('water-card')).toContainText('Fotografie utilizator');

  await ctxA.close();
  await ctxB.close();
});
