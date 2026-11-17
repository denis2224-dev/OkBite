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

it('shows "Cel mai bun din raft" on the Scan home sheet, above "Scanate recent"', async () => {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  await render(<ScanHome active />);
  await screen.findByText(ro.scan.shelf.empty);
  const headers = screen.getAllByRole('header').map(header => header.props.children);
  expect(headers.indexOf(ro.scan.shelf.title)).toBeGreaterThan(-1);
  expect(headers.indexOf(ro.scan.shelf.title)).toBeLessThan(headers.indexOf(ro.home.design.recent));
});
