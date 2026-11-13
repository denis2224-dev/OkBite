import { randomUUID } from 'node:crypto';
import { expect, test as base, type Page } from '@playwright/test';
import { ro } from '../apps/mobile/src/copy/ro';
import entries from '../apps/mobile/src/test/preview-data.json';
import categories from '../data/categories.json';

const example = entries[0]!;
const category = categories.find(item => item.slug === example.product.category.slug)!;
const nulls = Object.fromEntries(Object.keys(example.product.nutrients).map(key => [key, null]));
type Call = { name: string; body: Record<string, unknown> };
type State = { calls: Call[]; productId: string };
const test = base.extend<{ session: {
  configure(scenario?: string, hold?: string): Promise<void>;
  state(): Promise<State>; release(): Promise<void>;
} }>({
  session: async ({ page, request }, provide) => {
    const id = randomUUID();
    await page.addInitScript(id => localStorage.setItem('okbite.deviceId', id), id);
    const endpoint = `/__test/session?id=${id}`;
    const configure = async (scenario = 'readable', hold = '') => {
      expect((await request.post(endpoint, { data: { scenario, hold } })).ok()).toBe(true);
    };
    await configure();
    await provide({ configure, state: async () => (await request.get(endpoint)).json(),
      release: async () => { expect((await request.post(endpoint + '&release=1')).ok()).toBe(true); } });
  },
});

async function photo(page: Page) {
  // Existing icon is transport-only media; all label facts come from the approved demo fixture.
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: ro.add.gallery, exact: true }).click();
  await (await chooser).setFiles('apps/mobile/public/icon-192.png');
}
async function fillIdentity(page: Page) {
  await page.getByRole('textbox', { name: ro.review.name, exact: true }).fill(example.product.name);
  await page.getByRole('textbox', { name: ro.review.quantity, exact: true }).fill(example.product.quantity);
  await page.getByRole('button', { name: ro.add.next, exact: true }).click();
}
async function begin(page: Page) {
  await page.goto(`/identify?source=code&code=${example.product.code}`);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.getByRole('button', { name: ro.identify.addButton, exact: true }).click();
  await fillIdentity(page);
  await expect(page.getByRole('heading', { name: ro.add.frontTitle, exact: true })).toBeVisible();
  await expect(page.getByText(ro.add.nutritionQuestion, { exact: true })).toHaveCount(0);
  await photo(page);
  await expect(page.getByRole('heading', { name: ro.add.ingredientsTitle, exact: true })).toBeVisible();
  await photo(page);
  await expect(page.getByText(ro.add.nutritionQuestion, { exact: true })).toBeVisible();
}
async function review(page: Page, choice: string) {
  await page.getByRole('button', { name: choice, exact: true }).click();
  if (choice === ro.add.nutritionYes) await photo(page);
  await expect(page.getByRole('heading', { name: ro.add.confirmTitle, exact: true })).toBeVisible();
  await expect(page.getByText(ro.review.unclearText, { exact: true })).toHaveCount(0);
}
async function result(page: Page, id: string, scored = false) {
  await expect(page).toHaveURL(new RegExp(`/product/${id}$`));
  await expect(page.getByRole('heading', { name: example.product.name, exact: true })).toBeVisible();
  await expect(page.getByText(ro.result.unverifiedNote, { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: ro.result.allergens, exact: true })).toBeVisible();
  if (scored) {
    await expect(page.getByRole('img', { name: ro.score.ringLabel(example.score.score!, example.score.grade) })).toBeVisible();
    await expect(page.getByText(ro.score.disclaimer, { exact: true }).filter({ visible: true })).toBeVisible();
  } else {
    await expect(page.getByText(ro.result.scoreUnavailable, { exact: true })).toBeVisible();
    await expect(page.getByRole('img', { name: /din 100, calitate/ })).toHaveCount(0);
  }
}

for (const [mode, choice] of [['none', ro.add.nutritionNone], ['skipped', ro.add.nutritionSkip]] as const) {
  test(`${mode}: front and ingredients save without a nutrition score`, async ({ page, session }) => {
    await begin(page); await review(page, choice);
    await page.getByRole('button', { name: ro.add.confirmSave, exact: true }).click();
    await result(page, (await session.state()).productId);
    const state = await session.state();
    const read = state.calls.find(call => call.name === 'read-label')!;
    const add = state.calls.find(call => call.name === 'add-product')!;
    expect(read.body).toMatchObject({ nutrition: mode, nutritionImage: null });
    expect(add.body).toMatchObject({ nutrients: nulls, nutritionPhotoPath: null });
  });
}

