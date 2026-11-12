import { guidedToDraft, draftToGuided } from './guidedDraftAdapter';
import { NUTRIENT_KEYS, ReadLabelResponse } from '@okbite/shared';
import { createGuidedFlow } from './guidedFlow';
import type { GuidedFlowDependencies } from './guidedFlowTypes';

const initial = { code: '4840001000014', name: null, brand: null, quantity: null, photoPath: null };
test('persists pending state and restores interrupted without calling an API', () => {
  const flow = createGuidedFlow(initial, {} as GuidedFlowDependencies);
  const state = { ...flow.getState(), stage: 'working' as const, photos: { front: 'front-id', ingredients: 'ingredients-id', nutrition: null }, nutritionMode: 'none' as const };
  const draft = guidedToDraft(state, 'draft-1');
  expect(draft.readStatus).toBe('pending');
  expect(draft.photos).toEqual(state.photos);
  const restored = draftToGuided({ ...draft, readStatus: 'interrupted' });
  expect(restored.stage).toBe('interrupted');
  expect(restored.scannedCode).toBe('4840001000014');
  expect(restored.nutritionMode).toBe('none');
});
test('keeps the ingredients question on reload when no read was started', () => {
  const flow = createGuidedFlow({ ...initial, photoPath: 'device/front.jpg' }, {} as GuidedFlowDependencies);
  const state = { ...flow.getState(), stage: 'nutrition_question' as const, photos: { front: 'front-id', ingredients: 'ing-id', nutrition: null } };
  const restored = draftToGuided(guidedToDraft(state, 'draft-2'));
  expect(restored.stage).toBe('nutrition_question');
  expect(restored.photos.ingredients).toBe('ing-id');
});

test('restores a previously edited draft with stale OCR reasons', () => {
  const flow = createGuidedFlow(initial, {} as GuidedFlowDependencies);
  const ingredientsText = 'Făină de grâu. Poate conține urme de lapte.';
  const label = ReadLabelResponse.innerType().parse({
    ingredientsText, unit: 'g', ingredientsPhotoPath: 'device/ingredients.jpg', nutritionPhotoPath: null,
    nutrients: Object.fromEntries(NUTRIENT_KEYS.map(key => [key, null])),
    unclear: ['ingredientsText'],
    reasons: { ...Object.fromEntries(NUTRIENT_KEYS.map(key => [key, 'not_photographed'])), ingredientsText: 'failed' },
  });
  const draft = guidedToDraft(flow.getState(), 'draft-3');
  expect(draftToGuided({ ...draft, stage: 'review', label }).label).toMatchObject({
    ingredientsText, reasons: { ingredientsText: 'read' }, unclear: [],
  });
});
