import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { NUTRIENT_KEYS, ReadLabelResponse } from '@okbite/shared';
import { ro } from '../../copy/ro';
import { api } from '../../lib/api';
import type { AnalysisOutcome } from '../../lib/analysisOutcome';
import { GuidedAddScreen } from './GuidedAddScreen';
import { loadUnknownDraft, saveUnknownDraft } from './unknownDraft';
import { requestUnknownFlow } from './unknownFlowTransport';

const completed = <T,>(result: T): AnalysisOutcome<T> => ({ status: 'completed', result });
const pendingOutcome = <T,>(completion: Promise<T>): AnalysisOutcome<T> => ({ status: 'pending', retryAllowed: false, completion });

const mockReplace = jest.fn();
const mockParams: { value: Record<string, string | string[] | undefined> } = { value: {} };

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => mockParams.value,
  useFocusEffect: (fn: () => void) => jest.requireActual<typeof import('react')>('react').useEffect(fn, [fn]),
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'draft-id' }));
jest.mock('./unknownDraft', () => ({
  ...jest.requireActual('./unknownDraftRepository'),
  loadUnknownDraft: jest.fn(),
  saveUnknownDraft: jest.fn(),
  saveUnknownDraftIfCurrent: jest.fn(async () => true),
  clearUnknownDraft: jest.fn(),
}));
jest.mock('./unknownFlowTransport', () => ({ requestUnknownFlow: jest.fn() }));
jest.mock('./completeUnknownDraft', () => ({ completeUnknownDraft: jest.fn() }));
jest.mock('../../lib/api', () => ({ api: { identifyOutcome: jest.fn() } }));
jest.mock('../capture/compressPhoto', () => ({
  compressPhoto: async (uri: string) => ({ uri, base64: `jpeg:${uri}`, bytes: 20 }),
}));
jest.mock('../offline/photos', () => ({
  keepPhoto: async (uri: string) => `kept:${uri}`,
  openPhoto: async (id: string) => ({ uri: id.replace(/^kept:/, ''), release() {} }),
  removePhoto: jest.fn(),
}));
jest.mock('./GuidedPhotoCapture', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  const { ro: copy } = jest.requireActual<typeof import('../../copy/ro')>('../../copy/ro');
  return {
    GuidedPhotoCapture: ({ onCapture, disabled }: { onCapture: (uri: string) => Promise<void>; disabled?: boolean }) =>
      ReactActual.createElement(
        Pressable,
        { accessibilityRole: 'button', accessibilityLabel: copy.capture.shutter, disabled, onPress: () => void onCapture('captured-photo') },
        ReactActual.createElement(Text, null, copy.capture.shutter),
      ),
  };
});

const emptyNutrients = Object.fromEntries(NUTRIENT_KEYS.map(key => [key, null]));
// U1: a field is 'read' exactly when it has a value; these nutrients are null.
const readReasons = { ...Object.fromEntries(NUTRIENT_KEYS.map(key => [key, 'not_printed'])), ingredientsText: 'read' };
const baseLabel = {
  ingredientsText: 'făină, apă, sare',
  unit: 'g' as const,
  nutrients: emptyNutrients,
  unclear: [],
  ingredientsPhotoPath: 'device/ingredients.jpg',
  nutritionPhotoPath: 'device/nutrition.jpg',
  reasons: readReasons,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.value = { code: '4840001000014', name: 'Pâine', photoPath: 'device/front.jpg' };
  jest.mocked(loadUnknownDraft).mockResolvedValue(null);
  jest.mocked(requestUnknownFlow).mockResolvedValue(baseLabel);
});

test('shows unreadable nutrition recovery with Retake and Continue with ingredients only', async () => {
  jest.mocked(requestUnknownFlow).mockResolvedValueOnce({
    ...baseLabel,
    reasons: { ...readReasons, kcal: 'unreadable' },
    unclear: ['kcal'],
  });
  await render(<GuidedAddScreen />);
  await fillIdentity();

  expect(screen.getByText(ro.add.ingredientsTitle)).toBeTruthy();
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: ro.capture.shutter }));
  });

  expect(screen.getByText(ro.add.nutritionQuestion)).toBeTruthy();
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: ro.add.nutritionSame }));
  });

  expect(screen.getByText(ro.add.nutritionUnreadable)).toBeTruthy();
  expect(screen.getByRole('button', { name: ro.add.retakePhoto })).toBeTruthy();

  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: ro.add.continueIngredients }));
  });

  expect(mockReplace).toHaveBeenCalledWith({ pathname: '/add/review', params: { unknownDraftId: 'draft-id' } });
  expect(saveUnknownDraft).toHaveBeenLastCalledWith(
    expect.objectContaining({
      stage: 'review',
      nutritionMode: 'skipped',
      photos: expect.objectContaining({ ingredients: 'kept:captured-photo' }),
    }),
  );
});

