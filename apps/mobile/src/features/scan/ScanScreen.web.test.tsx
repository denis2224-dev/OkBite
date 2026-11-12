import React from 'react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { api } from '../../lib/api';
import { ro } from '../../copy/ro';
import { light } from '../../theme/tokens';
import ScanScreenWeb from './ScanScreen.web';
import { CODE, lookupNotFound } from '../capture/__fixtures__/responses';
import * as useScanLookupModule from './useScanLookup';

const mockReplace = jest.fn();
let mockFocused = true;
const mockPush = jest.fn();
const mockLive = {
  status: 'unsupported' as string,
  videoRef: jest.fn<(video: HTMLVideoElement | null) => void>(),
  retry: jest.fn(),
};
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  useIsFocused: () => mockFocused,
  useFocusEffect: (callback: () => void | (() => void)) =>
    jest.requireActual<typeof import('react')>('react').useEffect(() => mockFocused ? callback() : undefined, [callback, mockFocused]),
}));
jest.mock('../../lib/api', () => ({ api: { lookup: jest.fn(), identify: jest.fn() } }));
jest.mock('./useWebLiveScan', () => ({ useWebLiveScan: () => mockLive }));

describe('ScanScreen (web)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockFocused = true;
    mockLive.status = 'unsupported';
  });

  it('releases the live preview on blur and restores it on focus', async () => {
    mockLive.status = 'live';
    const view = await render(<ScanScreenWeb />);
    expect(screen.getByTestId('scan-preview')).toBeTruthy();
    expect(mockLive.videoRef.mock.calls.at(-1)?.[0]).toBeTruthy();

    mockFocused = false;
    await view.rerender(<ScanScreenWeb />);
    expect(screen.queryByTestId('scan-preview')).toBeNull();
    expect(mockLive.videoRef.mock.calls.at(-1)?.[0]).toBeNull();
    expect(screen.getByLabelText(ro.scan.manualTitle)).toBeTruthy();

    mockFocused = true;
    await view.rerender(<ScanScreenWeb />);
    expect(screen.getByTestId('scan-preview')).toBeTruthy();
    expect(mockLive.videoRef.mock.calls.at(-1)?.[0]).toBeTruthy();
  });

  it('offers the photo route while the standalone camera is live', async () => {
    mockLive.status = 'live';
    await render(<ScanScreenWeb />);
    await fireEvent.press(screen.getByRole('button', { name: ro.scan.photoLabel }));
    expect(mockPush).toHaveBeenCalledWith('/capture');
  });

  it('without live support shows only the manual fallback and the photo flow, and does not claim live scanning', async () => {
    await render(<ScanScreenWeb />);
    expect(screen.getByText(ro.scan.webManualOnly)).toBeTruthy();
    expect(screen.queryByText(ro.scan.frameHint)).toBeNull();
    expect(screen.getByLabelText(ro.scan.manualTitle)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: ro.capture.title }));
    expect(mockPush).toHaveBeenCalledWith('/capture');
  });

  it('shows the frame hint only while the camera is live', async () => {
    mockLive.status = 'starting';
    const view = await render(<ScanScreenWeb />);
    expect(screen.queryByText(ro.scan.frameHint)).toBeNull();
    mockLive.status = 'live';
    await view.rerender(<ScanScreenWeb />);
    expect(screen.getByText(ro.scan.frameHint)).toBeTruthy();
  });

  it('frames a live camera in a tall preview with corner guides', async () => {
    mockLive.status = 'live';
    await render(<ScanScreenWeb />);
    expect(screen.getByTestId('scan-reticle')).toBeTruthy();
    const preview = screen.getByTestId('scan-preview');
    expect(preview.props.style).toEqual(expect.objectContaining({ aspectRatio: 3 / 4 }));
  });

  it('shows no corner guides when the camera is unavailable', async () => {
    await render(<ScanScreenWeb />);
    expect(screen.queryByTestId('scan-reticle')).toBeNull();
  });

  it('explains a refused camera, keeps manual entry, and can retry or take a photo', async () => {
    mockLive.status = 'denied';
    await render(<ScanScreenWeb />);
    expect(screen.getByText(ro.pwa.camera.browserDenied)).toBeTruthy();
    expect(screen.queryByText(ro.scan.frameHint)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: ro.errors.retry }));
    expect(mockLive.retry).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: ro.capture.title }));
    expect(mockPush).toHaveBeenCalledWith('/capture');
  });

  it('inside Scan home keeps manual entry closed while live and open when the camera is unavailable', async () => {
    mockLive.status = 'live';
    const view = await render(<ScanScreenWeb embedded />);
    expect(screen.queryByRole('header', { name: ro.scan.title })).toBeNull();
    expect(screen.queryByLabelText(ro.scan.manualTitle)).toBeNull();
    await view.rerender(<ScanScreenWeb embedded manual />);
    expect(screen.getByLabelText(ro.scan.manualTitle)).toBeTruthy();
    mockLive.status = 'denied';
    await view.rerender(<ScanScreenWeb embedded />);
    expect(screen.getByLabelText(ro.scan.manualTitle)).toBeTruthy();
  });

  it('looks up a manually typed code and sends an unknown one to guided add', async () => {
    (api.lookup as unknown as jest.Mock<(...a: unknown[]) => Promise<unknown>>).mockResolvedValue(lookupNotFound);
    await render(<ScanScreenWeb />);
    await fireEvent.changeText(screen.getByLabelText(ro.scan.manualTitle), CODE);
    await fireEvent.press(screen.getByRole('button', { name: ro.scan.search }));
    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/add', params: { flow: 'guided', code: CODE } });
  });

  it('uses themed text for the scan heading and working status message', async () => {
    jest.spyOn(useScanLookupModule, 'useScanLookup').mockReturnValue({
      state: { status: 'working' },
      onCameraCode: jest.fn(async () => undefined),
      onManualCode: jest.fn(async () => undefined),
      retry: jest.fn(async () => undefined),
      dismiss: jest.fn(),
    });

    await render(<ScanScreenWeb />);
    const heading = screen.getByRole('header', { name: ro.scan.title });
    const working = screen.getByText(ro.capture.working);

    expect(heading.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ color: light.ink })]));
    expect(working.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ color: light.ink })]));
  });
});
