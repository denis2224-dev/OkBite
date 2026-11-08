import { render, screen, fireEvent } from '@testing-library/react-native';
import { useEffect as mockUseEffect } from 'react';
import Compare from '../../../app/(tabs)/compare';
import { previewEntries } from '../../test/fixtures';
import { ro } from '../../copy/ro';
import { ProductPicker } from './ProductPicker';
const mockEntries = previewEntries.map(entry => ({ ...entry, savedAt: '2026-11-05T00:00:00.000Z' }));
let mockId: string | undefined;
let mockPending: Promise<typeof mockEntries> | undefined;
beforeEach(() => { mockId = undefined; mockPending = undefined; });
jest.mock('../history/store', () => ({ listHistory: async () => mockPending ?? mockEntries }));
jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({ id: mockId }), router: { push: jest.fn(), canGoBack: () => true, back: jest.fn() },
  useFocusEffect: (effect: () => void | (() => void)) => mockUseEffect(effect, [effect]) }));

async function choose(index: number) {
  await fireEvent.press(screen.getAllByRole('button', { name: ro.compare.choose })[0]!);
  const product = previewEntries[index]!.product;
  await fireEvent.press(screen.getByRole('button', { name: `${product.name} · ${product.brand}` }));
}
test('renders the same-category comparison from history and announces picker expansion', async () => {
  await render(<Compare />);
  const picker = screen.getAllByRole('button', { name: ro.compare.choose })[0]!;
  await fireEvent.press(picker);
  expect(picker.props.accessibilityState.expanded).toBe(true);
  const product = previewEntries[0]!.product;
  await fireEvent.press(screen.getByRole('button', { name: `${product.name} · ${product.brand}` }));
  await choose(1);
  expect(screen.getByText('4,1 g')).toBeTruthy();
  expect(screen.getByText('13,2 g')).toBeTruthy();
  expect(screen.getAllByText(ro.score.disclaimer)).toHaveLength(2);
});
test('different categories show guidance and no nutrient comparison table', async () => {
  await render(<Compare />);
  await choose(0); await choose(3);
  expect(screen.getByText(ro.compare.otherCategory)).toBeTruthy();
  expect(screen.queryByText(ro.result.nutrients.sugar)).toBeNull();
});
test('a different deep link does not show the old comparison while history is loading', async () => {
  const result = await render(<Compare />);
  await choose(0); await choose(1);
  mockId = previewEntries[2]!.product.id;
  mockPending = new Promise(() => {});
  await result.rerender(<Compare />);
  expect(screen.queryByText('4,1 g')).toBeNull();
});
test('comparison preserves source, verification, declared allergens and possible traces', async () => {
  await render(<Compare />);
  await choose(0); await choose(1);
  expect(screen.getAllByText(previewEntries[0]!.product.source)).toHaveLength(2);
  expect(screen.getAllByText('Lapte')).toHaveLength(2);
  expect(screen.getByText(ro.result.mayContain)).toBeTruthy();
});
test('an unverified selection keeps its status visible', async () => {
  const selected = mockEntries[0]!;
  await render(<ProductPicker entries={mockEntries} selected={{ ...selected,
    product: { ...selected.product, status: 'unverified' } }} onSelect={() => {}} />);
  expect(screen.getAllByText(ro.result.unverified)).toHaveLength(2);
});

test('compatible comparison withholds a stale score for an incomplete label', async () => {
  const original = mockEntries[0]!;
  mockEntries[0] = { ...original, product: { ...original.product, nutrients: { ...original.product.nutrients, salt: null } } };
  try {
    await render(<Compare />);
    await choose(0); await choose(1);
    expect(screen.getByText(ro.result.scoreUnavailable)).toBeTruthy();
    expect(screen.getByText(ro.result.missing)).toBeTruthy();
  } finally { mockEntries[0] = original; }
});
