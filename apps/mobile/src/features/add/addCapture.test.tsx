import React from 'react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
import {
  Category,
  LookupResponse,
  ReadLabelRequest,
  ReadLabelResponse,
  type AddProductRequest as AddProductRequestType,
  type NutrientKey,
  type ReadLabelRequest as ReadLabelRequestType,
} from '@okbite/shared';
import { ro } from '../../copy/ro';
import AddScreen from '../../../app/add/index';
import ReviewRouteScreen from '../../../app/add/review';
import {
  clearAddReviewDraft,
  getAddReviewDraft,
  setAvailableCategories,
} from './draftStore';

const mockReplace = jest.fn<(href: unknown) => void>();
const mockParams: { value: Record<string, string | string[] | undefined> } = { value: {} };
const mockReadLabel = jest.fn<(req: ReadLabelRequestType) => Promise<ReadLabelResponse>>();
const mockAddProduct = jest.fn<(req: AddProductRequestType) => Promise<LookupResponse>>();
const mockCompressPhoto = jest.fn<
  (uri: string, maxBytes?: number) => Promise<{ uri: string; base64: string; bytes: number }>
>();
const mockLaunchLibrary = jest.fn<
  () => Promise<{ canceled: boolean; assets: Array<{ uri: string }> }>
>();
const mockRequestPermission = jest.fn<() => Promise<unknown>>();
const mockTakePicture = jest.fn<() => Promise<{ uri: string } | undefined>>();
const mockPermissionState: {
  value: { status: string; granted: boolean } | null;
} = {
  value: { status: 'granted', granted: true },
};

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => mockParams.value,
}));

jest.mock('expo-camera', () => {
  const ReactActual = require('react') as typeof import('react');
  const { View } = require('react-native') as typeof import('react-native');
  return {
    useCameraPermissions: () => [mockPermissionState.value, mockRequestPermission],
    CameraView: ReactActual.forwardRef((props: Record<string, unknown>, ref) => {
      ReactActual.useImperativeHandle(ref, () => ({
        takePictureAsync: mockTakePicture,
      }));
      return <View testID="add-camera-view" {...props} />;
    }),
  };
});

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: () => mockLaunchLibrary(),
}));

jest.mock('../capture/compressPhoto', () => ({
  compressPhoto: (uri: string, maxBytes?: number) => mockCompressPhoto(uri, maxBytes),
}));

jest.mock('../../lib/api', () => ({
  api: {
    readLabel: (req: ReadLabelRequestType) => mockReadLabel(req),
    addProduct: (req: AddProductRequestType) => mockAddProduct(req),
  },
}));

const COMPLETE_NUTRIENT_LABELS: Record<NutrientKey, string> = {
  kcal: 'Energie',
  fat: 'Grăsimi',
  sat: 'din care saturate',
  sugar: 'Zaharuri',
  salt: 'Sare',
  protein: 'Proteine',
  fiber: 'Fibre',
  fruitVegPct: 'Fructe, legume și leguminoase',
};

const mutableReviewCopy = ro.review as unknown as {
  nutrients?: Partial<Record<NutrientKey, string>>;
};

const CATEGORIES = [
  Category.parse({ slug: 'biscuiti', name: 'Biscuiți', scoreKind: 'general' }),
];

const cameraReady = () =>
  act(() => {
    (screen.getByTestId('add-camera-view').props.onCameraReady as () => void)();
  });

const VALID_LABEL_RESPONSE = ReadLabelResponse.parse({
  ingredientsText: 'făină de grâu, zahăr, ulei de floarea-soarelui',
  unit: 'g',
  nutrients: {
    kcal: 445,
    fat: 15,
    sat: 2.1,
    sugar: 14,
    salt: 0.5,
    protein: 8.5,
    fiber: 7.8,
    fruitVegPct: null,
  },
  unclear: ['sugar'],
  ingredientsPhotoPath: 'uploads/dev-1/ing-1.jpg',
  nutritionPhotoPath: 'uploads/dev-1/nut-1.jpg',
});

