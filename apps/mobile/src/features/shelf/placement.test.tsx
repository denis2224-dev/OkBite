import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import { ro } from '../../copy/ro';
import { ScanHome } from '../scan/ScanHome';

jest.mock('../scan/ScanScreen', () => ({ __esModule: true, default: () => null }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), navigate: jest.fn() } }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('../history/store', () => ({ listHistory: jest.fn(async () => []) }));
jest.mock('../profile', () => ({ useProfile: () => ({ profile: { goals: [], allergens: [], avoid: [], onboarded: true } }) }));
jest.mock('../../lib/api', () => ({ api: { topProducts: jest.fn(async (category: string) => ({ category, products: [] })) } }));

it('shows "Cel mai bun din raft" on Scan home, above the recent scans', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  await render(<ScanHome active />);
  await screen.findByText(ro.scan.shelf.empty);
  expect(screen.getByRole('header', { name: ro.scan.shelf.title })).toBeTruthy();
  const json = JSON.stringify(screen.toJSON());
  expect(json.indexOf(ro.scan.shelf.title)).toBeLessThan(json.indexOf(ro.home.design.empty));
});
