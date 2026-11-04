import React from 'react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
import {
  ReadLabelRequest,
  ReadLabelResponse,
  type ReadLabelRequest as ReadLabelRequestType,
} from '@okbite/shared';
import { ro } from '../../copy/ro';
import AddScreen from '../../../app/add/index';
import { clearAddReviewDraft, getAddReviewDraft } from './draftStore';

const mockReplace = jest.fn<(href: unknown) => void>();
const mockParams: { value: Record<string, string | string[] | undefined> } = { value: {} };
const mockReadLabel = jest.fn<(req: ReadLabelRequestType) => Promise<ReadLabelResponse>>();
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
  },
}));

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
  unclear: [],
  ingredientsPhotoPath: 'uploads/dev-1/ing-1.jpg',
  nutritionPhotoPath: 'uploads/dev-1/nut-1.jpg',
});

describe('AddCaptureScreen and useAddFlow (B7 label capture slice)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    clearAddReviewDraft();
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

    // Take shot 1 (ingredients)
    await fireEvent.press(screen.getByRole('button', { name: ro.capture.shutter }));

    expect(screen.getByText(ro.add.stepOf(2))).toBeTruthy();
    expect(screen.getByText(ro.add.nutritionTitle)).toBeTruthy();
    expect(screen.getByText(ro.add.nutritionHint)).toBeTruthy();
    expect(screen.getByText(ro.add.ingredientsDone)).toBeTruthy();

    // Press "Sunt pe aceeași poză"
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

    // Shot 1
    await fireEvent.press(screen.getByRole('button', { name: ro.capture.shutter }));

    // Shot 2
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

  it('preserves captured photos when readLabel fails (rate_limited / upstream_failed / offline) and retries without re-capturing', async () => {
    mockReadLabel
      .mockRejectedValueOnce(Object.assign(new Error('upstream'), { code: 'upstream_failed' }))
      .mockResolvedValueOnce(VALID_LABEL_RESPONSE);
    mockTakePicture
      .mockResolvedValueOnce({ uri: 'file:///cam-shot-1.jpg' })
      .mockResolvedValueOnce({ uri: 'file:///cam-shot-2.jpg' });

    await render(<AddScreen />);
    await cameraReady();

    // Shot 1
    await fireEvent.press(screen.getByRole('button', { name: ro.capture.shutter }));
    // Shot 2 -> fails with upstream_failed
    await fireEvent.press(screen.getByRole('button', { name: ro.capture.shutter }));

    expect(await screen.findByText(ro.errors.upstreamFailed)).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();

    // Retry reuses the preserved photos and succeeds
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

    // Pick shot 1 from gallery
    await fireEvent.press(screen.getByRole('button', { name: ro.add.gallery }));
    expect(screen.getByText(ro.add.stepOf(2))).toBeTruthy();

    // Pick shot 2 from gallery -> rate_limited error is visible even with camera denied
    await fireEvent.press(screen.getByRole('button', { name: ro.add.gallery }));
    expect(await screen.findByText(ro.errors.rateLimited)).toBeTruthy();

    // Retry uses the same gallery photos
    await fireEvent.press(screen.getByRole('button', { name: ro.errors.retry }));
    expect(mockReadLabel).toHaveBeenCalledTimes(2);
    expect(mockReplace).toHaveBeenCalledWith('/add/review');
  });
});
