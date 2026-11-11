import { test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { LookupResponse } from '../packages/shared/src/contract';

// Every case is intentionally a fixme: N7, N10 and N12 are absent from main.
// These existing preview fixtures are illustrative; never use them as food facts.
const fixtures = JSON.parse(readFileSync('apps/mobile/src/test/preview-data.json', 'utf8'))
  .map((entry: unknown) => LookupResponse.parse({ status: 'found', ...(entry as object) }));
const gluten = fixtures.find((entry: typeof fixtures[number]) => entry.status === 'found' && entry.product.allergens.includes('Gluten'));
const unavailable = fixtures.find((entry: typeof fixtures[number]) => entry.status === 'found' && entry.score.score === null);
if (!gluten || !unavailable) throw new Error('Expected existing gluten and unavailable preview fixtures');

const acceptance = [
  ['a · first launch skip opens Scan', 'fresh storage → skip onboarding → active root Scan tab'],
  ['b · gluten preference warns on result', 'onboarding Gluten → existing gluten fixture → personal allergen warning'],
  ['c · manual barcode opens result tier and Why', 'manual existing fixture code → result quality tier → Why explanation'],
  ['d · processing and missing nutrition stay unknown', 'processing resolves existing unavailable fixture → unavailable score and null nutrients, never zero'],
  ['e · history searches saved products', 'open existing preview products → History → search name → matching saved row'],
  ['f · history clear and onboarding reset persist', 'Settings → clear confirmation → empty history; reset onboarding → onboarding after reload'],
  ['g · offline tabs retain cached history', 'save existing preview result → wait for service worker → offline → all tabs and cached history remain reachable'],
  ['h · English tabs result and Why survive reload', 'Settings English → reload → English tabs → existing result → English Why'],
] as const;
for (const [title, steps] of acceptance) {
  test.fixme(title, async ({ page }) => {
    await page.goto('/');
    // Removing fixme alone must never turn an unimplemented acceptance flow green.
    throw new Error(`N15 awaits N7/N10/N12 and confirmed N2 selectors: ${steps}`);
  });
}
