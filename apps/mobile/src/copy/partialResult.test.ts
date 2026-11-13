import { ro } from './ro';
import { roStrings } from './strings.ro';
import { en } from './strings.en';

const required = ['nutritionUnavailable', 'insufficientNutrition', 'categoryUnconfirmed', 'transcribedLabel', 'explainedWithSource', 'missingAllergenNote', 'addNutrition', 'nutritionAdded'] as const;
it.each(required)('provides the U8 result message %s without typographic diacritic substitutions', key => {
  const message = Reflect.get(ro.result, key);
  expect(message).toEqual(expect.any(String));
  expect(message).toMatch(/\S/);
  expect(message).not.toMatch(/[şţŞŢ]/);
});
it('keeps omission reasons and the four nutrition answers distinct', () => {
  expect(new Set([ro.add.notPrinted, ro.add.notPhotographed, ro.add.unreadableText, ro.add.processingFailed]).size).toBe(4);
  expect(new Set([ro.add.nutritionYes, ro.add.nutritionSame, ro.add.nutritionNone, ro.add.nutritionSkip]).size).toBe(4);
});
it('never describes missing allergen evidence as proof of safety', () => {
  expect(roStrings.result.missingAllergenNote).toBe('Verifică mereu ambalajul: lista poate fi incompletă.');
  expect(en.result.missingAllergenNote).toBe('Always check the package: this list may be incomplete.');
  expect(Object.keys(roStrings.result)).not.toContain('allergyNote');
});
it('keeps partial-data lines to one short sentence without describing the method', () => {
  for (const copy of [roStrings, en]) {
    for (const key of ['insufficientNutrition', 'categoryUnconfirmed', 'missing', 'unverifiedNote'] as const) {
      expect(copy.result[key].split(/[.!?](\s|$)/).filter(part => part?.trim()).length).toBe(1);
      expect(copy.result[key].length).toBeLessThan(70);
    }
  }
  expect(roStrings.result.missing).not.toMatch(/estimăm/);
  expect(en.result.missing).not.toMatch(/estimate/);
  expect([roStrings.result.transcribedLabel, en.result.transcribedLabel]).toEqual(['Ingrediente', 'Ingredients']);
  expect([roStrings.result.explainedWithSource, en.result.explainedWithSource]).toEqual(['Explicate', 'Explained']);
  expect([roStrings.result.unverifiedNote, en.result.unverifiedNote]).toEqual(['Adăugat de un utilizator; încă neverificat.', 'Added by a shopper; not yet checked.']);
});
