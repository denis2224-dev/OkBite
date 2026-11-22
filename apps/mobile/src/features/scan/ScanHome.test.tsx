import React, { type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ro } from '../../copy/ro';
import { fonts, light } from '../../theme/tokens';
import { ScanHome } from './ScanHome';

type ScannerProps = { embedded?: boolean; torch?: boolean; trailing?: ReactNode };
const mockScanner = jest.fn((props: ScannerProps) => props.trailing ?? null);
jest.mock('./ScanScreen', () => ({ __esModule: true, default: (props: ScannerProps) => mockScanner(props) }));
jest.mock('./torchSupport', () => ({ torchSupported: true }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), navigate: jest.fn() } }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('./RecentScans', () => ({ RecentScans: () => null }));

const lastProps = () => mockScanner.mock.calls.at(-1)![0];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const flat = (el: { props: Record<string, any> }) => StyleSheet.flatten(el.props.style) as Record<string, unknown>;
const colourKeys = ['backgroundColor', 'borderColor', 'color', 'boxShadow'];
const shape = (style: Record<string, unknown>) => Object.fromEntries(Object.entries(style).filter(([key]) => !colourKeys.includes(key)));

describe('ScanHome', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('is a light page with the logo, the screen title and the score note once', async () => {
    await render(<ScanHome active />);
    expect(screen.getByRole('header', { name: ro.scan.homeTitle })).toBeTruthy();
    expect(screen.getByLabelText(ro.home.design.brand)).toBeTruthy();
    expect(flat(screen.getByTestId('scan-home'))).toMatchObject({ backgroundColor: light.ground });
    expect(screen.getAllByText(ro.score.disclaimer)).toHaveLength(1);
  });

  it('embeds the scanner and puts a 52 pt flash circle next to manual entry, toggling the torch', async () => {
    await render(<ScanHome active />);
    expect(lastProps()).toEqual(expect.objectContaining({ embedded: true, torch: false }));
    const flash = screen.getByRole('button', { name: ro.scan.flashOn });
    expect(flat(flash)).toMatchObject({ width: 52, height: 52, backgroundColor: light.surface });
    await fireEvent.press(flash);
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

  it('mode switch: the selected segment changes colour only', async () => {
    await render(<ScanHome active />);
    const on = flat(screen.getByRole('button', { name: ro.scan.manualLabel }));
    const off = flat(screen.getByRole('button', { name: ro.scan.photoLabel }));
    expect(shape(on)).toEqual(shape(off));
    expect(on.backgroundColor).toBe(light.primary);
    // A wrapping row sits at the top of its box unless its lines are centred too.
    expect(on).toMatchObject({ alignItems: 'center', justifyContent: 'center', alignContent: 'center' });
    const onText = flat(screen.getByText(ro.scan.manualLabel));
    const offText = flat(screen.getByText(ro.scan.labelMode));
    expect(onText).toMatchObject({ color: light.onPrimary, fontFamily: fonts.bold });
    expect(offText).toMatchObject({ color: light.textSecondary, fontFamily: fonts.bold });
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
