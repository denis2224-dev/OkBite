import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { NUTRIENT_KEYS } from '@okbite/shared';
import { ro } from '../../copy/ro';
import { lookupFound } from '../capture/__fixtures__/responses';
import { clearUnknownDraft, loadUnknownDraft, saveUnknownDraftIfCurrent, type UnknownDraftSnapshot } from './unknownDraft';
import { requestUnknownFlow } from './unknownFlowTransport';
import { completeUnknownDraft } from './completeUnknownDraft';
import { draftToGuided } from './guidedDraftAdapter';
import { ResultView } from '../product/ResultView';
import { UnknownReviewScreen } from './UnknownReviewScreen';

type Reasons = NonNullable<NonNullable<UnknownDraftSnapshot['label']>['reasons']>;

const mockReplace = jest.fn();
const mockParams: { value: Record<string, string | string[] | undefined> } = { value: {} };

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => mockParams.value,
  useFocusEffect: (fn: () => void) => jest.requireActual<typeof import('react')>('react').useEffect(fn, [fn]),
}));
jest.mock('./unknownDraft', () => ({
  ...jest.requireActual('./unknownDraftRepository'),
  loadUnknownDraft: jest.fn(),
  saveUnknownDraft: jest.fn(),
  saveUnknownDraftIfCurrent: jest.fn(async () => true),
  clearUnknownDraft: jest.fn(),
}));
jest.mock('./unknownFlowTransport', () => ({ requestUnknownFlow: jest.fn() }));
jest.mock('./completeUnknownDraft', () => ({ completeUnknownDraft: jest.fn() }));
jest.mock('../offline/photos', () => ({
  openPhoto: jest.fn(async (id: string) => ({ uri: `blob:${id}`, release: jest.fn() })),
}));

const emptyNutrients = Object.fromEntries(NUTRIENT_KEYS.map(key => [key, null])) as UnknownDraftSnapshot['label'] extends { nutrients: infer N } ? N : never;
const storedDraft: UnknownDraftSnapshot = {
  version: 1,
  id: 'draft-1',
  initial: {
    code: '4840001000014',
    name: 'Kefir Tradițional',
    brand: 'Lăptăria',
    quantity: '500 ml',
    photoPath: 'uploads/front.jpg',
    frontPhotoId: 'kept-front',
  },
  stage: 'review',
  nutritionMode: 'none',
  photos: { front: 'kept-front', ingredients: 'kept-ing', nutrition: null },
  label: {
    ingredientsText: 'lapte pasteurizat, culturi lactice',
    unit: null,
    nutrients: emptyNutrients,
    unclear: [],
    ingredientsPhotoPath: 'uploads/ing-receipt-1.jpg',
    nutritionPhotoPath: null,
    reasons: Object.fromEntries([...NUTRIENT_KEYS, 'ingredientsText'].map(k => [k, k === 'ingredientsText' ? 'read' : 'not_printed'])) as Reasons,
  },
  readStatus: 'complete',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.value = { unknownDraftId: 'draft-1' };
  jest.mocked(loadUnknownDraft).mockResolvedValue(storedDraft);
  jest.mocked(completeUnknownDraft).mockResolvedValue();
});

test('reload restores the saved draft without calling read-label again', async () => {
  const first = await render(<UnknownReviewScreen />);
  await act(async () => {});
  expect(screen.getByText('Kefir Tradițional')).toBeTruthy();
  expect(screen.getByText('lapte pasteurizat, culturi lactice')).toBeTruthy();

  await first.unmount();
  await render(<UnknownReviewScreen />);
  await act(async () => {});

  expect(screen.getByText('Kefir Tradițional')).toBeTruthy();
  expect(requestUnknownFlow).not.toHaveBeenCalledWith('read-label', expect.anything(), expect.anything(), expect.anything());
});

test('a corrected failed ingredient read stays valid when the draft is restored for a retake', async () => {
  jest.mocked(loadUnknownDraft).mockResolvedValueOnce({ ...storedDraft,
    label: { ...storedDraft.label!, ingredientsText: null, unclear: ['ingredientsText'],
      reasons: { ...storedDraft.label!.reasons!, ingredientsText: 'failed' } },
  });
  await render(<UnknownReviewScreen />);
  const corrected = 'Făină de grâu. Poate conține urme de lapte.';
  await fireEvent.press(screen.getByRole('button', { name: ro.review.ingredients }));
  await fireEvent.changeText(screen.getByLabelText(ro.review.ingredients), corrected);
  const saved = jest.mocked(saveUnknownDraftIfCurrent).mock.calls.at(-1)![0];
  expect(draftToGuided(saved).label).toMatchObject({
    ingredientsText: corrected, reasons: { ingredientsText: 'read' }, unclear: [],
  });
});

