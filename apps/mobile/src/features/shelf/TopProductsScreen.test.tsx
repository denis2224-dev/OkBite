import { StyleSheet } from 'react-native';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { api } from '../../lib/api';
import { ro } from '../../copy/ro';
import { light } from '../../theme/tokens';
import { previewEntries } from '../../test/fixtures';
import { TopProductsScreen } from './TopProductsScreen';
import { clearTopProductsCache } from './useTopProducts';
import { topShelves } from './topShelves';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('../../lib/api', () => ({ api: { topProducts: jest.fn() } }));
const topProducts = api.topProducts as unknown as jest.Mock;
const yogurts = previewEntries.filter(entry => entry.product.category.slug === 'iaurt');
const respond = (slug: string, entries = previewEntries.filter(entry => entry.product.category.slug === slug)) => ({ category: slug, products: entries.map(({ product, score }) => ({ product, score })) });
beforeEach(() => { jest.clearAllMocks(); clearTopProductsCache(); topProducts.mockImplementation(async (slug: string) => respond(slug)); });
const chip = (slug: string) => screen.getByRole('button', { name: ro.scan.shelf.names[slug as keyof typeof ro.scan.shelf.names] });

it('has the title and one chip per type, the first chosen, with no fruits and vegetables', async () => {
  await render(<TopProductsScreen />);
  expect(screen.getByRole('header', { name: ro.topProducts.title })).toBeTruthy();
  for (const shelf of topShelves) expect(chip(shelf.slug)).toBeTruthy();
  expect(screen.queryByRole('button', { name: ro.scan.shelf.names['fructe-legume'] })).toBeNull();
  expect(chip('iaurt').props.accessibilityState.selected).toBe(true);
  expect(chip('biscuiti').props.accessibilityState.selected).toBe(false);
  await waitFor(() => expect(topProducts).toHaveBeenCalledWith('iaurt'));
});

it('lists the three best of the type as ranks 1 to 3, best score first, the first outlined', async () => {
  await render(<TopProductsScreen />);
  const rows = await screen.findAllByTestId(/^top-row-/);
  expect(rows).toHaveLength(Math.min(3, yogurts.length));
  const names = rows.map(row => within(row).getByText(/Iaurt/).props.children);
  expect(names[0]).toBe('Iaurt natural 2,5%'); // 86, the best yogurt in the fixtures
  expect(within(rows[0]!).getByText('1')).toBeTruthy();
  expect(within(rows[1]!).getByText('2')).toBeTruthy();
  const outline = (row: typeof rows[number]) => StyleSheet.flatten(row.props.style);
  expect(outline(rows[0]!).borderColor).toBe(light.primary);
  expect(outline(rows[1]!).borderColor).toBe(light.transparent);
  expect(outline(rows[0]!).borderWidth).toBe(outline(rows[1]!).borderWidth); // the outline is colour only
  expect(rows[0]!.props.accessibilityLabel).toContain(ro.topProducts.rank(1));
});

it('opens the product when a row is tapped', async () => {
  await render(<TopProductsScreen />);
  const [first] = await screen.findAllByTestId(/^top-row-/);
  await fireEvent.press(first!);
  expect(router.push).toHaveBeenCalledWith({ pathname: '/product/[id]', params: { id: expect.any(String) } });
});

it('shows only the products there are when a type has fewer than three, and the empty text for none', async () => {
  topProducts.mockImplementation(async (slug: string) => respond(slug, slug === 'iaurt' ? yogurts.slice(0, 1) : []));
  await render(<TopProductsScreen />);
  expect(await screen.findAllByTestId(/^top-row-/)).toHaveLength(1);
  await fireEvent.press(chip('biscuiti'));
  expect(await screen.findByText(ro.scan.shelf.empty)).toBeTruthy();
  expect(screen.queryAllByTestId(/^top-row-/)).toHaveLength(0);
});

it('loads another type when its chip is chosen, and chips differ only by colour', async () => {
  await render(<TopProductsScreen />);
  await screen.findAllByTestId(/^top-row-/);
  const flat = (slug: string) => StyleSheet.flatten(chip(slug).props.style);
  const { backgroundColor: onBg, ...on } = flat('iaurt');
  const { backgroundColor: offBg, ...off } = flat('biscuiti');
  expect(on).toEqual(off);
  expect(onBg).toBe(light.primary);
  expect(offBg).not.toBe(light.primary);
  await fireEvent.press(chip('biscuiti'));
  await waitFor(() => expect(topProducts).toHaveBeenCalledWith('biscuiti'));
  expect(chip('biscuiti').props.accessibilityState.selected).toBe(true);
  expect(chip('iaurt').props.accessibilityState.selected).toBe(false);
});

it('shows an error with a retry', async () => {
  topProducts.mockRejectedValueOnce(new Error('offline'));
  await render(<TopProductsScreen />);
  expect(await screen.findByText(ro.scan.shelf.error)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: ro.errors.retry }));
  expect((await screen.findAllByTestId(/^top-row-/)).length).toBeGreaterThan(0);
});

it('has no description, caption, bullet or middle dot', async () => {
  await render(<TopProductsScreen />);
  await screen.findAllByTestId(/^top-row-/);
  expect(screen.queryByText(ro.score.disclaimer)).toBeNull();
  expect(screen.queryByText(/[•·]/)).toBeNull();
});
