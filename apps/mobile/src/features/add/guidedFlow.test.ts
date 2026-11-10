import { createGuidedFlow } from './guidedFlow';

const initial = { code: null, brand: null, name: null, quantity: null, photoPath: 'uploads/front' };
const nutrients = { kcal: null, fat: null, sat: null, sugar: null, salt: null, protein: null, fiber: null, fruitVegPct: null };
// U1: a field is 'read' exactly when it has a value, so null nutrients carry another reason.
const reasons = { kcal: 'not_printed', fat: 'not_printed', sat: 'not_printed', sugar: 'not_printed', salt: 'not_printed', protein: 'not_printed', fiber: 'not_printed', fruitVegPct: 'not_printed', ingredientsText: 'read' };
const label = { ingredientsText: 'text from label', unit: null, nutrients, reasons, unclear: [], ingredientsPhotoPath: 'uploads/ingredients', nutritionPhotoPath: null };
function setup(response: unknown = label) {
  const deps = {
    preparePhoto: jest.fn(async (uri: string, _budget: number) => ({ uri, base64: `jpeg:${uri}`, bytes: 100 })),
    keepPhoto: jest.fn(async (uri: string) => `id:${uri}`),
    openPhoto: jest.fn(async (id: string) => ({ uri: id.slice(3), release: jest.fn() })),
    identify: jest.fn(async (_base64: string): Promise<unknown> => ({ status: 'not_found', read: { brand: null, name: null, quantity: null, code: null }, photoPath: 'uploads/newfront' })),
    readLabel: jest.fn(async (_request: unknown): Promise<unknown> => response),
    onIdentify: jest.fn(), onFound: jest.fn(), onReview: jest.fn(), persist: jest.fn(async () => {}),
  };
  return { deps, flow: createGuidedFlow(initial, deps) };
}

test.each(['separate', 'same_photo', 'none', 'skipped'] as const)('%s explicitly selects nutrition and submits once', async mode => {
  const { flow, deps } = setup();
  await flow.capturePhoto('ingredients');
  expect(flow.getState().stage).toBe('nutrition_question');
  await flow.chooseNutrition(mode);
  if (mode === 'separate') {
    expect(flow.getState().stage).toBe('nutrition');
    expect(deps.readLabel).not.toHaveBeenCalled();
    await flow.capturePhoto('nutrition');
  }
  expect(deps.readLabel).toHaveBeenCalledTimes(1);
  expect(deps.readLabel.mock.calls[0]?.[0]).toEqual({ ingredientsImage: 'jpeg:ingredients', nutritionImage: mode === 'separate' ? 'jpeg:nutrition' : null, nutrition: mode });
  const state = flow.getState();
  expect(state.stage).toBe('review');
  expect(state.initial.photoPath).toBe('uploads/front');
  expect(state.label?.ingredientsText).toBe('text from label');
  expect(state.label?.unit).toBeNull();
  if (mode === 'none' || mode === 'skipped') {
    expect(state.label?.nutrients).toEqual(nutrients);
    expect(state.label?.reasons.kcal).toBe(mode === 'none' ? 'not_printed' : 'not_photographed');
  }
});

test('unreadable optional nutrition continues without another AI request and retains photos', async () => {
  const { flow, deps } = setup({ ...label, reasons: { ...reasons, salt: 'no_per_100' }, unclear: ['salt'] });
  await flow.capturePhoto('ingredients'); await flow.chooseNutrition('separate'); await flow.capturePhoto('nutrition');
  expect(flow.getState().stage).toBe('nutrition_unreadable');
  const photos = flow.getState().photos;
  await flow.continueIngredientsOnly();
  expect(flow.getState().stage).toBe('review');
  expect(flow.getState().photos).toEqual(photos);
  expect(flow.getState().label?.nutrients).toEqual(nutrients);
  expect(flow.getState().label?.unclear).toEqual([]);
  expect(deps.readLabel).toHaveBeenCalledTimes(1);
});

