import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { NUTRIENT_KEYS } from '@okbite/shared';
import { ro } from '../../copy/ro';
import { lookupFound } from '../capture/__fixtures__/responses';
import { clearUnknownDraft, loadUnknownDraft, saveUnknownDraftIfCurrent, type UnknownDraftSnapshot } from './unknownDraft';
import { requestUnknownFlow } from './unknownFlowTransport';
import { completeUnknownDraft } from './completeUnknownDraft';
import { UnknownReviewScreen } from './UnknownReviewScreen';

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
    reasons: Object.fromEntries([...NUTRIENT_KEYS, 'ingredientsText'].map(k => [k, k === 'ingredientsText' ? 'read' : 'not_printed'])),
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

test('double tap creates one add-product request, reuses ingredientsPhotoPath on retry, and clears draft only after found', async () => {
  let resolveAttempt1!: (val: unknown) => void;
  let rejectAttempt1!: (err: unknown) => void;
  jest.mocked(requestUnknownFlow)
    .mockImplementationOnce(() => new Promise((res, rej) => { resolveAttempt1 = res; rejectAttempt1 = rej; }))
    .mockResolvedValueOnce(lookupFound);

  await render(<UnknownReviewScreen />);
  await act(async () => {});

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
      reasons: { ...(storedDraft.label!.reasons as Record<string, string>), kcal: 'unreadable' },
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

