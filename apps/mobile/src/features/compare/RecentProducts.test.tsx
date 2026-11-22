import { StyleSheet } from 'react-native';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { previewEntries } from '../../test/fixtures';
import { ro } from '../../copy/ro';
import { light } from '../../theme/tokens';
import { productScoreFor } from '../product/productScoreFor';
import { RecentProducts } from './RecentProducts';

const entries = previewEntries.map((entry, index) => ({ ...entry, savedAt: `2026-11-0${index + 1}T00:00:00.000Z` }));
const [yogurt, strawberry, , biscuit] = [entries[0]!, entries[1]!, entries[2]!, entries[3]!];
const label = (entry: typeof yogurt) => new RegExp(`^${entry.product.name}`);
const tile = (entry: typeof yogurt) => screen.getByRole('button', { name: label(entry) });

it('shows nothing until history has products', async () => {
  await render(<RecentProducts entries={[]} onPick={jest.fn()} />);
  expect(screen.toJSON()).toBeNull();
});
it('lists the newest products first as photo, score and verdict, with no name on screen', async () => {
  await render(<RecentProducts entries={entries} onPick={jest.fn()} />);
  expect(screen.getByRole('header', { name: ro.home.design.recent })).toBeTruthy();
  const tiles = screen.getAllByRole('button', { name: /, \d+ din 100|, fără scor/ }); // the product tiles, not the filter
  expect(tiles[0]!.props.accessibilityLabel).toContain(entries.at(-1)!.product.name);
  const scored = productScoreFor(yogurt.product, yogurt.score);
  expect(within(tile(yogurt)).getByText(String(scored.score))).toBeTruthy();
  expect(within(tile(yogurt)).getByText(ro.tiers[scored.tier!])).toBeTruthy();
  expect(screen.queryByText(yogurt.product.name)).toBeNull();
  expect(JSON.stringify(screen.toJSON())).not.toMatch(/[•·]/);
});
it('picks a product on press', async () => {
  const onPick = jest.fn();
  await render(<RecentProducts entries={entries} onPick={onPick} />);
  await fireEvent.press(tile(yogurt));
  expect(onPick).toHaveBeenCalledWith(yogurt);
});
it('marks the product in a slot in dark green and fades products that cannot be picked, with colour and fade only', async () => {
  await render(<RecentProducts entries={entries} a={yogurt} onPick={jest.fn()} />);
  const style = (entry: typeof yogurt) => StyleSheet.flatten(tile(entry).props.style);
  expect(style(yogurt).backgroundColor).toBe(light.primary); // already in slot A
  expect(tile(yogurt).props.accessibilityState).toMatchObject({ selected: true, disabled: false }); // pressing it again takes it out
  expect(style(strawberry).backgroundColor).toBe(light.surface);
  expect(tile(strawberry).props.accessibilityState).toMatchObject({ selected: false, disabled: false });
  expect(tile(biscuit).props.accessibilityState).toMatchObject({ disabled: true }); // another category
  expect(style(biscuit).opacity).toBeLessThan(1);
  const { backgroundColor: _a, opacity: _b, ...on } = style(yogurt);
  const { backgroundColor: _c, opacity: _d, ...off } = style(strawberry);
  expect(on).toEqual(off); // same size and shape
});
it('calls onPick for the chosen product too, so the page can take it out again', async () => {
  const onPick = jest.fn();
  await render(<RecentProducts entries={entries} a={yogurt} onPick={onPick} />);
  await fireEvent.press(tile(yogurt));
  expect(onPick).toHaveBeenCalledWith(yogurt);
});
it('does not call onPick for a product that cannot be picked', async () => {
  const onPick = jest.fn();
  await render(<RecentProducts entries={entries} a={yogurt} onPick={onPick} />);
  await fireEvent.press(tile(biscuit));
  expect(onPick).not.toHaveBeenCalled();
});