test('starts at front photo step when barcode entry has no front photoPath', async () => {
  mockParams.value = { code: '4840001000014' };
  await render(<GuidedAddScreen />);
  await fillIdentity();

  expect(screen.getByText(ro.add.frontTitle)).toBeTruthy();
  expect(screen.getByText(ro.add.frontHint)).toBeTruthy();
  expect(screen.getByText(ro.add.stepOf(1, 4))).toBeTruthy();
  expect(ro.add.stepOf(1, 3)).toBe('Pasul 1 din 3');
  expect(ro.add.stepOf(2, 4)).toBe('Pasul 2 din 4');
});

test('keeps manual entry fallback ("Scriu eu textul") reachable from a failed or interrupted guided read', async () => {
  jest.mocked(loadUnknownDraft).mockResolvedValueOnce({
    version: 1,
    id: 'draft-id',
    initial: { code: '4840001000014', name: 'Pâine', brand: null, quantity: null, photoPath: 'device/front.jpg' },
    stage: 'reading',
    nutritionMode: 'none',
    photos: { front: null, ingredients: 'kept:ing', nutrition: null },
    label: null,
    readStatus: 'interrupted',
  });
  await render(<GuidedAddScreen />);
  await act(async () => {});

  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: ro.add.manualEntry }));
  });

  expect(mockReplace).toHaveBeenCalledWith({
    pathname: '/add',
    params: expect.objectContaining({ code: '4840001000014', flow: 'manual' }),
  });
});

test('shows explicit retry when a restored draft was interrupted mid-read', async () => {
  jest.mocked(loadUnknownDraft).mockResolvedValueOnce({
    version: 1,
    id: 'draft-id',
    initial: { code: '4840001000014', name: 'Pâine', brand: null, quantity: null, photoPath: 'device/front.jpg' },
    stage: 'reading',
    nutritionMode: 'none',
    photos: { front: null, ingredients: 'kept:ing', nutrition: null },
    label: null,
    readStatus: 'interrupted',
  });
  await render(<GuidedAddScreen />);
  await act(async () => {});

  expect(screen.getByText(ro.add.draftInterrupted)).toBeTruthy();
  expect(requestUnknownFlow).not.toHaveBeenCalled();

  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: ro.add.retryRead }));
  });

  expect(requestUnknownFlow).toHaveBeenCalledTimes(1);
  expect(mockReplace).toHaveBeenCalledWith({ pathname: '/add/review', params: { unknownDraftId: 'draft-id' } });
});

test('offers a return to confirmation for a completed draft without replaying a read', async () => {
  mockParams.value = {};
  jest.mocked(loadUnknownDraft).mockResolvedValueOnce({
    version: 1, id: 'ready-draft',
    initial: { code: null, name: 'Pâine', brand: null, quantity: null, photoPath: 'device/front.jpg' },
    stage: 'review', nutritionMode: 'none', photos: { front: 'kept:front', ingredients: 'kept:ing', nutrition: null },
    label: ReadLabelResponse.parse({ ...baseLabel, nutritionPhotoPath: null }), readStatus: 'complete',
  });
  await render(<GuidedAddScreen />);
  await act(async () => {});
  expect(requestUnknownFlow).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: ro.add.confirmTitle }));
  expect(mockReplace).toHaveBeenCalledWith({ pathname: '/add/review', params: { unknownDraftId: 'ready-draft' } });
});

