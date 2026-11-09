import { ro } from './ro';

test.each(["frontTitle","frontHint","nutritionQuestion","nutritionYes","nutritionSame","nutritionNone","nutritionSkip","nutritionUnreadable","continueIngredients","confirmTitle","tapToEdit","retakePhoto","manualEntry","draftRestored","draftInterrupted","resumeDraft","discardDraft","confirmSave","retryRead","categoryOptional","unknownCategory","nutritionLater","nutritionSuccess","readingFront","ingredientsOnly","nutritionUnavailable","notPrinted","notPhotographed","unreadableText","processingFailed","noPer100","basisGram","basisMl","identityMissing","saveFailed","draftSaveFailed","enrichUnavailable","savePending"])('provides flat Romanian unknown-product copy for %s', key => {
  expect(Reflect.get(ro.add, key)).toEqual(expect.any(String));
  expect(Reflect.get(ro.add, key)).toMatch(/\S/);
});

test('keeps distinct nutrition answers and comma-below Romanian diacritics', () => {
  const values = ['nutritionYes', 'nutritionSame', 'nutritionNone', 'nutritionSkip'].map(key => Reflect.get(ro.add, key));
  expect(new Set(values).size).toBe(4);
  expect(JSON.stringify(ro.add)).not.toMatch(/[şţŞŢ]/);
});