test('code entry starts at front, retains scanned code and hands candidates back before adding', async () => {
  const { deps } = setup();
  deps.identify.mockResolvedValue({ status: 'candidates', candidates: [{ id: '00000000-0000-4000-8000-000000000001', name: 'read name', brand: 'read brand', quantity: '', imageUrl: null, similarity: 0.5 }], read: { brand: null, name: null, quantity: null, code: null }, photoPath: 'uploads/newfront' });
  const flow = createGuidedFlow({ ...initial, code: '4840001000014', photoPath: null }, deps);
  expect(flow.getState().stage).toBe('front');
  await flow.capturePhoto('front');
  expect(flow.getState().initial.code).toBe('4840001000014');
  expect(flow.getState().photos.front).toBe('id:front');
  expect(flow.getState().stage).toBe('interrupted');
  expect(deps.onIdentify).toHaveBeenCalledWith(expect.objectContaining({ status: 'candidates' }), '4840001000014', 'id:front');
  expect(deps.readLabel).not.toHaveBeenCalled();
});

test('double tap cannot submit twice and cancellation suppresses late navigation', async () => {
  let finish!: (value: unknown) => void;
  const { flow, deps } = setup();
  deps.readLabel.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await flow.capturePhoto('ingredients');
  const request = flow.chooseNutrition('same_photo');
  await flow.chooseNutrition('same_photo');
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(deps.readLabel).toHaveBeenCalledTimes(1);
  flow.cancel(); finish(label); await request;
  expect(flow.getState().stage).toBe('interrupted');
  expect(deps.onReview).not.toHaveBeenCalled();
});

test('invalid response fails closed with photos retained for manual entry', async () => {
  const { flow, deps } = setup({ ...label, nutrients: {} });
  await flow.capturePhoto('ingredients'); await flow.chooseNutrition('same_photo');
  expect(flow.getState()).toMatchObject({ stage: 'error', error: 'invalid_response', photos: { ingredients: 'id:ingredients' }, label: null });
  expect(deps.onReview).not.toHaveBeenCalled();
});

test('retry reuses the durable nutrition photo after a read failure', async () => {
  const { flow, deps } = setup();
  deps.readLabel.mockRejectedValueOnce(new Error('offline'));
  await flow.capturePhoto('ingredients'); await flow.chooseNutrition('separate'); await flow.capturePhoto('nutrition');
  const photos = flow.getState().photos;
  expect(flow.getState().stage).toBe('error');
  await flow.retry();
  expect(flow.getState().stage).toBe('review');
  expect(flow.getState().photos).toEqual(photos);
  expect(deps.keepPhoto).toHaveBeenCalledTimes(2);
});

test('a cancelled front request cannot identify or navigate after compression', async () => {
  let finish!: (photo: { uri: string; base64: string; bytes: number }) => void;
  const { deps } = setup();
  deps.preparePhoto.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const flow = createGuidedFlow({ ...initial, photoPath: null }, deps);
  const request = flow.capturePhoto('front'); flow.cancel();
  finish({ uri: 'front', base64: 'jpeg', bytes: 20 }); await request;
  expect(deps.identify).not.toHaveBeenCalled();
  expect(deps.keepPhoto).not.toHaveBeenCalled();
  expect(deps.onIdentify).not.toHaveBeenCalled();
  expect(deps.onFound).not.toHaveBeenCalled();
});

test('retaking nutrition keeps other durable photos and does not invent name or unit', async () => {
  const { flow } = setup();
  await flow.capturePhoto('ingredients'); await flow.chooseNutrition('separate'); await flow.capturePhoto('nutrition');
  flow.retake('nutrition'); await flow.capturePhoto('replacement');
  expect(flow.getState()).toMatchObject({ initial: { name: null }, photos: { front: null, ingredients: 'id:ingredients', nutrition: 'id:replacement' }, label: { unit: null } });
});

test('an oversized request fails before calling the provider', async () => {
  const { flow, deps } = setup();
  await flow.capturePhoto('ingredients');
  deps.preparePhoto.mockResolvedValue({ uri: 'compressed', base64: 'A'.repeat(2_000_001), bytes: 1_450_000 });
  await flow.chooseNutrition('same_photo');
  expect(flow.getState().stage).toBe('error');
  expect(deps.readLabel).not.toHaveBeenCalled();
});

