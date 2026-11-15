import React from 'react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ro } from '../../copy/ro';
import { ScanHome } from './ScanHome';

const mockScanner = jest.fn((_props: { embedded?: boolean; torch?: boolean }) => null);
jest.mock('./ScanScreen', () => ({ __esModule: true, default: (props: { embedded?: boolean; torch?: boolean }) => mockScanner(props) }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), navigate: jest.fn() } }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('./RecentScans', () => ({ RecentScans: () => null }));

const lastProps = () => mockScanner.mock.calls.at(-1)![0];

describe('ScanHome', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('shows the wordmark and a labelled flash button; manual entry is a single row under the scanner, not a header button', async () => {
    await render(<ScanHome active />);
    expect(screen.getByRole('header', { name: ro.home.design.brand })).toBeTruthy();
    expect(screen.getByRole('button', { name: ro.scan.flashOn })).toBeTruthy();
    expect(screen.queryByRole('button', { name: ro.scan.manual })).toBeNull();
  });

  it('embeds the scanner and toggles the torch with the flash button', async () => {
    await render(<ScanHome active />);
    expect(lastProps()).toEqual({ embedded: true, torch: false });
    await fireEvent.press(screen.getByRole('button', { name: ro.scan.flashOn }));
    expect(lastProps().torch).toBe(true);
    await fireEvent.press(screen.getByRole('button', { name: ro.scan.flashOff }));
    expect(lastProps().torch).toBe(false);
  });

  it('marks Barcode as the selected segment and sends Label to the photo flow', async () => {
    await render(<ScanHome active />);
    const barcode = screen.getByRole('button', { name: ro.scan.manualLabel });
    const label = screen.getByRole('button', { name: ro.scan.photoLabel });
    expect(barcode.props.accessibilityState).toEqual(expect.objectContaining({ selected: true }));
    expect(label.props.accessibilityState).toEqual(expect.objectContaining({ selected: false }));
    expect(screen.getByText(ro.scan.labelMode)).toBeTruthy();
    await fireEvent.press(barcode);
    expect(router.push).not.toHaveBeenCalled();
    await fireEvent.press(label);
    expect(router.push).toHaveBeenCalledWith('/capture');
  });

  it('releases the scanner and turns the torch off while the tab is not focused', async () => {
    const view = await render(<ScanHome active />);
    await fireEvent.press(screen.getByRole('button', { name: ro.scan.flashOn }));
    mockScanner.mockClear();
    await view.rerender(<ScanHome active={false} />);
    expect(mockScanner).not.toHaveBeenCalled();
    await view.rerender(<ScanHome active />);
    expect(lastProps().torch).toBe(false);
  });
});