test('readable separate table retains label values and shows a score', async ({ page, session }) => {
  await begin(page); await review(page, ro.add.nutritionYes);
  await page.getByRole('button', { name: `${ro.add.categoryOptional}: ${ro.add.unknownCategory}`, exact: true }).click();
  await page.getByRole('button', { name: `${ro.review.category}: ${category.name}`, exact: true }).click();
  await page.getByRole('button', { name: ro.add.confirmSave, exact: true }).click();
  await result(page, (await session.state()).productId, true);
  const state = await session.state();
  expect(state.calls.find(call => call.name === 'add-product')!.body).toMatchObject({
    nutrients: example.product.nutrients, categorySlug: example.product.category.slug,
  });
});

test('direct add uses variant 1 and saves an unbranded partial table without optional warnings', async ({ page, session }) => {
  await session.configure('partial-unbranded');
  await page.goto('/add');
  await fillIdentity(page);
  await expect(page.getByRole('heading', { name: ro.add.frontTitle, exact: true })).toBeVisible();
  await expect(page.getByText(ro.add.nutritionQuestion, { exact: true })).toHaveCount(0);
  await photo(page);
  await expect(page.getByRole('heading', { name: ro.add.ingredientsTitle, exact: true })).toBeVisible();
  await expect(page.getByText(ro.add.nutritionQuestion, { exact: true })).toHaveCount(0);
  await photo(page);
  await review(page, ro.add.nutritionYes);
  await expect(page.getByText(ro.add.nutritionUnreadable, { exact: true })).toHaveCount(0);
  await page.goto('/add');
  await page.getByRole('button', { name: ro.add.confirmTitle, exact: true }).click();
  await expect(page.getByRole('heading', { name: ro.add.confirmTitle, exact: true })).toBeVisible();
  await page.goto(`/add?code=${example.product.code}`);
  await page.getByRole('button', { name: ro.add.resumeDraft, exact: true }).click();
  await page.getByRole('button', { name: ro.add.confirmTitle, exact: true }).click();
  expect((await session.state()).calls.filter(call => call.name === 'read-label')).toHaveLength(1);
  await page.getByRole('button', { name: ro.add.confirmSave, exact: true }).click();
  const state = await session.state();
  await result(page, state.productId);
  const add = state.calls.find(call => call.name === 'add-product')!;
  expect(add.body).toMatchObject({ brand: '', nutrients: { ...example.product.nutrients, fiber: null, fruitVegPct: null } });
  expect(add.body).not.toHaveProperty('categorySlug');
});

test('discarding a different product draft starts a usable front-photo step', async ({ page, session }) => {
  await begin(page); await review(page, ro.add.nutritionNone);
  await page.goto('/add?code=96385074');
  await page.getByRole('button', { name: ro.add.discardDraft, exact: true }).click();
  await fillIdentity(page);
  await expect(page.getByRole('heading', { name: ro.add.frontTitle, exact: true })).toBeVisible();
  await photo(page);
  await expect(page.getByRole('heading', { name: ro.add.ingredientsTitle, exact: true })).toBeVisible();
  expect((await session.state()).calls.filter(call => call.name === 'read-label')).toHaveLength(1);
});