test('double tap creates one add-product request, reuses ingredientsPhotoPath on retry, and clears draft only after found', async () => {
  let resolveAttempt1!: (val: unknown) => void;
  let rejectAttempt1!: (err: unknown) => void;
  jest.mocked(requestUnknownFlow)
    .mockImplementationOnce(() => new Promise((res, rej) => { resolveAttempt1 = res; rejectAttempt1 = rej; }))
    .mockResolvedValueOnce(lookupFound);

  await render(<UnknownReviewScreen />);
  await act(async () => {});

  // No nutrition table: the unit is asked with one tap and kept in the draft for a reload.
  await act(async () => { await fireEvent.press(screen.getByRole('button', { name: ro.add.unitGram })); });
  expect(saveUnknownDraftIfCurrent).toHaveBeenLastCalledWith(expect.objectContaining({ label: expect.objectContaining({ unit: 'g' }) }));

  const saveBtn = screen.getByRole('button', { name: ro.add.confirmSave });
  await fireEvent.press(saveBtn);
  await fireEvent.press(saveBtn);

  expect(requestUnknownFlow).toHaveBeenCalledTimes(1);
  expect(jest.mocked(requestUnknownFlow).mock.calls[0]?.[0]).toBe('add-product');
  expect(jest.mocked(requestUnknownFlow).mock.calls[0]?.[3]).toMatchObject({
    ingredientsPhotoPath: 'uploads/ing-receipt-1.jpg',
  });

  // Fail first attempt: draft must NOT be cleared
  await act(async () => {
    rejectAttempt1(new Error('offline'));
  });
  expect(completeUnknownDraft).not.toHaveBeenCalled();
  expect(clearUnknownDraft).not.toHaveBeenCalled();

  // Retry: reuses exact same ingredientsPhotoPath and completes once found
  await act(async () => {
    await fireEvent.press(screen.getByRole('button', { name: ro.add.confirmSave }));
  });
  expect(requestUnknownFlow).toHaveBeenCalledTimes(2);
  expect(jest.mocked(requestUnknownFlow).mock.calls[1]?.[3]).toMatchObject({
    ingredientsPhotoPath: 'uploads/ing-receipt-1.jpg',
  });
  if (lookupFound.status !== 'found') throw new Error('Expected found fixture');
  expect(completeUnknownDraft).toHaveBeenCalledWith(expect.objectContaining({ id: 'draft-1' }), lookupFound);
  expect(mockReplace).toHaveBeenCalledWith(`/product/${lookupFound.product.id}`);
  void resolveAttempt1;
});

test('per-photo retake navigates to /add with retake kind while keeping draft edits', async () => {
  jest.mocked(loadUnknownDraft).mockResolvedValueOnce({
    ...storedDraft,
    label: {
      ...storedDraft.label!,
      unclear: ['kcal'],
      reasons: { ...storedDraft.label!.reasons!, kcal: 'unreadable' },
    },
  });
  await render(<UnknownReviewScreen />);
  await act(async () => {});

  await fireEvent.press(screen.getByRole('button', { name: ro.review.name }));
  await fireEvent.changeText(screen.getByLabelText(ro.review.name), 'Kefir Nou');
  expect(saveUnknownDraftIfCurrent).toHaveBeenCalledWith(
    expect.objectContaining({
      initial: expect.objectContaining({ name: 'Kefir Nou' }),
    }),
  );

  await fireEvent.press(screen.getByRole('button', { name: `${ro.add.retakePhoto}: ${ro.review.nutritionTitle}` }));
  expect(mockReplace).toHaveBeenCalledWith({
    pathname: '/add',
    params: { unknownDraftId: 'draft-1', retake: 'nutrition' },
  });
});

test('manual fallback persists edited identity before retaking ingredients', async () => {
  jest.mocked(loadUnknownDraft).mockResolvedValueOnce({ ...storedDraft,
    label: { ...storedDraft.label!, ingredientsText: null, unclear: ['ingredientsText'],
      reasons: { ...storedDraft.label!.reasons!, ingredientsText: 'unreadable' } } });
  await render(<UnknownReviewScreen />);
  await act(async () => {});
  await fireEvent.press(screen.getByRole('button', { name: ro.add.manualEntry }));
  await fireEvent.changeText(screen.getByLabelText(ro.review.name), 'Denumire corectată');
  await fireEvent.changeText(screen.getByLabelText(ro.review.brand), '');
  await fireEvent.press(screen.getByRole('button', { name: ro.review.retakePhotos }));
  expect(saveUnknownDraftIfCurrent).toHaveBeenLastCalledWith(expect.objectContaining({
    initial: expect.objectContaining({ name: 'Denumire corectată', brand: null }),
  }));
  expect(mockReplace).toHaveBeenCalledWith({ pathname: '/add', params: { unknownDraftId: 'draft-1', retake: 'ingredients' } });
});

