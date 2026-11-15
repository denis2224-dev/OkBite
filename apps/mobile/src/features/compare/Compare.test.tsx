import { render, screen, fireEvent, within } from '@testing-library/react-native';
import { useEffect as mockUseEffect } from 'react';
import Compare from '../../../app/(tabs)/compare';
import { previewEntries } from '../../test/fixtures';
import { ro } from '../../copy/ro';
import { ProductPicker } from './ProductPicker';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { compareRows } from './compare';
const mockEntries = previewEntries.map(entry => ({ ...entry, savedAt: '2026-11-05T00:00:00.000Z' }));
let mockId: string | undefined;
let mockAllergens: string[] = [];
let mockPending: Promise<typeof mockEntries> | undefined;
beforeEach(() => { mockId = undefined; mockPending = undefined; mockAllergens = []; mockIsPreview = false; });
let mockIsPreview = false;
jest.mock('../../lib/preview', () => ({ get isPreview() { return mockIsPreview; } }));
jest.mock('../profile', () => ({ useProfile: () => ({ profile: { goals: [], allergens: mockAllergens, avoid: [], onboarded: true } }) }));
jest.mock('../history/store', () => ({ listHistory: async () => mockPending ?? mockEntries }));
jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({ id: mockId }), router: { push: jest.fn(), canGoBack: () => true, back: jest.fn() },
  useFocusEffect: (effect: () => void | (() => void)) => mockUseEffect(effect, [effect]) }));