test('unreadable optional table continues with ingredients without a blurry warning', async ({ page, session }) => {
  await session.configure('unreadable'); await begin(page);
  await page.getByRole('button', { name: ro.add.nutritionYes, exact: true }).click(); await photo(page);
  await page.getByRole('button', { name: ro.add.continueIngredients, exact: true }).click();
  await expect(page.getByText(ro.review.unclearText, { exact: true })).toHaveCount(0);
  await expect(page.getByText(ro.add.nutritionUnreadable, { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: ro.add.confirmSave, exact: true }).click();
  await result(page, (await session.state()).productId);
  const state = await session.state();
  expect(state.calls.filter(call => call.name === 'read-label')).toHaveLength(1);
  expect(state.calls.find(call => call.name === 'add-product')!.body.nutrients).toEqual(nulls);
});

test('two save taps while pending send one add-product request', async ({ page, session }) => {
  await session.configure('readable', 'add-product'); await begin(page); await review(page, ro.add.nutritionNone);
  const save = page.getByRole('button', { name: ro.add.confirmSave, exact: true });
  // Dispatch both taps in one browser turn, before React can render the disabled state.
  await save.evaluate(element => { (element as HTMLElement).click(); (element as HTMLElement).click(); });
  await expect.poll(async () => (await session.state()).calls.filter(call => call.name === 'add-product').length).toBe(1);
  await expect(page.getByRole('button', { name: ro.add.savePending, exact: true })).toBeDisabled();
  await session.release(); const state = await session.state(); await result(page, state.productId);
  expect((await session.state()).calls.filter(call => call.name === 'add-product')).toHaveLength(1);
});

test('reload during read-label restores draft photos without replaying the request', async ({ page, session }) => {
  await session.configure('readable', 'read-label'); await begin(page);
  await page.getByRole('button', { name: ro.add.nutritionNone, exact: true }).click();
  await expect.poll(async () => (await session.state()).calls.filter(call => call.name === 'read-label').length).toBe(1);
  await page.reload();
  await expect(page.getByText(ro.add.draftRestored, { exact: true })).toBeVisible();
  await expect(page.getByText(ro.add.draftInterrupted, { exact: true })).toBeVisible();
  const draft = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const opening = indexedDB.open('okbite-photos'); opening.onsuccess = () => resolve(opening.result); opening.onerror = () => reject(opening.error);
    });
    const keys = await new Promise<IDBValidKey[]>(resolve => {
      const request = db.transaction('photos').objectStore('photos').getAllKeys(); request.onsuccess = () => resolve(request.result);
    }); db.close();
    const drafts = await new Promise<IDBDatabase>(resolve => {
      const opening = indexedDB.open('okbite-unknown-draft'); opening.onsuccess = () => resolve(opening.result);
    });
    const snapshot = await new Promise<string>(resolve => {
      const request = drafts.transaction('drafts').objectStore('drafts').get('snapshot-v1'); request.onsuccess = () => resolve(request.result);
    }); drafts.close(); return { keys, photos: JSON.parse(snapshot).photos };
  });
  expect(draft.keys).toHaveLength(2);
  expect(draft.photos.front).toEqual(expect.any(String));
  expect(draft.photos.ingredients).toEqual(expect.any(String));
  expect(draft.photos.front).not.toBe(draft.photos.ingredients);
  expect(draft.keys).toEqual(expect.arrayContaining([draft.photos.front, draft.photos.ingredients]));
  const cacheAudit = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>(resolve => {
      const opening = indexedDB.open('okbite-photos'); opening.onsuccess = () => resolve(opening.result);
    });
    const photos = await new Promise<(Blob | { bytes: ArrayBuffer })[]>(resolve => {
      const request = db.transaction('photos').objectStore('photos').getAll(); request.onsuccess = () => resolve(request.result);
    }); db.close();
    const hash = async (blob: Blob) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))).join(',');
    const photoHashes = await Promise.all(photos.map(record => hash(record instanceof Blob ? record : new Blob([record.bytes]))));
    const cached = await Promise.all((await caches.keys()).map(async name => {
      const cache = await caches.open(name);
      return Promise.all((await cache.keys()).map(async request => ({ url: request.url,
        photo: photoHashes.includes(await hash(await (await cache.match(request))!.blob())) })));
    })); return cached.flat();
  });
  expect(cacheAudit.some(entry => entry.photo || /^(blob:|data:)|\/functions\/v1\/(?!lookup)|\/storage\/v1\/object\/uploads\//.test(entry.url))).toBe(false);
  await session.release();
  expect((await session.state()).calls.filter(call => call.name === 'read-label')).toHaveLength(1);
});

test('later nutrition enrichment keeps the saved product ID and adds values', async ({ page, context, session }) => {
  await begin(page); await review(page, ro.add.nutritionNone);
  await page.getByRole('button', { name: `${ro.add.categoryOptional}: ${ro.add.unknownCategory}`, exact: true }).click();
  await page.getByRole('button', { name: `${ro.review.category}: ${category.name}`, exact: true }).click();
  await page.getByRole('button', { name: ro.add.confirmSave, exact: true }).click();
  const { productId } = await session.state(); await result(page, productId);
  await page.getByRole('button', { name: ro.result.addNutrition, exact: true }).click(); await photo(page);
  await page.getByRole('button', { name: ro.add.confirmSave, exact: true }).click();
  await result(page, productId, true);
  const calls = (await session.state()).calls;
  expect(calls.filter(call => call.name === 'add-product')).toHaveLength(1);
  expect(calls.find(call => call.name === 'enrich-product')!.body).toMatchObject({ productId, nutrients: example.product.nutrients });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  // Try the actual POST bodies after each response was received online.
  for (const call of calls) expect(await page.evaluate(async call => {
    try { await fetch(`/functions/v1/${call.name}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(call.body) }); return false; }
    catch { return true; }
  }, call)).toBe(true);
});
