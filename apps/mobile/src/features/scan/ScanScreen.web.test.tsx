import React from 'react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { api } from '../../lib/api';
import { ro } from '../../copy/ro';
import ScanScreenWeb from './ScanScreen.web';
import { CODE, lookupNotFound } from '../capture/__fixtures__/responses';

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockLive = { status: 'unsupported' as string, videoRef: jest.fn(), retry: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace, push: mockPush }) }));
jest.mock('../../lib/api', () => ({ api: { lookup: jest.fn(), identify: jest.fn() } }));
jest.mock('./useWebLiveScan', () => ({ useWebLiveScan: () => mockLive }));

describe('ScanScreen (web)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockLive.status = 'unsupported';
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

  it('explains a refused camera, keeps manual entry, and can retry or take a photo', async () => {
    mockLive.status = 'unavailable';
    await render(<ScanScreenWeb />);
    expect(screen.getByText(ro.scan.deniedText)).toBeTruthy();
    expect(screen.queryByText(ro.scan.frameHint)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: ro.errors.retry }));
    expect(mockLive.retry).toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: ro.capture.title }));
    expect(mockPush).toHaveBeenCalledWith('/capture');
  });

  it('looks up a manually typed code and sends an unknown one to identify', async () => {
    (api.lookup as unknown as jest.Mock<(...a: unknown[]) => Promise<unknown>>).mockResolvedValue(lookupNotFound);
    await render(<ScanScreenWeb />);
    await fireEvent.changeText(screen.getByLabelText(ro.scan.manualTitle), CODE);
    await fireEvent.press(screen.getByRole('button', { name: ro.scan.search }));
    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/identify', params: { source: 'code', code: CODE } });
  });
});
