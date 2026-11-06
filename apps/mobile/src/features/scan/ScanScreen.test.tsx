import React from 'react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, fireEvent, screen, act } from '@testing-library/react-native';
import { Linking, StyleSheet } from 'react-native';
import { notificationAsync } from 'expo-haptics';
import { api } from '../../lib/api';
import { ro } from '../../copy/ro';
import ScanScreen from './ScanScreen';
import { CODE, PRODUCT_ID, lookupFound, lookupNotFound } from '../capture/__fixtures__/responses';

const mockReplace = jest.fn();
const mockPermission: { value: unknown } = { value: null };
const mockRequestPermission = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace }) }));
jest.mock('expo-haptics', () => ({ notificationAsync: jest.fn(async () => undefined), NotificationFeedbackType: { Success: 'success' } }));
jest.mock('../../lib/api', () => ({ api: { lookup: jest.fn(), identify: jest.fn() } }));
jest.mock('expo-camera', () => {
  const ReactActual = jest.requireActual<typeof import('react')>('react');
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const CameraView = (props: object) => ReactActual.createElement(View, { testID: 'camera', ...props });
  return { CameraView, useCameraPermissions: () => [mockPermission.value, mockRequestPermission] };
});

type AsyncMock = jest.Mock<(...a: unknown[]) => Promise<unknown>>;
const lookup = api.lookup as unknown as AsyncMock;
const granted = { granted: true, status: 'granted', canAskAgain: true };
const camera = () => screen.getByTestId('camera');
const detect = (data: string) => act(async () => { (camera().props.onBarcodeScanned as (e: { data: string }) => void)({ data }); });

describe('ScanScreen', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockPermission.value = granted;
    (notificationAsync as unknown as AsyncMock).mockResolvedValue(undefined);
  });

  it('shows a spinner while the permission is unknown and never the denied copy', async () => {
    mockPermission.value = null;
    await render(<ScanScreen />);
    expect(screen.getByTestId('permission-loading')).toBeTruthy();
    expect(screen.queryByText(ro.scan.deniedText)).toBeNull();
  });

  it('keeps manual entry and settings access when the camera is refused', async () => {
    mockPermission.value = { granted: false, status: 'denied', canAskAgain: false };
    const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined);
    await render(<ScanScreen />);
    expect(screen.getByText(ro.scan.deniedText)).toBeTruthy();
    const preview = StyleSheet.flatten(screen.getByText(ro.scan.deniedText).parent!.parent!.props.style);
    expect(preview.height).toBeUndefined();
    expect(preview.minHeight).toBe(280);
    expect(screen.queryByTestId('camera')).toBeNull();
    expect(screen.getByLabelText(ro.scan.manualTitle)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: ro.capture.openSettings }));
    expect(openSettings).toHaveBeenCalled();
  });

  it('scans EAN-13, EAN-8 and UPC-A only, with a visible-size preview', async () => {
    await render(<ScanScreen />);
    expect(camera().props.barcodeScannerSettings).toEqual({ barcodeTypes: ['ean13', 'ean8', 'upc_a'] });
    expect(screen.getByText(ro.scan.frameHint)).toBeTruthy();
  });

  it('looks up once and taps once when the camera reports the same code repeatedly', async () => {
    let finish!: (v: unknown) => void;
    lookup.mockReturnValue(new Promise((r) => { finish = r; }));
    await render(<ScanScreen />);
    await detect(CODE);
    await detect(CODE);
    await detect(CODE);
    await act(async () => { finish(lookupFound); });
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(notificationAsync).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith(`/product/${PRODUCT_ID}`);
  });

  it('ignores a detection that is not a valid barcode', async () => {
    await render(<ScanScreen />);
    await detect('4840001000017');
    expect(lookup).not.toHaveBeenCalled();
    expect(notificationAsync).not.toHaveBeenCalled();
  });

  it('shows the offline state, pauses scanning, and resumes after closing it', async () => {
    lookup.mockRejectedValueOnce(Object.assign(new Error('offline'), { code: 'offline' })).mockResolvedValue(lookupFound);
    await render(<ScanScreen />);
    await detect(CODE);
    expect(await screen.findByText(ro.offline.title)).toBeTruthy();
    await detect(CODE);
    expect(lookup).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByRole('button', { name: ro.nav.close }));
    await detect(CODE);
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it('retries the last code from the error panel', async () => {
    lookup.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'upstream_failed' })).mockResolvedValue(lookupFound);
    await render(<ScanScreen />);
    await detect(CODE);
    expect(await screen.findByText(ro.errors.upstreamFailed)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: ro.errors.retry }));
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it('sends an unknown manually typed code to identify and a typo nowhere', async () => {
    lookup.mockResolvedValue(lookupNotFound);
    await render(<ScanScreen />);
    const input = screen.getByLabelText(ro.scan.manualTitle);
    await fireEvent.changeText(input, '4840001000017');
    await fireEvent.press(screen.getByRole('button', { name: ro.scan.search }));
    expect(lookup).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    await fireEvent.changeText(input, CODE);
    await fireEvent.press(screen.getByRole('button', { name: ro.scan.search }));
    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/identify', params: { source: 'code', code: CODE } });
  });

  it('offers a retry when the camera fails to start', async () => {
    await render(<ScanScreen />);
    await act(() => { (camera().props.onMountError as () => void)(); });
    expect(screen.getByText(ro.errors.generic)).toBeTruthy();
    expect(screen.getByLabelText(ro.scan.manualTitle)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: ro.errors.retry }));
    expect(screen.getByTestId('camera')).toBeTruthy();
  });
});
