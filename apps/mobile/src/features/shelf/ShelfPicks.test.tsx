import React from 'react';
import { AccessibilityInfo, Animated, StyleSheet } from 'react-native';
import { light, radii } from '../../theme/tokens';
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { ro } from '../../copy/ro';
import { previewEntries } from '../../test/fixtures';
import { api } from '../../lib/api';
import { shelves } from './shelves';
import { rankTop } from './topProducts';
import { clearTopProductsCache } from './useTopProducts';
import { ShelfPicks } from './ShelfPicks';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), navigate: jest.fn() } }));
jest.mock('../../lib/api', () => ({ api: { topProducts: jest.fn() } }));

const inShelf = (category: string) => ({ category, products: previewEntries.filter(entry => entry.product.category.slug === category).map(({ product, score }) => ({ product, score })) });
const yogurts = rankTop(inShelf('iaurt').products);
const biscuits = rankTop(inShelf('biscuiti').products);
const rowLabel = (pick: (typeof yogurts)[number]) => new RegExp(`${pick.product.name}, ${pick.product.brand}\\. ${ro.history.score(pick.score)} · ${ro.tiers[pick.tier]}$`);
const shelf = (slug: keyof typeof ro.scan.shelf.names) => screen.getByRole('button', { name: ro.scan.shelf.names[slug] });

beforeEach(() => {
  jest.clearAllMocks();
  clearTopProductsCache();
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
  jest.mocked(api.topProducts).mockImplementation(async category => inShelf(category));
});
afterEach(() => jest.restoreAllMocks());

it('shows the title and every shelf as a button, in order, with the first one selected', async () => {
  await render(<ShelfPicks />);
  expect(screen.getByRole('header', { name: ro.scan.shelf.title })).toBeTruthy();
  const buttons = screen.getAllByRole('button').filter(button => button.props.accessibilityState?.selected !== undefined);
  expect(buttons.map(button => button.props.accessibilityLabel)).toEqual(shelves.map(item => ro.scan.shelf.names[item.slug]));
  expect(buttons.map(button => button.props.accessibilityState.selected)).toEqual(shelves.map((_, index) => index === 0));
  await screen.findByRole('button', { name: rowLabel(yogurts[0]!) });
});

it('lists the top products of the first shelf as grade rows in a soft card, with no labels or notes', async () => {
  await render(<ShelfPicks />);
  expect(yogurts).toHaveLength(3);
  for (const pick of yogurts) {
    expect(await screen.findByRole('button', { name: rowLabel(pick) })).toBeTruthy();
    expect(screen.getByText(pick.product.name)).toBeTruthy();
    expect(screen.getAllByText(String(pick.score), { includeHiddenElements: true }).length).toBeGreaterThan(0);
  }
  expect(StyleSheet.flatten(screen.getByTestId('shelf-card').props.style)).toMatchObject({ backgroundColor: light.surface, borderRadius: radii.card });
  expect(screen.getByRole('button', { name: rowLabel(yogurts[0]!) }).props.accessibilityLabel).toContain(ro.scan.shelf.best);
  for (const text of [ro.scan.shelf.top(ro.scan.shelf.names.iaurt), ro.scan.shelf.count(3), ro.scan.shelf.best, ro.score.disclaimer, ro.scan.shelf.ranking, `${yogurts[0]!.product.brand}, ${yogurts[0]!.product.quantity}`]) {
    expect(screen.queryByText(text)).toBeNull();
  }
});

it('shelf buttons change colour only when selected', async () => {
  await render(<ShelfPicks />);
  const ring = (slug: keyof typeof ro.scan.shelf.names) => StyleSheet.flatten(screen.getByTestId(`shelf-circle-${slug}`, { includeHiddenElements: true }).props.style);
  const shape = (style: Record<string, unknown>) => Object.fromEntries(Object.entries(style).filter(([key]) => !['backgroundColor', 'borderColor', 'color', 'boxShadow'].includes(key)));
  expect(shape(ring('iaurt'))).toEqual(shape(ring('biscuiti')));
  expect(ring('iaurt').borderColor).toBe(light.primary);
});

