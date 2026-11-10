import { ro } from './ro';

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
  expect(Reflect.get(ro.result, 'missingAllergenNote')).toMatch(/nu înseamnă/);
});