test.each([null, 'device/front.jpg'])('requires both identity fields before showing capture (existing front: %s)', async photoPath => {
  mockParams.value = { name: 'OCR guess', quantity: '99 g', ...(photoPath ? { photoPath } : {}) };
  await render(<GuidedAddScreen />);
  const name = await screen.findByLabelText(ro.review.name);
  expect(name).toHaveProp('value', '');
  expect(screen.queryByRole('button', { name: ro.capture.shutter })).toBeNull();
  expect(screen.getByRole('button', { name: ro.add.next })).toBeDisabled();
  await fireEvent.changeText(name, '  Denumire introdusă  ');
  expect(screen.getByRole('button', { name: ro.add.next })).toBeDisabled();
  await fireEvent.changeText(screen.getByLabelText(ro.review.quantity), ' 375 g ');
  await fireEvent.press(screen.getByRole('button', { name: ro.add.next }));
  expect(saveUnknownDraft).toHaveBeenLastCalledWith(expect.objectContaining({
    initial: expect.objectContaining({ name: 'Denumire introdusă', quantity: '375 g', identityConfirmed: true }),
    stage: photoPath ? 'ingredients' : 'front',
  }));
  expect(screen.getByRole('button', { name: ro.capture.shutter })).toBeTruthy();
});

test('provider failure preserves durable photos and allows manual review without a second read', async () => {
  const failureReasons = Object.fromEntries([...NUTRIENT_KEYS, 'ingredientsText'].map(key => [key, 'failed']));
  jest.mocked(requestUnknownFlow).mockResolvedValueOnce({
    ...baseLabel, ingredientsText: null, unit: null, reasons: failureReasons, unclear: [...NUTRIENT_KEYS, 'ingredientsText'],
  });
  await render(<GuidedAddScreen />);
  await fillIdentity();
  await fireEvent.press(screen.getByRole('button', { name: ro.capture.shutter }));
  await fireEvent.press(screen.getByRole('button', { name: ro.add.nutritionSame }));
  expect(await screen.findByText(ro.add.processingFailed)).toBeTruthy();
  expect(screen.queryByText(ro.add.nutritionUnreadable)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: ro.add.manualEntry }));
  expect(mockReplace).toHaveBeenCalledWith({ pathname: '/add/review', params: { unknownDraftId: 'draft-id', manual: '1' } });
  expect(requestUnknownFlow).toHaveBeenCalledTimes(1);
  expect(saveUnknownDraft).toHaveBeenLastCalledWith(expect.objectContaining({
    stage: 'review', photos: expect.objectContaining({ ingredients: 'kept:captured-photo' }),
  }));
});

test('shows >55 s pending message on front photo without retry, then advances to ingredients on late resolve', async () => {
  mockParams.value = { code: '4840001000014' };
  let finish!: (res: unknown) => void;
  jest.mocked(api.identifyOutcome).mockResolvedValueOnce(pendingOutcome(new Promise(resolve => { finish = resolve; })) as never);

  await render(<GuidedAddScreen />);
  await fillIdentity();
  await fireEvent.press(screen.getByRole('button', { name: ro.capture.shutter }));

  expect(await screen.findByText(ro.pwa.analysis.title)).toBeTruthy();
  expect(screen.getByText(ro.pwa.analysis.unknown)).toBeTruthy();
  expect(screen.queryByRole('button', { name: ro.add.retryRead })).toBeNull();

  await act(async () => {
    finish({ status: 'not_found', read: { brand: 'Brand', name: null, quantity: null, code: null }, photoPath: 'device/front.jpg' });
  });
  expect(screen.getByText(ro.add.ingredientsTitle)).toBeTruthy();
});

test('shows retry guidance and explicit retry after a pending front identify rejects', async () => {
  mockParams.value = { code: '4840001000014' };
  let rejectLate!: (err: unknown) => void;
  jest.mocked(api.identifyOutcome)
    .mockResolvedValueOnce(pendingOutcome(new Promise((_r, reject) => { rejectLate = reject; })) as never)
    .mockResolvedValueOnce(completed({ status: 'not_found', read: { brand: null, name: null, quantity: null, code: null }, photoPath: 'device/front.jpg' }) as never);

  await render(<GuidedAddScreen />);
  await fillIdentity();
  await fireEvent.press(screen.getByRole('button', { name: ro.capture.shutter }));
  expect(await screen.findByText(ro.pwa.analysis.title)).toBeTruthy();

  await act(async () => {
    rejectLate(Object.assign(new Error('upstream'), { code: 'upstream_failed' }));
  });
  expect(screen.getByText(new RegExp(ro.pwa.analysis.retry))).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: ro.add.retryRead }));
  expect(screen.getByText(ro.add.ingredientsTitle)).toBeTruthy();
});

async function fillIdentity() {
  await fireEvent.changeText(await screen.findByLabelText(ro.review.name), 'Pâine');
  await fireEvent.changeText(screen.getByLabelText(ro.review.quantity), '375 g');
  await fireEvent.press(screen.getByRole('button', { name: ro.add.next }));
}
