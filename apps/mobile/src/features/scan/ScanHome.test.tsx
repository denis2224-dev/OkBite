import React from 'react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { ro } from '../../copy/ro';
import { light } from '../../theme/tokens';
import { ScanHome } from './ScanHome';

const mockScanner = jest.fn((_props: { embedded?: boolean; torch?: boolean; zoom?: boolean }) => null);
jest.mock('./ScanScreen', () => ({ __esModule: true, default: (props: { embedded?: boolean; torch?: boolean; zoom?: boolean }) => mockScanner(props) }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('./RecentScans', () => ({ RecentScans: () => { throw new Error('recent scans must not be on Scan'); } }));

const lastProps = () => mockScanner.mock.calls.at(-1)![0];
const fill = (name: string) => StyleSheet.flatten(screen.getByRole('button', { name }).props.style);

describe('ScanHome', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('is only the camera, a light button and a close-up button', async () => {
    await render(<ScanHome active />);
    expect(lastProps()).toEqual({ embedded: true, torch: false, zoom: false });
    expect(screen.getByRole('button', { name: ro.scan.flashOn })).toBeTruthy();
    expect(screen.getByRole('button', { name: ro.scan.closeUpOn })).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(screen.queryByRole('header')).toBeNull();
    expect(screen.queryByRole('button', { name: ro.scan.manualLabel })).toBeNull();
    expect(screen.queryByRole('button', { name: ro.scan.photoLabel })).toBeNull();
    expect(screen.queryByText(ro.scan.labelMode)).toBeNull();
  });

  it('toggles the torch and the close-up zoom independently', async () => {
    await render(<ScanHome active />);
    await fireEvent.press(screen.getByRole('button', { name: ro.scan.flashOn }));
    expect(lastProps()).toMatchObject({ torch: true, zoom: false });
    await fireEvent.press(screen.getByRole('button', { name: ro.scan.closeUpOn }));
    expect(lastProps()).toMatchObject({ torch: true, zoom: true });
    await fireEvent.press(screen.getByRole('button', { name: ro.scan.flashOff }));
    expect(lastProps()).toMatchObject({ torch: false, zoom: true });
    await fireEvent.press(screen.getByRole('button', { name: ro.scan.closeUpOff }));
    expect(lastProps()).toMatchObject({ torch: false, zoom: false });
  });

  it('changes only colours between off and on', async () => {
    await render(<ScanHome active />);
    const off = fill(ro.scan.flashOn);
    await fireEvent.press(screen.getByRole('button', { name: ro.scan.flashOn }));
    const on = fill(ro.scan.flashOff);
    const { backgroundColor: offBg, ...offRest } = off;
    const { backgroundColor: onBg, ...onRest } = on;
    expect(onRest).toEqual(offRest);
    expect(offBg).toBe(light.cameraOverlay);
    expect(onBg).toBe(light.cameraInk);
    expect([off.width, off.height, off.borderRadius]).toEqual([46, 46, 23]);
  });

  it('releases the scanner and turns light and close-up off while the tab is not focused', async () => {
    const view = await render(<ScanHome active />);
    await fireEvent.press(screen.getByRole('button', { name: ro.scan.flashOn }));
    await fireEvent.press(screen.getByRole('button', { name: ro.scan.closeUpOn }));
    mockScanner.mockClear();
    await view.rerender(<ScanHome active={false} />);
    expect(mockScanner).not.toHaveBeenCalled();
    await view.rerender(<ScanHome active />);
    expect(lastProps()).toMatchObject({ torch: false, zoom: false });
  });
});