async function choose(index: number) {
  await fireEvent.press(screen.getAllByRole('button', { name: new RegExp(ro.compare.choose) })[0]!);
  const product = previewEntries[index]!.product;
  await fireEvent.press(screen.getByRole('button', { name: `${product.name} · ${product.brand}` }));
}
test('renders the same-category comparison from history and announces picker expansion', async () => {
  await render(<Compare />);
  const picker = screen.getAllByRole('button', { name: new RegExp(ro.compare.choose) })[0]!;
  await fireEvent.press(picker);
  expect(picker.props.accessibilityState.expanded).toBe(true);
  const product = previewEntries[0]!.product;
  await fireEvent.press(screen.getByRole('button', { name: `${product.name} · ${product.brand}` }));
  await choose(1);
  expect(screen.getByText('4,1 g')).toBeTruthy();
  expect(screen.getByText('13,2 g')).toBeTruthy();
  expect(screen.getAllByText(ro.score.disclaimer)).toHaveLength(2);
});
test('can photograph another product after completing a compatible comparison', async () => {
  await render(<Compare />);
  await choose(0); await choose(1);
  await fireEvent.press(screen.getByRole('button', { name: ro.compare.photo }));
  expect(router.push).toHaveBeenCalledWith('/capture');
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
test('comparison cards keep allergens and traces but leave sources to the product page', async () => {
  await render(<Compare />);
  await choose(0); await choose(1);
  expect(screen.queryByText(ro.result.source)).toBeNull();
  expect(screen.queryByText(previewEntries[0]!.product.source)).toBeNull();
  expect(screen.getAllByText('Lapte')).toHaveLength(2);
  expect(screen.getByText(ro.result.mayContain)).toBeTruthy();
});
test('an unverified selection keeps its status visible', async () => {
  const selected = mockEntries[0]!;
  await render(<ProductPicker entries={mockEntries} selected={{ ...selected,
    product: { ...selected.product, status: 'unverified' } }} onSelect={() => {}} />);
  expect(screen.getAllByText(ro.result.unverified)).toHaveLength(2);
});

test('uses trace tone for mayContain and missingAllergenNote when unverified', async () => {
  const selected = mockEntries[0]!;
  await render(<ProductPicker entries={mockEntries} selected={{
    ...selected,
    product: {
      ...selected.product,
      status: 'unverified',
      ingredientsText: '',
      allergens: [],
      mayContain: ['Lapte', 'Arahide'],
    },
  }} onSelect={() => {}} />);
  expect(screen.getAllByText(ro.result.missingAllergenNote)).toHaveLength(1);
  expect(screen.queryByText(ro.result.noAllergens)).toBeNull();
  expect(screen.getByLabelText(`${ro.result.mayContain} Lapte`)).toBeTruthy();
  expect(screen.getByLabelText(`${ro.result.mayContain} Arahide`)).toBeTruthy();
  expect(screen.queryByLabelText('Lapte')).toBeNull();
  expect(screen.queryByLabelText('Arahide')).toBeNull();
});

test('shows noAllergens for verified product with confirmed ingredients and no allergens', async () => {
  const selected = mockEntries[0]!;
  await render(<ProductPicker entries={mockEntries} selected={{
    ...selected,
    product: {
      ...selected.product,
      status: 'verified',
      ingredientsText: 'Apă, sare',
      allergens: [],
      mayContain: [],
    },
  }} onSelect={() => {}} />);
  expect(screen.getByText(ro.result.noAllergens)).toBeTruthy();
  // The single check-the-package line stays even when no allergen is declared.
  expect(screen.getAllByText(ro.result.missingAllergenNote)).toHaveLength(1);
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

test('each product card shows only name, brand, score, reasons and the disclaimer, laid out the same way', async () => {
  await render(<Compare />);
  await choose(0); await choose(1);
  for (const index of [0, 1]) {
    const { product } = previewEntries[index]!;
    expect(screen.getByText(product.name)).toBeTruthy();
    const initials = product.name.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toLocaleUpperCase('ro');
    expect(screen.queryByText(initials)).toBeNull();
  }
  const cards = screen.getAllByTestId('compare-card');
  expect(cards).toHaveLength(2);
  const styles = cards.map(card => StyleSheet.flatten(card.props.style));
  expect(styles[0]).toEqual(styles[1]);
  // The disclaimer sits at the foot of each card so both cards line up.
  for (const footer of screen.getAllByTestId('compare-card-footer')) expect(StyleSheet.flatten(footer.props.style).marginTop).toBe('auto');
  for (const reasons of screen.getAllByTestId('compare-card-reasons')) expect(StyleSheet.flatten(reasons.props.style).gap).toBeGreaterThanOrEqual(12);
});

const design = ro.compare.design;
test('the better-choice verdict marks the higher score, and only within one category', async () => {
  const result = await render(<Compare />);
  await choose(0); await choose(1);
  const cards = screen.getAllByTestId('compare-card');
  expect(within(cards[0]!).getByText(design.better)).toBeTruthy();
  expect(within(cards[1]!).queryByText(design.better)).toBeNull();
  await result.unmount();
  await render(<Compare />);
  await choose(0); await choose(3);
  expect(screen.queryByText(design.better)).toBeNull();
});

test('a better value carries a check icon with a spoken label, not colour alone', async () => {
  await render(<Compare />);
  await choose(0); await choose(1);
  const sugar = screen.getByTestId('compare-cell-sugar-a');
  expect(within(sugar).getByText('4,1 g')).toBeTruthy();
  expect(within(sugar).getByLabelText(design.betterValue)).toBeTruthy();
  expect(within(screen.getByTestId('compare-cell-sugar-b')).queryByLabelText(design.betterValue)).toBeNull();
  const better = compareRows(previewEntries[0]!.product, previewEntries[1]!.product).filter(row => row.key !== 'kcal' && row.better);
  expect(screen.getAllByLabelText(design.betterValue)).toHaveLength(better.length);
});

test('a card warns about a profile allergen only when that product declares it', async () => {
  mockAllergens = ['Lapte'];
  await render(<Compare />);
  await choose(3); await choose(4);
  const cards = screen.getAllByTestId('compare-card');
  expect(within(cards[0]!).getByText(design.profileWarning('lapte'))).toBeTruthy();
  // Product B only may contain traces of milk, which is not a declared match.
  expect(within(cards[1]!).queryByText(design.profileWarning('lapte'))).toBeNull();
});

test('no profile warning when the profile has no allergens', async () => {
  await render(<Compare />);
  await choose(3); await choose(4);
  expect(screen.queryByText(design.profileWarning('lapte'))).toBeNull();
});

test('the live comparison does not show the illustrative-scores footnote', async () => {
  await render(<Compare />);
  await choose(0); await choose(1);
  expect(screen.getAllByTestId('compare-card')).toHaveLength(2);
  expect(screen.queryByText(design.footnote)).toBeNull();
});

test('demo mode keeps the illustrative-scores footnote', async () => {
  mockIsPreview = true;
  await render(<Compare />);
  await choose(0); await choose(1);
  expect(screen.getByText(design.footnote)).toBeTruthy();
});

test('the empty screen labels both slots, explains the rule once, and gives each pick button its own label', async () => {
  await render(<Compare />);
  expect(screen.getByText(design.hint)).toBeTruthy();
  expect(screen.getByText(design.productA)).toBeTruthy();
  expect(screen.getByText(design.productB)).toBeTruthy();
  const a = screen.getByRole('button', { name: `${design.productA}: ${ro.compare.choose}` });
  const b = screen.getByRole('button', { name: `${design.productB}: ${ro.compare.choose}` });
  expect(a).not.toBe(b);
  expect(within(a).getByText(ro.compare.choose)).toBeTruthy();
});

test('photographing another product is a quiet text button, not a filled one', async () => {
  await render(<Compare />);
  const photo = screen.getByRole('button', { name: ro.compare.photo });
  expect(StyleSheet.flatten(photo.props.style).backgroundColor).toBe('transparent');
  expect(StyleSheet.flatten(photo.props.style).borderWidth).toBe(0);
});