test('nutrition is cleared explicitly even if the provider returns guessed values', async () => {
  const { flow } = setup({ ...label, nutrients: { ...nutrients, kcal: 123, salt: 2 }, reasons: { ...reasons, kcal: 'read', salt: 'read' }, unclear: ['kcal', 'ingredientsText'] });
  await flow.capturePhoto('ingredients'); await flow.chooseNutrition('none');
  expect(flow.getState().label).toMatchObject({ nutrients, reasons: { kcal: 'not_printed', salt: 'not_printed' }, unclear: ['ingredientsText'] });
});

test('legacy responses without U1 reasons fail closed', async () => {
  const { reasons: _reasons, ...legacy } = label;
  const { flow } = setup(legacy);
  await flow.capturePhoto('ingredients'); await flow.chooseNutrition('same_photo');
  expect(flow.getState()).toMatchObject({ stage: 'error', error: 'invalid_response', label: null });
});

test('restoring a pending read makes no automatic API call; explicit retry submits once', async () => {
  const { flow, deps } = setup();
  await flow.capturePhoto('ingredients'); await flow.chooseNutrition('separate');
  const restored = { ...flow.getState(), stage: 'working' as const, photos: { ...flow.getState().photos, nutrition: 'id:nutrition' } };
  const resumed = createGuidedFlow(initial, deps, restored);
  expect(resumed.getState().stage).toBe('interrupted');
  expect(deps.readLabel).not.toHaveBeenCalled();
  await resumed.retry();
  expect(resumed.getState().stage).toBe('review');
  expect(deps.readLabel).toHaveBeenCalledTimes(1);
});

test('not-found front reading becomes the initial read without losing barcode metadata', async () => {
  const { deps } = setup();
  deps.identify.mockResolvedValue({ status: 'not_found', read: { brand: 'read brand', name: null, quantity: null, code: null }, photoPath: 'uploads/newfront' });
  const flow = createGuidedFlow({ ...initial, code: '4840001000014', photoPath: null }, deps);
  await flow.capturePhoto('front');
  expect(flow.getState()).toMatchObject({ stage: 'ingredients', initialFrontRead: { brand: 'read brand', code: '4840001000014' }, remotePhotoPath: 'uploads/newfront' });
});

test('retaking front photo after label read preserves existing label and returns directly to review', async () => {
  const { flow, deps } = setup();
  await flow.capturePhoto('ingredients');
  await flow.chooseNutrition('none');
  expect(flow.getState().stage).toBe('review');
  deps.identify.mockResolvedValueOnce({
    status: 'not_found',
    read: { brand: 'Brand Nou', name: 'Nume Nou', quantity: '250 g', code: null },
    photoPath: 'uploads/retaken-front',
  });
  flow.retake('front');
  expect(flow.getState().stage).toBe('front');
  await flow.capturePhoto('new-front');
  expect(flow.getState()).toMatchObject({
    stage: 'review',
    initial: { brand: 'Brand Nou', name: 'Nume Nou', quantity: '250 g', photoPath: 'uploads/retaken-front', frontPhotoId: 'id:new-front' },
    photos: { front: 'id:new-front', ingredients: 'id:ingredients', nutrition: null },
    label: expect.objectContaining({ ingredientsText: 'text from label' }),
  });
  expect(deps.readLabel).toHaveBeenCalledTimes(1);
});

test('retaking ingredients photo after label read re-reads with existing nutritionMode and returns to review', async () => {
  const { flow, deps } = setup();
  await flow.capturePhoto('ingredients');
  await flow.chooseNutrition('none');
  expect(flow.getState().stage).toBe('review');
  deps.readLabel.mockResolvedValueOnce({ ...label, ingredientsText: 'ingrediente noi' });
  flow.retake('ingredients');
  expect(flow.getState().stage).toBe('ingredients');
  await flow.capturePhoto('new-ingredients');
  expect(flow.getState()).toMatchObject({
    stage: 'review',
    photos: { front: null, ingredients: 'id:new-ingredients', nutrition: null },
    label: expect.objectContaining({ ingredientsText: 'ingrediente noi' }),
  });
  expect(deps.readLabel).toHaveBeenCalledTimes(2);
});