it('switches shelf: the selection, the header and the rows change; going back does not ask again', async () => {
  await render(<ShelfPicks />);
  await screen.findByRole('button', { name: rowLabel(yogurts[0]!) });
  await fireEvent.press(shelf('biscuiti'));
  expect(shelf('biscuiti').props.accessibilityState).toEqual(expect.objectContaining({ selected: true }));
  expect(shelf('iaurt').props.accessibilityState).toEqual(expect.objectContaining({ selected: false }));
  expect(await screen.findByRole('button', { name: rowLabel(biscuits[0]!) })).toBeTruthy();
  expect(screen.queryByText(yogurts[0]!.product.name)).toBeNull();
  await fireEvent.press(shelf('iaurt'));
  expect(screen.getByRole('button', { name: rowLabel(yogurts[0]!) })).toBeTruthy(); // from the session cache, at once
  expect(jest.mocked(api.topProducts).mock.calls.map(call => call[0])).toEqual(['iaurt', 'biscuiti']);
});

it('opens the product from its row', async () => {
  await render(<ShelfPicks />);
  await fireEvent.press(await screen.findByRole('button', { name: rowLabel(yogurts[1]!) }));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/product/[id]', params: { id: yogurts[1]!.product.id } });
});

it('shows placeholders, not rows, while the shelf loads', async () => {
  jest.mocked(api.topProducts).mockReturnValue(new Promise(() => undefined));
  await render(<ShelfPicks />);
  expect(screen.getByLabelText(ro.app.loading)).toBeTruthy();
  expect(screen.queryByText(ro.scan.shelf.empty)).toBeNull();
  expect(screen.queryByText(ro.score.disclaimer)).toBeNull();
});

it('says the shelf is empty when it has no products, or none with a score', async () => {
  await render(<ShelfPicks />);
  await fireEvent.press(shelf('suc')); // the sample juice has no score
  expect(await screen.findByText(ro.scan.shelf.empty)).toBeTruthy();
  expect(screen.queryByText(ro.score.disclaimer)).toBeNull();
  await fireEvent.press(shelf('apa'));
  expect(await screen.findByText(ro.scan.shelf.empty)).toBeTruthy();
});

it('offers a retry when the shelf cannot be loaded, and shows the rows once it works', async () => {
  jest.mocked(api.topProducts).mockRejectedValueOnce(new Error('offline'));
  await render(<ShelfPicks />);
  expect(await screen.findByText(ro.scan.shelf.error)).toBeTruthy();
  expect(screen.queryByText(ro.scan.shelf.empty)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: ro.errors.retry }));
  expect(await screen.findByRole('button', { name: rowLabel(yogurts[0]!) })).toBeTruthy();
  expect(screen.queryByText(ro.scan.shelf.error)).toBeNull();
});

describe('motion', () => {
  it('does not animate when the phone asks for reduced motion', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    await render(<ShelfPicks />);
    await screen.findByRole('button', { name: rowLabel(yogurts[0]!) });
    await fireEvent.press(shelf('biscuiti'));
    await screen.findByRole('button', { name: rowLabel(biscuits[0]!) });
    expect(timing).not.toHaveBeenCalled();
  });

  it('does not animate, or crash, when the reduced-motion check is unavailable', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockReturnValue(undefined as unknown as Promise<boolean>);
    await render(<ShelfPicks />);
    await screen.findByRole('button', { name: rowLabel(yogurts[0]!) });
    expect(timing).not.toHaveBeenCalled();
  });

  it('raises the list in once, in about 300 ms, each time the shelf changes when motion is allowed', async () => {
    const timing = jest.spyOn(Animated, 'timing');
    jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(false);
    await render(<ShelfPicks />);
    await waitFor(() => expect(timing).toHaveBeenCalledTimes(1));
    expect(timing.mock.calls[0]![1]).toMatchObject({ toValue: 1, duration: 300, useNativeDriver: true });
    await fireEvent.press(shelf('biscuiti'));
    await waitFor(() => expect(timing).toHaveBeenCalledTimes(2));
  });
});
