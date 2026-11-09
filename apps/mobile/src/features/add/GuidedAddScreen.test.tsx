import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { NUTRIENT_KEYS } from '@okbite/shared';
import { ro } from '../../copy/ro';
import { GuidedAddScreen } from './GuidedAddScreen';
import { loadUnknownDraft, saveUnknownDraft } from './unknownDraft';
import { requestUnknownFlow } from './unknownFlowTransport';

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
const readReasons = Object.fromEntries([...NUTRIENT_KEYS, 'ingredientsText'].map(key => [key, 'read']));
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
  await act(async () => {});

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
  await act(async () => {});

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
