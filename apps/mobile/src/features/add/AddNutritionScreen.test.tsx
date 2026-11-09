import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { NUTRIENT_KEYS } from '@okbite/shared';
import { ro } from '../../copy/ro';
import { lookupFound } from '../capture/__fixtures__/responses';
import { saveToHistory } from '../history/store';
import { requestUnknownFlow } from './unknownFlowTransport';
import { AddNutritionScreen } from './AddNutritionScreen';

const foundProductId = lookupFound.status === 'found' ? lookupFound.product.id : '00000000-0000-4000-8000-000000000001';
const mockReplace = jest.fn();
const mockParams: { value: Record<string, string | string[] | undefined> } = {
  value: { productId: foundProductId },
};

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => mockParams.value,
  useFocusEffect: (fn: () => void) => jest.requireActual<typeof import('react')>('react').useEffect(fn, [fn]),
}));
jest.mock('./unknownFlowTransport', () => ({ requestUnknownFlow: jest.fn() }));
jest.mock('../history/store', () => ({ saveToHistory: jest.fn(async () => {}) }));
jest.mock('../capture/compressPhoto', () => ({
  compressPhoto: async (uri: string) => ({ uri, base64: `jpeg:${uri}`, bytes: 100 }),
}));
jest.mock('./GuidedPhotoCapture', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  const { ro: copy } = jest.requireActual<typeof import('../../copy/ro')>('../../copy/ro');
  return {
    GuidedPhotoCapture: ({ onCapture, disabled }: { onCapture: (uri: string) => Promise<void>; disabled?: boolean }) =>
      ReactActual.createElement(
        Pressable,
        { accessibilityRole: 'button', accessibilityLabel: copy.capture.shutter, disabled, onPress: () => void onCapture('table-shot') },
        ReactActual.createElement(Text, null, copy.capture.shutter),
      ),
  };
});

const readNutrients = {
  kcal: 210,
  fat: 8.5,
  sat: 5.2,
  sugar: 4.1,
  salt: 0.12,
  protein: 3.4,
  fiber: null,
  fruitVegPct: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.value = { productId: foundProductId };
});

test('photographs the nutrition table, reads it, confirms, and enriches the same product id', async () => {
  jest.mocked(requestUnknownFlow)
    .mockResolvedValueOnce({
      ingredientsText: null,
      unit: 'g',
      nutrients: readNutrients,
      unclear: [],
      ingredientsPhotoPath: null,
      nutritionPhotoPath: 'uploads/dev-1/nutrition-later.jpg',
      reasons: Object.fromEntries([...NUTRIENT_KEYS, 'ingredientsText'].map(k => [k, k === 'ingredientsText' ? 'not_photographed' : 'read'])),
    })
    .mockResolvedValueOnce(lookupFound);

  await render(<AddNutritionScreen />);

  // Step 1: capture nutrition table photo
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: ro.capture.shutter }));
  });

  expect(requestUnknownFlow).toHaveBeenCalledTimes(1);
  expect(jest.mocked(requestUnknownFlow).mock.calls[0]?.[0]).toBe('read-label');
  expect(jest.mocked(requestUnknownFlow).mock.calls[0]?.[3]).toEqual({
    ingredientsImage: null,
    nutritionImage: 'jpeg:table-shot',
    nutrition: 'separate',
  });

  // Step 2: confirm extracted nutrition values
  expect(screen.getByText('210 kcal')).toBeTruthy();
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: ro.add.confirmSave }));
  });

  expect(requestUnknownFlow).toHaveBeenCalledTimes(2);
  expect(jest.mocked(requestUnknownFlow).mock.calls[1]?.[0]).toBe('enrich-product');
  expect(jest.mocked(requestUnknownFlow).mock.calls[1]?.[3]).toEqual({
    productId: foundProductId,
    unit: 'g',
    nutrients: readNutrients,
    nutritionPhotoPath: 'uploads/dev-1/nutrition-later.jpg',
  });
  expect(saveToHistory).toHaveBeenCalledWith(lookupFound);
  expect(mockReplace).toHaveBeenCalledWith(`/product/${foundProductId}`);
});


test('an unread unit is never guessed: save waits for one g/ml tap', async () => {
  jest.mocked(requestUnknownFlow)
    .mockResolvedValueOnce({
      ingredientsText: null,
      unit: null,
      nutrients: readNutrients,
      unclear: [],
      ingredientsPhotoPath: null,
      nutritionPhotoPath: 'uploads/dev-1/nutrition-later.jpg',
      reasons: Object.fromEntries([...NUTRIENT_KEYS, 'ingredientsText'].map(k => [k, k === 'ingredientsText' ? 'not_photographed' : 'read'])),
    })
    .mockResolvedValueOnce(lookupFound);

  await render(<AddNutritionScreen />);
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: ro.capture.shutter }));
  });

  expect(screen.getByText(ro.add.unitQuestion)).toBeTruthy();
  expect(screen.getByRole('button', { name: ro.add.confirmSave })).toBeDisabled();
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: ro.compare.per100('ml') }));
  });
  await act(async () => {
    fireEvent.press(screen.getByRole('button', { name: ro.add.confirmSave }));
  });
  expect(jest.mocked(requestUnknownFlow).mock.calls[1]?.[3]).toMatchObject({ unit: 'ml' });
});