test('manual retake does not navigate after leaving while draft persistence is pending', async () => {
  jest.mocked(loadUnknownDraft).mockResolvedValueOnce({ ...storedDraft,
    label: { ...storedDraft.label!, ingredientsText: null, unclear: ['ingredientsText'],
      reasons: { ...storedDraft.label!.reasons!, ingredientsText: 'unreadable' } } });
  let finish!: (saved: boolean) => void;
  jest.mocked(saveUnknownDraftIfCurrent).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const view = await render(<UnknownReviewScreen />);
  await act(async () => {});
  await fireEvent.press(screen.getByRole('button', { name: ro.add.manualEntry }));
  await fireEvent.press(screen.getByRole('button', { name: ro.review.retakePhotos }));
  await view.unmount();
  await act(async () => { finish(true); });
  expect(mockReplace).not.toHaveBeenCalled();
});

test('recalculates multilingual allergens and traces live before save and preserves them through reopened ResultView', async () => {
  if (lookupFound.status !== 'found') throw new Error('Expected found fixture');
  const ingredientsText = 'Ingredients: WHEAT flour. May contain MILK and PEANUTS.';
  const savedProduct = {
    ...lookupFound.product,
    status: 'unverified' as const,
    name: 'Bona Vita Musli Crunchy cu fructe 30%',
    quantity: '375 g',
    ingredientsText,
    allergens: ['Gluten'] as const,
    mayContain: ['Arahide', 'Lapte'] as const,
  };
  const savedResponse = { status: 'found' as const, product: { ...savedProduct, allergens: [...savedProduct.allergens], mayContain: [...savedProduct.mayContain] }, score: lookupFound.score };
  jest.mocked(loadUnknownDraft).mockResolvedValueOnce({
    ...storedDraft,
    initial: { ...storedDraft.initial, name: 'Bona Vita Musli Crunchy cu fructe 30%', quantity: '375 g', identityConfirmed: true },
    label: { ...storedDraft.label!, unit: 'g', ingredientsText: 'apă, sare' },
  });
  jest.mocked(requestUnknownFlow).mockResolvedValueOnce(savedResponse);

  const view = await render(<UnknownReviewScreen />);
  await act(async () => {});

  await fireEvent.press(screen.getByRole('button', { name: ro.review.ingredients }));
  await fireEvent.changeText(screen.getByLabelText(ro.review.ingredients), ingredientsText);

  expect(screen.getByLabelText('Gluten')).toBeTruthy();
  expect(screen.getByLabelText(`${ro.result.mayContain} Lapte`)).toBeTruthy();
  expect(screen.getByLabelText(`${ro.result.mayContain} Arahide`)).toBeTruthy();
  expect(screen.queryByLabelText('Lapte')).toBeNull();
  expect(screen.queryByLabelText('Arahide')).toBeNull();

  await act(async () => {
    await fireEvent.press(screen.getByRole('button', { name: ro.add.confirmSave }));
  });

  expect(requestUnknownFlow).toHaveBeenCalledWith(
    'add-product',
    expect.anything(),
    expect.anything(),
    expect.objectContaining({
      name: 'Bona Vita Musli Crunchy cu fructe 30%',
      quantity: '375 g',
      ingredientsText,
    }),
  );
  expect(completeUnknownDraft).toHaveBeenCalledWith(
    expect.objectContaining({
      initial: expect.objectContaining({ name: 'Bona Vita Musli Crunchy cu fructe 30%', quantity: '375 g' }),
    }),
    savedResponse,
  );

  await view.unmount();
  await render(<ResultView product={savedResponse.product} score={savedResponse.score} />);
  expect(screen.getByText('Bona Vita Musli Crunchy cu fructe 30%')).toBeTruthy();
  expect(screen.getByText(ro.result.allergens)).toBeTruthy();
  expect(screen.getByText(ro.result.mayContain)).toBeTruthy();
  expect(screen.getByText(ingredientsText)).toBeTruthy();
  expect(screen.getAllByText(ro.result.unverified).length).toBeGreaterThanOrEqual(1);
  expect(screen.getByLabelText('Gluten')).toBeTruthy();
  expect(screen.getByLabelText(`${ro.result.mayContain} Lapte`)).toBeTruthy();
  expect(screen.getByLabelText(`${ro.result.mayContain} Arahide`)).toBeTruthy();
  expect(screen.queryByLabelText('Lapte')).toBeNull();
  expect(screen.queryByLabelText('Arahide')).toBeNull();
  expect(screen.getByText(ro.result.missingAllergenNote)).toBeTruthy();
  expect(screen.queryByText(ro.result.noAllergens)).toBeNull();
});

