import { redesignRo, roStrings } from './strings.ro';
import { en, redesignEn } from './strings.en';
import { ALLERGENS } from '@okbite/shared';
import { ro } from './ro';

const required = ['nav.scan', 'nav.profile', 'nav.settings', 'tiers.excellent', 'tiers.good', 'tiers.fair', 'tiers.poor', 'tiers.bad', 'tiers.why', 'tiers.nutriScore', 'ledger.sugar', 'ledger.sat', 'ledger.salt', 'ledger.kcal', 'ledger.nutrition_other', 'ledger.additive', 'ledger.processing', 'ledger.cap', 'processing.unknown', 'additives.notAssessed', 'profile.savedLocally', 'onboarding.skip', 'settings.resetOnboarding', 'about.methodBody', 'scan.flashOn', 'scan.flashOff', 'scan.loadingReader', 'history.search', 'history.noMatches', 'history.remove', 'history.removed', 'history.undo', 'history.removeError', 'history.restoreError',
 'nav.allergies', 'allergies.title', 'allergies.lead', 'allergies.allergensLabel', 'allergies.avoidTitle', 'result.whyLetter', 'result.ingredientsTile', 'result.portionTile', 'result.profileAlertSub',
 'result.containsAllergen', 'result.mayContainAllergen', 'compare.design.better', 'compare.design.betterValue', 'compare.design.profileWarning',
 'scan.labelMode', 'scan.seeAll'];
const get = (object: unknown, path: string): unknown => path.split('.').reduce<unknown>((value, key) => (value as Record<string, unknown> | undefined)?.[key], object);
it.each(required)('makes the redesign key %s available to existing ro imports', path => {
 expect(get(ro, path)).toBeDefined();
});
it('names all 14 allergens using the shared contract keys', () => {
 const names = get(ro, 'allergens') as Record<string, string>;
 expect(names && Object.keys(names)).toEqual([...ALLERGENS]);
});

function leaves(object: unknown, prefix = ''): [string, unknown][] {
 return Object.entries(object as Record<string, unknown>).flatMap(([key, value]) => {
  const path = prefix ? `${prefix}.${key}` : key;
  return value && typeof value === 'object' ? leaves(value, path) : [[path, value]];
 });
}
it('has matching nonempty translations for every redesign key in both languages', () => {
 const romanian = leaves(redesignRo), english = leaves(redesignEn);
 expect(english.map(([key]) => key)).toEqual(romanian.map(([key]) => key));
 for (const [, value] of [...romanian, ...english]) {
  expect(['string', 'function']).toContain(typeof value);
  if (typeof value === 'string') expect(value.trim()).not.toBe('');
 }
 expect(JSON.stringify(redesignRo)).not.toMatch(/[şţŞŢ]/);
});
it('keeps interpolation inputs in both languages', () => {
 expect(redesignRo.ledger.points(12)).toBe('−12 puncte');
 expect(redesignEn.ledger.points(12)).toBe('−12 points');
 expect(redesignRo.onboarding.step(2)).toBe('Pasul 2 din 3');
 expect(redesignEn.onboarding.step(2)).toBe('Step 2 of 3');
 expect(redesignRo.history.remove('Iaurt')).toContain('Iaurt');
 expect(redesignEn.history.remove('Yogurt')).toContain('Yogurt');
 expect(redesignRo.additives.open('E100')).toContain('E100');
 expect(redesignEn.additives.open('E100')).toContain('E100');
});
it('words the five-tab, allergies, result and compare additions in both languages', () => {
 expect(redesignRo.nav.allergies).toBe('Alergii');
 expect(redesignEn.nav.allergies).toBe('Allergies');
 expect(redesignRo.allergies.title).toBe('Alergiile tale');
 expect(redesignRo.allergies.avoidTitle).toBe('Vreau să evit');
 expect(redesignEn.allergies.avoidTitle).toBe('I want to avoid');
 expect(redesignRo.result.whyLetter('D')).toBe('De ce D');
 expect(redesignEn.result.whyLetter('D')).toBe('Why D');
 expect(redesignRo.result.containsAllergen('lapte')).toBe('Conține lapte');
 expect(redesignEn.result.containsAllergen('milk')).toBe('Contains milk');
 expect(redesignRo.result.mayContainAllergen('arahide')).toBe('Poate conține arahide');
 expect(redesignEn.result.mayContainAllergen('peanuts')).toBe('May contain peanuts');
 expect(roStrings.compare.design.better).toBe('Alegere mai bună');
 expect(en.compare.design.better).toBe('Better choice');
 expect(roStrings.compare.design.profileWarning('lapte')).toBe('Conține lapte, din lista ta');
 expect(en.compare.design.profileWarning('milk')).toBe('Contains milk, from your list');
 expect(en.compare.design.betterValue).toBe('Better value');
 expect(JSON.stringify(roStrings.compare)).not.toMatch(/[şţŞŢ]/);
});
it('translates all 14 contract allergens without changing their storage keys', () => {
 expect(Object.keys(redesignEn.allergens)).toEqual([...ALLERGENS]);
 expect(redesignEn.allergens['Țelină']).toBe('Celery');
 expect(redesignEn.allergens['Dioxid de sulf și sulfiți']).toBe('Sulphur dioxide and sulphites');
});
it('words the scan home segment and recent-scans link in both languages', () => {
 expect(redesignRo.scan.labelMode).toBe('Etichetă');
 expect(redesignEn.scan.labelMode).toBe('Label');
 expect(redesignRo.scan.seeAll).toBe('Vezi tot');
 expect(redesignEn.scan.seeAll).toBe('See all');
});
