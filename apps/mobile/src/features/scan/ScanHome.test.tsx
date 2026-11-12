import React from 'react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ro } from '../../copy/ro';
import { ScanHome } from './ScanHome';

const mockScanner = jest.fn((_props: { embedded?: boolean; torch?: boolean; manual?: boolean }) => null);
jest.mock('./ScanScreen', () => ({ __esModule: true, default: (props: { embedded?: boolean; torch?: boolean; manual?: boolean }) => mockScanner(props) }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), navigate: jest.fn() } }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

const lastProps = () => mockScanner.mock.calls.at(-1)![0];

describe('ScanHome', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('shows the wordmark and labelled round buttons for flash and manual entry', async () => {
    await render(<ScanHome active />);
    expect(screen.getByRole('header', { name: ro.home.design.brand })).toBeTruthy();
    expect(screen.getByRole('button', { name: ro.scan.flashOn })).toBeTruthy();
    const keyboard = screen.getByRole('button', { name: ro.scan.manual });
    expect(keyboard.props.accessibilityState).toEqual(expect.objectContaining({ expanded: false }));
  });

  it('embeds the scanner and toggles the torch with the flash button', async () => {
    await render(<ScanHome active />);
    expect(lastProps()).toEqual(expect.objectContaining({ embedded: true, torch: false, manual: false }));
    await fireEvent.press(screen.getByRole('button', { name: ro.scan.flashOn }));
    expect(lastProps().torch).toBe(true);
    await fireEvent.press(screen.getByRole('button', { name: ro.scan.flashOff }));
    expect(lastProps().torch).toBe(false);
  });

  it('opens and closes manual barcode entry from the keyboard button', async () => {
    await render(<ScanHome active />);
    await fireEvent.press(screen.getByRole('button', { name: ro.scan.manual }));
    expect(lastProps().manual).toBe(true);
    expect(screen.getByRole('button', { name: ro.scan.manual }).props.accessibilityState).toEqual(expect.objectContaining({ expanded: true }));
    await fireEvent.press(screen.getByRole('button', { name: ro.scan.manual }));
    expect(lastProps().manual).toBe(false);
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
