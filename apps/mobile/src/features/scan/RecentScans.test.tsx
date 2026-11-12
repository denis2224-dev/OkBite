import React from 'react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import type { Allergen } from '@okbite/shared';
import { ro } from '../../copy/ro';
import { previewEntries } from '../../test/fixtures';
import { displayScore } from '../product/displayScore';
import { listHistory, type HistoryEntry } from '../history/store';
import { RecentScans } from './RecentScans';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), navigate: jest.fn() } }));
jest.mock('../history/store', () => ({ listHistory: jest.fn() }));
const mockAllergens: { value: Allergen[] } = { value: [] };
jest.mock('../profile', () => ({ useProfile: () => ({ profile: { goals: [], allergens: mockAllergens.value, avoid: [], onboarded: true } }) }));

// Four real preview entries; the oldest is the biscuits (gluten, milk, soy), the newest the first yogurt (milk only).
const entries: HistoryEntry[] = previewEntries.slice(0, 4).map((entry, index) => ({ ...entry, savedAt: `2026-11-0${9 - index}T09:00:00.000Z` }));
const [yogurt, , , biscuits] = entries as [HistoryEntry, HistoryEntry, HistoryEntry, HistoryEntry];
const tier = (entry: HistoryEntry) => ro.score[displayScore(entry.product, entry.score).grade];

describe('RecentScans', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAllergens.value = [];
    jest.mocked(listHistory).mockResolvedValue([...entries].reverse());
  });

  it('lists the three newest history products with their tier word and the score disclaimer', async () => {
    await render(<RecentScans active />);
    expect(await screen.findByRole('header', { name: ro.home.design.recent })).toBeTruthy();
    expect(await screen.findByText(yogurt.product.name)).toBeTruthy();
    expect(screen.queryByText(biscuits.product.name)).toBeNull();
    expect(screen.getAllByRole('button', { name: new RegExp(`^${ro.history.open('')}`) })).toHaveLength(3);
    expect(screen.getAllByText(tier(yogurt)).length).toBeGreaterThan(0);
    expect(screen.getByText(ro.score.disclaimer)).toBeTruthy();
    expect(screen.queryByText(ro.allergens.Lapte)).toBeNull();
  });

  it('warns with the allergen name only when the product matches the profile', async () => {
    mockAllergens.value = ['Lapte'];
    await render(<RecentScans active />);
    expect(await screen.findAllByText(ro.allergens.Lapte)).toHaveLength(3);
    const row = screen.getByRole('button', { name: new RegExp(ro.history.open(yogurt.product.name)) });
    expect(row.props.accessibilityLabel).toContain(ro.result.containsAllergen(ro.allergens.Lapte));
  });

  it('shows no warning for a profile allergen the recent products do not declare', async () => {
    mockAllergens.value = ['Soia'];
    await render(<RecentScans active />);
    await screen.findByText(yogurt.product.name);
    expect(screen.queryByText(ro.allergens.Soia)).toBeNull();
  });

  it('shows a short empty line and no products when history is empty', async () => {
    jest.mocked(listHistory).mockResolvedValue([]);
    await render(<RecentScans active />);
    expect(await screen.findByText(ro.home.design.empty)).toBeTruthy();
    expect(screen.queryByRole('button', { name: new RegExp(`^${ro.history.open('')}`) })).toBeNull();
    expect(screen.queryByText(ro.score.disclaimer)).toBeNull();
  });

  it('opens a product from its row and the History tab from See all', async () => {
    await render(<RecentScans active />);
    await fireEvent.press(await screen.findByRole('button', { name: new RegExp(ro.history.open(yogurt.product.name)) }));
    expect(router.push).toHaveBeenCalledWith({ pathname: '/product/[id]', params: { id: yogurt.product.id, cached: '1' } });
    const seeAll = screen.getByRole('button', { name: ro.home.allHistory });
    expect(screen.getByText(ro.scan.seeAll)).toBeTruthy();
    await fireEvent.press(seeAll);
    expect(router.navigate).toHaveBeenCalledWith('/history');
  });

  it('reloads history each time the tab becomes active again', async () => {
    const view = await render(<RecentScans active />);
    await screen.findByText(yogurt.product.name);
    await view.rerender(<RecentScans active={false} />);
    await view.rerender(<RecentScans active />);
    expect(listHistory).toHaveBeenCalledTimes(2);
  });

  it('says so when history cannot be read', async () => {
    jest.mocked(listHistory).mockRejectedValue(new Error('disk'));
    await render(<RecentScans active />);
    expect(await screen.findByText(ro.history.loadError)).toBeTruthy();
  });
});