describe('product type filter on the "Scanate recent" line', () => {
  const pill = (current: string) => screen.getByRole('button', { name: ro.compare.filterLabel(current) });
  const names = () => screen.getAllByRole('button', { name: /, \d+ din 100|, fără scor/ }).map(tile => tile.props.accessibilityLabel as string);
  const biscuits = entries.filter(entry => entry.product.category.slug === 'biscuiti');

  it('shows the filter at the end of the line, starting on "Toate"', async () => {
    await render(<RecentProducts entries={entries} onPick={jest.fn()} />);
    expect(pill(ro.compare.filterAll)).toBeTruthy();
  });
  it('hides the filter when all products are of one type', async () => {
    await render(<RecentProducts entries={entries.filter(entry => entry.product.category.slug === 'iaurt')} onPick={jest.fn()} />);
    expect(screen.queryByRole('button', { name: new RegExp(`^${ro.compare.filterLabel('')}`) })).toBeNull();
  });
  it('lists every type found in history, with how many products each has', async () => {
    await render(<RecentProducts entries={entries} onPick={jest.fn()} />);
    await fireEvent.press(pill(ro.compare.filterAll));
    expect(screen.getByRole('header', { name: ro.compare.filterTitle })).toBeTruthy();
    for (const category of ['Iaurturi', 'Biscuiți', 'Sucuri']) expect(screen.getByRole('button', { name: category })).toBeTruthy();
    expect(within(screen.getByRole('button', { name: 'Iaurturi' })).getByText('3')).toBeTruthy();
    expect(screen.getByRole('button', { name: ro.compare.filterAll }).props.accessibilityState.selected).toBe(true);
  });
  it('shows only the chosen type, closes the list, and shows the type on the filter', async () => {
    await render(<RecentProducts entries={entries} onPick={jest.fn()} />);
    await fireEvent.press(pill(ro.compare.filterAll));
    await fireEvent.press(screen.getByRole('button', { name: 'Biscuiți' }));
    expect(screen.queryByRole('header', { name: ro.compare.filterTitle })).toBeNull(); // the list closed
    expect(pill('Biscuiți')).toBeTruthy();
    expect(names()).toHaveLength(biscuits.length);
    for (const entry of biscuits) expect(tile(entry)).toBeTruthy();
    expect(screen.queryByRole('button', { name: label(yogurt) })).toBeNull();
  });
  it('goes back to the newest products when "Toate" is chosen again', async () => {
    await render(<RecentProducts entries={entries} onPick={jest.fn()} />);
    await fireEvent.press(pill(ro.compare.filterAll));
    await fireEvent.press(screen.getByRole('button', { name: 'Biscuiți' }));
    await fireEvent.press(pill('Biscuiți'));
    await fireEvent.press(screen.getByRole('button', { name: ro.compare.filterAll }));
    expect(pill(ro.compare.filterAll)).toBeTruthy();
    expect(names()).toHaveLength(entries.length);
  });
  it('shows all products of a type, even more than the newest eight', async () => {
    const many = Array.from({ length: 12 }, (_, index) => ({ ...yogurt, savedAt: `2026-10-${String(10 + index)}T00:00:00.000Z`, product: { ...yogurt.product, id: `00000000-0000-4000-8000-0000000001${String(10 + index)}` } }));
    await render(<RecentProducts entries={[...many, biscuit]} onPick={jest.fn()} />);
    expect(names()).toHaveLength(8); // nothing chosen: the newest eight
    await fireEvent.press(pill(ro.compare.filterAll));
    await fireEvent.press(screen.getByRole('button', { name: 'Iaurturi' }));
    expect(names()).toHaveLength(12);
  });
  it('keeps colour-only selection in the list: same size, only the colours change', async () => {
    await render(<RecentProducts entries={entries} onPick={jest.fn()} />);
    await fireEvent.press(pill(ro.compare.filterAll));
    const flat = (name: string) => StyleSheet.flatten(screen.getByRole('button', { name }).props.style);
    const { backgroundColor: onBg, ...on } = flat(ro.compare.filterAll);
    const { backgroundColor: offBg, ...off } = flat('Sucuri');
    expect(on).toEqual(off);
    expect(onBg).toBe(light.primary);
    expect(offBg).toBe(light.transparent);
  });
});