describe('AddCaptureScreen, useAddFlow and /add -> /add/review route integration (B7)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    clearAddReviewDraft();
    setAvailableCategories(CATEGORIES);
    mutableReviewCopy.nutrients = { ...COMPLETE_NUTRIENT_LABELS };
    mockPermissionState.value = { status: 'granted', granted: true };
    mockParams.value = {
      code: '4840001000014',
      brand: 'Morărița',
      name: 'Biscuiți integrali',
      quantity: '200 g',
      photoPath: 'uploads/dev-1/front-1.jpg',
    };
    mockTakePicture.mockResolvedValue({ uri: 'file:///cam-shot-1.jpg' });
    mockCompressPhoto.mockImplementation(async (uri: string, maxBytes = 1_500_000) => ({
      uri: `${uri}-compressed`,
      base64: uri.includes('shot-2') ? 'BASE64_NUTRITION' : 'BASE64_INGREDIENTS',
      bytes: Math.min(400_000, maxBytes),
    }));
  });

  afterEach(() => {
    delete mutableReviewCopy.nutrients;
  });

  it('captures shot 1 (ingredients), advances to step 2, and supports "Sunt pe aceeași poză" (nutritionImage: null)', async () => {
    const singlePhotoResponse = ReadLabelResponse.parse({
      ...VALID_LABEL_RESPONSE,
      nutritionPhotoPath: null,
    });
    mockReadLabel.mockResolvedValueOnce(singlePhotoResponse);

    await render(<AddScreen />);
    await cameraReady();

    expect(screen.getByText(ro.add.stepOf(1))).toBeTruthy();
    expect(screen.getByText(ro.add.ingredientsTitle)).toBeTruthy();
    expect(screen.getByText(ro.add.ingredientsHint)).toBeTruthy();
    expect(screen.queryByText(ro.add.samePhoto)).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: ro.capture.shutter }));

    expect(screen.getByText(ro.add.stepOf(2))).toBeTruthy();
    expect(screen.getByText(ro.add.nutritionTitle)).toBeTruthy();
    expect(screen.getByText(ro.add.nutritionHint)).toBeTruthy();
    expect(screen.getByText(ro.add.ingredientsDone)).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: ro.add.samePhoto }));

    expect(mockCompressPhoto).toHaveBeenCalledWith('file:///cam-shot-1.jpg', 1_450_000);
    expect(mockReadLabel).toHaveBeenCalledWith({
      ingredientsImage: 'BASE64_INGREDIENTS',
      nutritionImage: null,
    });
    expect(ReadLabelRequest.safeParse(mockReadLabel.mock.calls[0]?.[0]).success).toBe(true);
    expect(mockReplace).toHaveBeenCalledWith('/add/review');

    const draft = getAddReviewDraft();
    expect(draft).not.toBeNull();
    expect(draft?.initial).toEqual({
      code: '4840001000014',
      brand: 'Morărița',
      name: 'Biscuiți integrali',
      quantity: '200 g',
      photoPath: 'uploads/dev-1/front-1.jpg',
    });
    expect(draft?.label).toEqual(singlePhotoResponse);
  });

  it('captures shot 1 and shot 2 with per-photo compression budget so UTF-8 JSON fits under 2 MB', async () => {
    mockReadLabel.mockResolvedValueOnce(VALID_LABEL_RESPONSE);
    mockTakePicture
      .mockResolvedValueOnce({ uri: 'file:///cam-shot-1.jpg' })
      .mockResolvedValueOnce({ uri: 'file:///cam-shot-2.jpg' });

    await render(<AddScreen />);
    await cameraReady();

    await fireEvent.press(screen.getByRole('button', { name: ro.capture.shutter }));
    await fireEvent.press(screen.getByRole('button', { name: ro.capture.shutter }));

    expect(mockCompressPhoto).toHaveBeenCalledWith('file:///cam-shot-1.jpg', 700_000);
    expect(mockCompressPhoto).toHaveBeenCalledWith('file:///cam-shot-2.jpg', 700_000);
    expect(mockReadLabel).toHaveBeenCalledWith({
      ingredientsImage: 'BASE64_INGREDIENTS',
      nutritionImage: 'BASE64_NUTRITION',
    });
    const sentBody = JSON.stringify(mockReadLabel.mock.calls[0]?.[0]);
    expect(Buffer.byteLength(sentBody, 'utf8')).toBeLessThanOrEqual(2_000_000);
    expect(mockReplace).toHaveBeenCalledWith('/add/review');
  });

  it('preserves edited product identity across review -> retake -> capture -> review and replaces label-photo paths', async () => {
    // 1. Capture first label pair on /add
    mockReadLabel.mockResolvedValueOnce(VALID_LABEL_RESPONSE);
    mockTakePicture
      .mockResolvedValueOnce({ uri: 'file:///cam-shot-1.jpg' })
      .mockResolvedValueOnce({ uri: 'file:///cam-shot-2.jpg' });

    const addRender1 = await render(<AddScreen />);
    await cameraReady();
    await fireEvent.press(screen.getByRole('button', { name: ro.capture.shutter }));
    await fireEvent.press(screen.getByRole('button', { name: ro.capture.shutter }));
    expect(mockReplace).toHaveBeenLastCalledWith('/add/review');
    addRender1.unmount();

    // 2. Open /add/review (with zero props), edit identity fields, then press Retake
    const reviewRender1 = await render(<ReviewRouteScreen />);
    await fireEvent.changeText(screen.getByLabelText(ro.review.name), 'Biscuiți integrali cu ovăz');
    await fireEvent.changeText(screen.getByLabelText(ro.review.brand), 'Morărița Nou');
    await fireEvent.changeText(screen.getByLabelText(ro.review.quantity), '250 g');

    await fireEvent.press(screen.getByRole('button', { name: ro.review.retakePhoto }));

    expect(mockReplace).toHaveBeenLastCalledWith({
      pathname: '/add',
      params: {
        code: '4840001000014',
        brand: 'Morărița Nou',
        name: 'Biscuiți integrali cu ovăz',
        quantity: '250 g',
        photoPath: 'uploads/dev-1/front-1.jpg',
      },
    });
    expect(getAddReviewDraft()).toBeNull();
    reviewRender1.unmount();

    // 3. Re-capture new label photos on /add -> new OCR response with new label photo paths
    const secondLabelResponse = ReadLabelResponse.parse({
      ...VALID_LABEL_RESPONSE,
      ingredientsText: 'făină integrală de grâu 45%, fulgi de ovăz 20%, zahăr, sare',
      unclear: [],
      ingredientsPhotoPath: 'uploads/dev-1/ing-retake-2.jpg',
      nutritionPhotoPath: null,
    });
    mockReadLabel.mockResolvedValueOnce(secondLabelResponse);
    mockTakePicture.mockResolvedValueOnce({ uri: 'file:///cam-retake-1.jpg' });

    const addRender2 = await render(<AddScreen />);
    await cameraReady();
    await fireEvent.press(screen.getByRole('button', { name: ro.capture.shutter }));
    await fireEvent.press(screen.getByRole('button', { name: ro.add.samePhoto }));
    expect(mockReplace).toHaveBeenLastCalledWith('/add/review');
    addRender2.unmount();

    // 4. Open /add/review again (with zero props): verify edited identity is preserved and new label paths are submitted
    const savedResponse = LookupResponse.parse({
      status: 'found',
      product: {
        id: '9f8e7d6c-5b4a-4321-8765-abcdef012345',
        code: '4840001000014',
        status: 'unverified',
        name: 'Biscuiți integrali cu ovăz',
        brand: 'Morărița Nou',
        quantity: '250 g',
        category: CATEGORIES[0],
        unit: 'g',
        portion: { amount: 100, label: '100 g' },
        nutrients: secondLabelResponse.nutrients,
        ingredientsText: secondLabelResponse.ingredientsText!,
        ingredients: [],
        allergens: ['Gluten'],
        mayContain: [],
        imageUrl: null,
        labelImageUrl: null,
        source: 'Utilizator',
        addedAt: '2026-11-04',
        verifiedAt: null,
      },
      score: {
        score: 52,
        letter: 'C',
        grade: 'medium',
        reasons: [],
        missing: [],
      },
    });
    mockAddProduct.mockResolvedValueOnce(savedResponse);

    await render(<ReviewRouteScreen />);

    expect(screen.getByDisplayValue('Biscuiți integrali cu ovăz')).toBeTruthy();
    expect(screen.getByDisplayValue('Morărița Nou')).toBeTruthy();
    expect(screen.getByDisplayValue('250 g')).toBeTruthy();
    expect(screen.getByDisplayValue('4840001000014')).toBeTruthy();
    expect(screen.getByDisplayValue(secondLabelResponse.ingredientsText!)).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: `${ro.review.category}: Biscuiți` }));
    await fireEvent.press(screen.getByRole('button', { name: ro.review.save }));

    expect(mockAddProduct).toHaveBeenCalledWith({
      code: '4840001000014',
      name: 'Biscuiți integrali cu ovăz',
      brand: 'Morărița Nou',
      quantity: '250 g',
      unit: 'g',
      categorySlug: 'biscuiti',
      ingredientsText: secondLabelResponse.ingredientsText,
      nutrients: secondLabelResponse.nutrients,
      photoPath: 'uploads/dev-1/front-1.jpg',
      ingredientsPhotoPath: 'uploads/dev-1/ing-retake-2.jpg',
      nutritionPhotoPath: null,
    });
    expect(mockReplace).toHaveBeenLastCalledWith(`/product/${savedResponse.product.id}`);
    expect(getAddReviewDraft()).toBeNull();
  });

  it('preserves captured photos when readLabel fails (rate_limited / upstream_failed / offline) and retries without re-capturing', async () => {
    mockReadLabel
      .mockRejectedValueOnce(Object.assign(new Error('upstream'), { code: 'upstream_failed' }))
      .mockResolvedValueOnce(VALID_LABEL_RESPONSE);
    mockTakePicture
      .mockResolvedValueOnce({ uri: 'file:///cam-shot-1.jpg' })
      .mockResolvedValueOnce({ uri: 'file:///cam-shot-2.jpg' });

    await render(<AddScreen />);
    await cameraReady();

    await fireEvent.press(screen.getByRole('button', { name: ro.capture.shutter }));
    await fireEvent.press(screen.getByRole('button', { name: ro.capture.shutter }));

    expect(await screen.findByText(ro.errors.upstreamFailed)).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: ro.errors.retry }));

    expect(mockReadLabel).toHaveBeenCalledTimes(2);
    expect(mockTakePicture).toHaveBeenCalledTimes(2);
    expect(mockReadLabel.mock.calls[1]?.[0]).toEqual({
      ingredientsImage: 'BASE64_INGREDIENTS',
      nutritionImage: 'BASE64_NUTRITION',
    });
    expect(mockReplace).toHaveBeenCalledWith('/add/review');
  });

  it('prevents duplicate readLabel requests while a request is in flight', async () => {
    let resolveRead!: (res: ReadLabelResponse) => void;
    mockReadLabel.mockImplementationOnce(
      () =>
        new Promise<ReadLabelResponse>((resolve) => {
          resolveRead = resolve;
        }),
    );

    await render(<AddScreen />);
    await cameraReady();

    await fireEvent.press(screen.getByRole('button', { name: ro.capture.shutter }));

    const samePhotoBtn = screen.getByRole('button', { name: ro.add.samePhoto });
    await fireEvent.press(samePhotoBtn);
    await fireEvent.press(samePhotoBtn);

    expect(mockReadLabel).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(ro.add.reading)).toBeTruthy();

    await act(async () => {
      resolveRead(VALID_LABEL_RESPONSE);
    });
    expect(mockReplace).toHaveBeenCalledWith('/add/review');
  });

  it('supports gallery selection when camera permission is denied and shows working/error states over the fallback', async () => {
    mockPermissionState.value = { status: 'denied', granted: false };
    mockLaunchLibrary
      .mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///gal-shot-1.jpg' }] })
      .mockResolvedValueOnce({ canceled: false, assets: [{ uri: 'file:///gal-shot-2.jpg' }] });
    mockReadLabel
      .mockRejectedValueOnce(Object.assign(new Error('rate_limited'), { code: 'rate_limited' }))
      .mockResolvedValueOnce(VALID_LABEL_RESPONSE);

    await render(<AddScreen />);

    expect(screen.getByText(ro.capture.deniedTitle)).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: ro.add.gallery }));
    expect(screen.getByText(ro.add.stepOf(2))).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: ro.add.gallery }));
    expect(await screen.findByText(ro.errors.rateLimited)).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: ro.errors.retry }));
    expect(mockReadLabel).toHaveBeenCalledTimes(2);
    expect(mockReplace).toHaveBeenCalledWith('/add/review');
  });
});
