import { guidedToDraft, draftToGuided } from './guidedDraftAdapter';
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
