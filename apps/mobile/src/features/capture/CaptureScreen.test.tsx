import React from 'react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
import { Linking, StyleSheet } from 'react-native';
import { ImageManipulator } from 'expo-image-manipulator';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { api } from '../../lib/api';
import { ro } from '../../copy/ro';
import CaptureScreen from './CaptureScreen';
import { PRODUCT_ID, identifyFound } from './__fixtures__/responses';

const mockReplace = jest.fn();
const mockPermission: { value: unknown } = { value: null };
const mockRequestPermission = jest.fn();
const mockTakePicture = jest.fn<() => Promise<unknown>>();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }));
jest.mock('expo-image-manipulator', () => ({ SaveFormat: { JPEG: 'jpeg' }, ImageManipulator: { manipulate: jest.fn() } }));
jest.mock('expo-image-picker', () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock('../../lib/api', () => ({ api: { lookup: jest.fn(), identify: jest.fn() } }));
jest.mock('expo-camera', () => {
  const React = require('react');
  const { View } = require('react-native');
  const CameraView = React.forwardRef((props: object, ref: React.Ref<unknown>) => {
    React.useImperativeHandle(ref, () => ({ takePictureAsync: mockTakePicture }));
    return React.createElement(View, { testID: 'camera', ...props });
  });
  return { CameraView, scanFromURLAsync: jest.fn(async () => []), useCameraPermissions: () => [mockPermission.value, mockRequestPermission] };
});

type AsyncMock = jest.Mock<(...a: unknown[]) => Promise<unknown>>;
const identify = api.identify as unknown as AsyncMock;
const granted = { granted: true, status: 'granted', canAskAgain: true };
const shutter = () => screen.getByRole('button', { name: ro.capture.shutter });
const camera = () => screen.getByTestId('camera');
const flatten = (el: { props: { style?: unknown } }) => StyleSheet.flatten(el.props.style as never) as Record<string, unknown>;
const cameraReady = () => act(() => { (camera().props.onCameraReady as () => void)(); });

describe('CaptureScreen', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockPermission.value = granted;
    mockTakePicture.mockImplementation(async () => ({ uri: 'file:///shot.jpg' }));
    const image = { width: 1200, height: 900, saveAsync: async () => ({ uri: 'file:///c.jpg', base64: Buffer.from('jpeg').toString('base64') }) };
    (ImageManipulator.manipulate as unknown as jest.Mock).mockReturnValue({ resize: jest.fn(), renderAsync: async () => image });
  });

  it.each([['unknown', null], ['undetermined', { granted: false, status: 'undetermined', canAskAgain: true }]])('shows a spinner, not the camera or the denied message, while permission is %s', async (_n, value) => {
    mockPermission.value = value;
    await render(<CaptureScreen />);
    expect(screen.getByTestId('permission-loading')).toBeTruthy();
    expect(screen.queryByTestId('camera')).toBeNull();
    expect(screen.queryByText(ro.capture.deniedTitle)).toBeNull();
  });

  it('offers gallery, settings and retry when the camera is refused', async () => {
    mockPermission.value = { granted: false, status: 'denied', canAskAgain: false };
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    (launchImageLibraryAsync as unknown as AsyncMock).mockResolvedValue({ canceled: true, assets: null });
    await render(<CaptureScreen />);
    expect(screen.getByText(ro.capture.deniedTitle)).toBeTruthy();
    expect(screen.queryByTestId('camera')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: ro.capture.openSettings }));
    expect(openSettings).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: ro.capture.retry }));
    expect(mockRequestPermission).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: ro.capture.gallery }));
    expect(launchImageLibraryAsync).toHaveBeenCalled();
  });

  it('gives the preview a full-screen layout and the shutter a visible 44 pt+ target', async () => {
    await render(<CaptureScreen />);
    expect(flatten(camera())).toMatchObject({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 });
    const { width, height } = flatten(shutter());
    expect(width).toBeGreaterThanOrEqual(44);
    expect(height).toBeGreaterThanOrEqual(44);
    expect(screen.getByText(ro.capture.hint)).toBeTruthy();
  });

  it('keeps the shutter disabled until the camera is ready', async () => {
    await render(<CaptureScreen />);
    await fireEvent.press(shutter());
    expect(mockTakePicture).not.toHaveBeenCalled();
    await cameraReady();
    await fireEvent.press(shutter());
    expect(mockTakePicture).toHaveBeenCalledTimes(1);
  });

  it('shows the working state and sends one request for a double tap', async () => {
    let finish!: (v: unknown) => void;
    identify.mockReturnValue(new Promise((r) => { finish = r; }));
    await render(<CaptureScreen />);
    await cameraReady();
    await fireEvent.press(shutter());
    await fireEvent.press(shutter());
    expect(await screen.findByText(ro.capture.working)).toBeTruthy();
    await act(async () => { finish(identifyFound); });
    expect(mockTakePicture).toHaveBeenCalledTimes(1);
    expect(identify).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith(`/product/${PRODUCT_ID}`);
  });

  it('shows the offline state with retry, and recovers when the network returns', async () => {
    identify.mockRejectedValueOnce(Object.assign(new Error('offline'), { code: 'offline' })).mockResolvedValue(identifyFound);
    await render(<CaptureScreen />);
    await cameraReady();
    await fireEvent.press(shutter());
    expect(await screen.findByText(ro.offline.title)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: ro.offline.retry }));
    expect(identify).toHaveBeenCalledTimes(2);
    expect(mockTakePicture).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith(`/product/${PRODUCT_ID}`);
  });

  it('shows the server error message and lets the user close it and shoot again', async () => {
    identify.mockRejectedValueOnce(Object.assign(new Error('limit'), { code: 'rate_limited' }));
    await render(<CaptureScreen />);
    await cameraReady();
    await fireEvent.press(shutter());
    expect(await screen.findByText(ro.errors.rateLimited)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: ro.nav.close }));
    expect(screen.queryByText(ro.errors.rateLimited)).toBeNull();
    await fireEvent.press(shutter());
    expect(mockTakePicture).toHaveBeenCalledTimes(2);
  });

  it('catches a camera failure instead of crashing', async () => {
    mockTakePicture.mockRejectedValueOnce(new Error('camera gone'));
    await render(<CaptureScreen />);
    await cameraReady();
    await fireEvent.press(shutter());
    expect(await screen.findByText(ro.errors.generic)).toBeTruthy();
  });

  it('offers the gallery when the camera fails to start', async () => {
    await render(<CaptureScreen />);
    await act(() => { (camera().props.onMountError as () => void)(); });
    expect(screen.getByText(ro.errors.generic)).toBeTruthy();
    expect(screen.getByRole('button', { name: ro.capture.gallery })).toBeTruthy();
    expect(screen.queryByTestId('camera')).toBeNull();
  });
});
