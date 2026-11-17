import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { LookupResponse } from '../packages/shared/src/contract';
import { ro } from '../apps/mobile/src/copy/ro';
// The OFF photo is served by a stub so the spec never depends on images.openfoodfacts.org.
test.use({serviceWorkers: 'block'});
const fixture = LookupResponse.parse({status: 'found', ...JSON.parse(readFileSync('apps/mobile/src/test/preview-data.json', 'utf8'))[0]});
if (fixture.status !== 'found') throw new Error('Expected existing found fixture');
const imageUrl = 'https://images.openfoodfacts.org/images/products/301/762/042/2003/front_en.879.400.jpg';
const product = {...fixture.product, status: 'unverified' as const, source: 'Open Food Facts (ODbL)', imageUrl};
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

test('OFF result: photo first, no Unverified badge, source note last', async ({ page }) => {
  await page.route('**/functions/v1/lookup*', route => route.fulfill({json: {status: 'found', product, score: fixture.score}}));
  await page.route(imageUrl, route => route.fulfill({contentType: 'image/png', body: png}));
  await page.goto(`/product/${product.id}`);
  const photo = page.getByRole('img', {name: product.name, exact: true});
  await expect(photo).toBeVisible();
  await expect(page.getByText(ro.result.unverified, {exact: true})).toHaveCount(0);
  const note = page.getByText(ro.result.offNote, {exact: true});
  await expect(note).toBeAttached();
  const top = async (l: typeof note) => (await l.boundingBox())!.y;
  expect(await top(photo)).toBeLessThan(await top(page.getByText(product.name, {exact: true}).first()));
  expect(await top(note)).toBeGreaterThan(await top(page.getByText(ro.result.original, {exact: true})));
  await page.screenshot({path: test.info().outputPath('off-result-top.png')});
  await note.scrollIntoViewIfNeeded();
  await page.screenshot({path: test.info().outputPath('off-result-bottom.png')});
});

test('a photo that fails to load falls back to the initials tile', async ({ page }) => {
  await page.route('**/functions/v1/lookup*', route => route.fulfill({json: {status: 'found', product, score: fixture.score}}));
  await page.route(imageUrl, route => route.fulfill({status: 404}));
  await page.goto(`/product/${product.id}`);
  await expect(page.getByTestId('product-photo-placeholder')).toBeAttached();
  await expect(page.getByRole('img', {name: product.name, exact: true})).toHaveCount(0);
});
