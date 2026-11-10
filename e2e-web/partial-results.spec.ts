import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { LookupResponse, NUTRIENT_KEYS } from '../packages/shared/src/contract';
import { ro } from '../apps/mobile/src/copy/ro';
// Result rendering uses explicit API fixtures; offline/service-worker behavior has separate specs.
test.use({serviceWorkers: 'block'});
const fixture = LookupResponse.parse({status: 'found', ...JSON.parse(readFileSync('apps/mobile/src/test/preview-data.json', 'utf8'))[0]});
if (fixture.status !== 'found') throw new Error('Expected existing found fixture');
const {product, score} = fixture;
const empty = Object.fromEntries(NUTRIENT_KEYS.map(key => [key, null]));
async function doubledText(page: Page) {
  await page.evaluate(() => {
    const text = [...document.querySelectorAll<HTMLElement>('div,span')].filter(el => [...el.childNodes].some(n => n.nodeType === Node.TEXT_NODE && n.textContent?.trim()));
    const sizes = text.map(el => [el, getComputedStyle(el).fontSize, getComputedStyle(el).lineHeight] as const);
    for (const [el, size, height] of sizes) { el.style.fontSize = `${parseFloat(size) * 2}px`; if (height !== 'normal') el.style.lineHeight = `${parseFloat(height) * 2}px`; }
  });
}
for (const mode of ['light', 'dark'] as const) {
  test(`${mode}: missing, partial and unknown-category results at 200% text`, async ({ page }) => {
    await page.emulateMedia({colorScheme: mode});
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    let shown = {...product, status: 'unverified' as const, nutrients: {...product.nutrients, ...empty}};
    await page.route('**/functions/v1/lookup*', route => route.fulfill({json: {status:'found', product:shown, score}}));
    await page.goto(`/product/${product.id}`);
    await expect(page.getByText(ro.result.nutritionUnavailable, {exact:true})).toBeAttached();
    await expect(page.getByText(ro.score.title, {exact:true})).toHaveCount(0);
    await expect(page.getByText(ro.result.portion, {exact:true})).toHaveCount(0);
    await expect(page.getByText(product.ingredientsText, {exact:true})).toBeAttached();
    await expect(page.getByText(ro.result.unverifiedNote, {exact:true})).toBeAttached();
    await expect(page.getByRole('button', {name:ro.result.addNutrition, exact:true})).toHaveCount(process.env.EXPO_PUBLIC_NUTRITION_ENRICHMENT === '1' ? 1 : 0);
    await expect(page.getByRole('progressbar', {name:ro.app.loading})).toHaveCount(0);
    await doubledText(page);
    const note = page.getByText(ro.result.missingAllergenNote, {exact:true});
    await note.scrollIntoViewIfNeeded();
    await expect(note).toBeVisible();
    const bounds = (await note.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    await page.screenshot({path:test.info().outputPath(`${mode}-missing-200.png`)});
    const missing = page.getByText(ro.result.nutritionUnavailable, {exact:true});
    await missing.scrollIntoViewIfNeeded();
    await expect(missing).toBeVisible();
    await page.screenshot({path:test.info().outputPath(`${mode}-nutrition-200.png`)});
    shown = {...shown, nutrients:{...product.nutrients, ...empty, sugar:0, salt:.5}};
    await page.reload();
    await expect(page.getByText(ro.result.insufficientNutrition, {exact:true})).toBeAttached();
    await expect(page.getByRole('button', {name:ro.result.addNutrition, exact:true})).toHaveCount(0);
    await expect(page.getByText('0 g', {exact:true})).toBeAttached();
    await expect(page.getByText('0,5 g', {exact:true})).toBeAttached();
    await expect(page.getByText(ro.result.per100(product.unit), {exact:true})).toBeAttached();
    await expect(page.getByText(/% din referința zilnică/)).toHaveCount(0);
    await expect(page.getByRole('progressbar', {name:ro.app.loading})).toHaveCount(0);
    await doubledText(page);
    await page.getByText('0,5 g', {exact:true}).scrollIntoViewIfNeeded();
    await page.screenshot({path:test.info().outputPath(`${mode}-partial-200.png`)});
    shown = {...shown, nutrients:product.nutrients, category:{...product.category, slug:'necunoscut'}};
    await page.reload();
    await expect(page.getByText(ro.result.categoryUnconfirmed, {exact:true})).toBeAttached();
    await expect(page.getByText(ro.score.title, {exact:true})).toHaveCount(0);
    await page.getByRole('button', {name:ro.ingredients.title, exact:true}).click();
    await expect(page.getByText(ro.result.transcribedLabel, {exact:true})).toBeAttached();
    await expect(page.getByText(product.ingredientsText, {exact:true})).toBeAttached();
    expect(errors).toEqual([]);
  });
}
