import { render, screen, fireEvent, within } from '@testing-library/react-native';
import { useEffect as mockUseEffect } from 'react';
import Compare from '../../../app/(tabs)/compare';
import { previewEntries } from '../../test/fixtures';
import { ro } from '../../copy/ro';
import { productScoreFor } from '../product/productScoreFor';
import { ProductPicker } from './ProductPicker';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { compareRows } from './compare';
import { light } from '../../theme/tokens';
import { emptyWaterProfile } from '@okbite/shared';
const design = ro.compare.design;
let mockEntries = previewEntries.map(entry => ({ ...entry, savedAt: '2026-11-05T00:00:00.000Z' }));
let mockId: string | undefined;
let mockAdded: string | undefined;
let mockAllergens: string[] = [];
let mockPending: Promise<typeof mockEntries> | undefined;
beforeEach(() => { mockEntries = previewEntries.map(entry => ({ ...entry, savedAt: '2026-11-05T00:00:00.000Z' })); mockId = undefined; mockAdded = undefined; mockPending = undefined; mockAllergens = []; mockIsPreview = false; });
let mockIsPreview = false;
jest.mock('../../lib/preview', () => ({ get isPreview() { return mockIsPreview; } }));
jest.mock('../profile', () => ({ useProfile: () => ({ profile: { goals: [], allergens: mockAllergens, avoid: [], onboarded: true } }) }));
jest.mock('../history/store', () => ({ listHistory: async () => mockPending ?? mockEntries }));
jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({ id: mockId, added: mockAdded }), router: { push: jest.fn(), setParams: jest.fn(), canGoBack: () => true, back: jest.fn() },
  useFocusEffect: (effect: () => void | (() => void)) => mockUseEffect(effect, [effect]) }));

async function choose(index: number) {
  await fireEvent.press(screen.getAllByRole('button', { name: new RegExp(ro.compare.pick) })[0]!);
  const product = previewEntries[index]!.product;
  await fireEvent.press(screen.getByRole('button', { name: `${product.name}, ${product.brand}` }));
}
test('renders the same-category comparison from history and announces picker expansion', async () => {
  await render(<Compare />);
  const picker = screen.getAllByRole('button', { name: new RegExp(ro.compare.pick) })[0]!;
  await fireEvent.press(picker);
  expect(picker.props.accessibilityState.expanded).toBe(true);
  const product = previewEntries[0]!.product;
  await fireEvent.press(screen.getByRole('button', { name: `${product.name}, ${product.brand}` }));
  await choose(1);
  expect(screen.getByText('4,1 g')).toBeTruthy();
  expect(screen.getByText('13,2 g')).toBeTruthy();
  expect(screen.queryByText(ro.score.disclaimer)).toBeNull(); // no "Calculat la 100 g…" line under the cards
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
test('declared allergens and distinct traces are plain text right under the cards, without a box or sources', async () => {
  await render(<Compare />);
  await choose(0); await choose(1);
  const note = screen.getByTestId('compare-allergens');
  expect(within(note).getByRole('header', { name: ro.result.allergens })).toBeTruthy();
  expect(within(note).getAllByText('Lapte', { exact: false })).toHaveLength(2); // one line per product: A and B
  expect(within(note).getAllByText(/^A:|^B:/)).toHaveLength(2);
  const style = StyleSheet.flatten(note.props.style);
  expect(style.backgroundColor).toBeUndefined();
  expect(style.borderWidth).toBeUndefined();
  // Easy to notice without a box: bold dark text at a readable size, not the muted grey of the footnotes.
  const title = StyleSheet.flatten(within(note).getByRole('header', { name: ro.result.allergens }).props.style);
  expect(title.fontSize).toBeGreaterThanOrEqual(15);
  expect(title.color).toBe(light.ink);
  const first = StyleSheet.flatten(within(note).getAllByText('Lapte', { exact: false })[0]!.props.style);
  expect(first.fontSize).toBeGreaterThanOrEqual(14);
  expect(first.color).toBe(light.ink);
  // Right below the two cards, before the table.
  const order = JSON.stringify(screen.toJSON());
  expect(order.lastIndexOf('compare-card')).toBeLessThan(order.indexOf('compare-allergens'));
  expect(order.indexOf('compare-allergens')).toBeLessThan(order.indexOf('compare-cell-kcal-a'));
  expect(within(note).getByText(`${ro.result.mayContain} ${ro.allergens['Fructe cu coajă lemnoasă']}`)).toBeTruthy();
  expect(screen.queryByText(ro.result.source)).toBeNull();
  expect(screen.queryByText(previewEntries[0]!.product.source)).toBeNull();
});
test('paired comparison distinguishes an incomplete label from possible traces', async () => {
  const first = mockEntries[0]!;
  mockEntries[0] = {
    ...first,
    product: { ...first.product, status: 'verified', ingredientsText: ' ', allergens: [], mayContain: ['Soia'] },
  };
  await render(<Compare />);
  await choose(0); await choose(1);
  const note = within(screen.getByTestId('compare-allergens'));
  expect(note.getByText(ro.result.allergenDataUnknown, { exact: false })).toBeTruthy();
  expect(note.getByText(`${ro.result.mayContain} ${ro.allergens.Soia}`)).toBeTruthy();
  expect(note.queryByText(ro.result.noAllergens, { exact: false })).toBeNull();
});

test('an unverified selection keeps its status visible', async () => {
  const selected = mockEntries[0]!;
  await render(<ProductPicker entries={mockEntries} selected={{ ...selected,
    product: { ...selected.product, status: 'unverified' } }} onSelect={() => {}} />);
  expect(screen.getAllByText(ro.result.unverified)).toHaveLength(1); // the picker badge; the source card explains instead
  expect(screen.getByText(ro.result.unverifiedNote)).toBeTruthy();
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
  expect(screen.getByText(ro.result.allergenDataUnknown)).toBeTruthy();
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
    expect(within(screen.getAllByTestId('compare-card')[0]!).queryByText(ro.history.noScore)).toBeNull(); // the cards never show a score
    expect(screen.queryByText(ro.result.missing)).toBeNull(); // missing values show as gaps in the table
  } finally { mockEntries[0] = original; }
});

test('each product card is only the photo and the name on its right', async () => {
  await render(<Compare />);
  await choose(0); await choose(1);
  const cards = screen.getAllByTestId('compare-card');
  expect(cards).toHaveLength(2);
  for (const [index, card] of cards.entries()) {
    const { product, score } = previewEntries[index]!;
    expect(within(card).getByTestId('compare-photo-tile')).toBeTruthy();
    expect(within(card).getByText(product.name)).toBeTruthy();
    const { tier } = productScoreFor(product, score);
    expect(within(card).queryByText(ro.tiers[tier!])).toBeNull();
    expect(within(card).queryByText(design.productA)).toBeNull();
    expect(within(card).queryByText(design.productB)).toBeNull();
    expect(within(card).queryByText(product.brand)).toBeNull();
    for (const reason of score.reasons) expect(within(card).queryByText(reason.title)).toBeNull();
    expect(within(card).queryByText(ro.score.disclaimer)).toBeNull();
    // No numbers besides the product's own name: nothing the table below already says.
    expect(within(card).queryAllByText(/\d/).filter(node => node.props.children !== product.name)).toHaveLength(0);
  }
  expect(screen.queryByTestId('compare-card-footer')).toBeNull();
});
test('the better product gets a thumbs-up in its top right corner, with no "Alegere mai bună" text, and only within one category', async () => {
  const result = await render(<Compare />);
  await choose(0); await choose(1);
  const cards = screen.getAllByTestId('compare-card');
  expect(within(cards[0]!).getByTestId('compare-better')).toBeTruthy();
  expect(within(cards[0]!).getByLabelText(design.better)).toBeTruthy(); // spoken only
  expect(within(cards[1]!).queryByTestId('compare-better')).toBeNull();
  expect(screen.queryByText(design.better)).toBeNull();
  await result.unmount();
  await render(<Compare />);
  await choose(0); await choose(3);
  expect(screen.queryByTestId('compare-better')).toBeNull();
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

test('demo comparisons show only the packaging note', async () => {
  mockIsPreview = true;
  await render(<Compare />);
  await choose(0); await choose(1);
  expect(screen.getAllByTestId('compare-card')).toHaveLength(2);
  for (const text of [ro.score.disclaimer, design.footnote]) expect(screen.queryByText(text)).toBeNull();
  expect(screen.getAllByText(ro.result.missingAllergenNote)).toHaveLength(1);
});

test('the empty screen labels both slots without a rule line, and gives each pick button its own label', async () => {
  await render(<Compare />);
  expect(screen.queryByText('Alege două produse din aceeași categorie.')).toBeNull();
  expect(screen.getByText(design.productA)).toBeTruthy();
  expect(screen.getByText(design.productB)).toBeTruthy();
  const a = screen.getByRole('button', { name: `${design.productA}: ${ro.compare.pick}` });
  const b = screen.getByRole('button', { name: `${design.productB}: ${ro.compare.pick}` });
  expect(a).not.toBe(b);
  expect(within(a).getByText(ro.compare.pick)).toBeTruthy();
});

test('compares two waters by mineral composition instead of food macros and keeps range estimates honest', async () => {
  const base = previewEntries[0]!;
  const emptyNutrients = Object.fromEntries(Object.keys(base.product.nutrients).map(k => [k, null])) as typeof base.product.nutrients;
  const waterA = {
    ...base,
    savedAt: '2026-11-05T00:00:00.000Z',
    product: {
      ...base.product,
      id: 'w-om-1',
      name: 'OM Plată',
      brand: 'OM',
      unit: 'ml' as const,
      category: { slug: 'apa', name: 'Apă', scoreKind: 'water' as const },
      nutrients: emptyNutrients,
      water: {
        ...emptyWaterProfile(),
        tdsMgL: 375, carbonation: 'still' as const, caMgL: 32.5, mgMgL: 12.5, naPlusKMgL: 72.5,
        ranges: { tdsMgL: { min: 350, max: 400 }, naPlusKMgL: { min: 70, max: 75 } },
      },
      ingredientsText: '',
      ingredients: [],
    },
    score: { score: null, letter: null, grade: 'medium' as const, reasons: [], missing: [] },
  };
  const waterB = {
    ...waterA,
    product: {
      ...waterA.product,
      id: 'w-aqua-2',
      name: 'Aqua Carpatica',
      brand: 'Aqua Carpatica',
      water: {
        ...emptyWaterProfile(),
        tdsMgL: 200, ph: 8.2, carbonation: 'still' as const, caMgL: 52, mgMgL: 17, naMgL: 0.7, hco3MgL: 220, no3MgL: 0.9,
      },
    },
    score: { score: 100, letter: null, grade: 'good' as const, reasons: [], missing: [] },
  };
  mockEntries = [waterA, waterB];
  await render(<Compare />);
  await fireEvent.press(screen.getAllByRole('button', { name: new RegExp(ro.compare.pick) })[0]!);
  await fireEvent.press(screen.getByRole('button', { name: 'OM Plată, OM' }));
  await fireEvent.press(screen.getAllByRole('button', { name: new RegExp(ro.compare.pick) })[0]!);
  await fireEvent.press(screen.getByRole('button', { name: 'Aqua Carpatica, Aqua Carpatica' }));

  expect(screen.queryByText(ro.result.nutrients.kcal)).toBeNull();
  expect(screen.getByText(ro.result.water.tdsLabel)).toBeTruthy();
  expect(screen.getByText('350–400 mg/l')).toBeTruthy();
  expect(screen.getByText('200 mg/l')).toBeTruthy();
  expect(screen.getByText(ro.result.water.ions.naPlusKMgL)).toBeTruthy();
});

test('an empty picker says the history is empty without a storage note', async () => {
  await render(<ProductPicker entries={[]} onSelect={jest.fn()} slot={design.productA} />);
  await fireEvent.press(screen.getByRole('button', { name: `${design.productA}: ${ro.compare.pick}` }));
  expect(screen.getByText(ro.history.design.emptyTitle)).toBeTruthy();
  expect(screen.queryByText(/acest telefon/)).toBeNull();
});

const tileFor = (index: number) => screen.getByRole('button', { name: new RegExp(`^${previewEntries[index]!.product.name}, ${previewEntries[index]!.product.brand}, `) });

test('the empty page shows recent products and one big photo button, with no caption', async () => {
  await render(<Compare />);
  expect(await screen.findByRole('header', { name: ro.home.design.recent })).toBeTruthy();
  expect(tileFor(0)).toBeTruthy();
  const photo = screen.getByRole('button', { name: ro.compare.photoCard });
  expect(within(photo).getAllByText(/./)).toHaveLength(1); // the text only: no caption, no icon label
  expect(StyleSheet.flatten(photo.props.style).backgroundColor).toBe(light.primary);
  expect(screen.queryByRole('button', { name: ro.compare.photo })).toBeNull(); // the small text button is replaced
});
test('the big photo button opens the camera for Compare', async () => {
  await render(<Compare />);
  await fireEvent.press(await screen.findByRole('button', { name: ro.compare.photoCard }));
  expect(router.push).toHaveBeenLastCalledWith({ pathname: '/capture', params: { forCompare: '1' } });
});
test('tapping recent products fills slot A, then slot B, and fades the other categories after A', async () => {
  await render(<Compare />);
  await screen.findByRole('header', { name: ro.home.design.recent });
  await fireEvent.press(tileFor(0));
  expect(within(screen.getAllByTestId('compare-slot')[0]!).getByRole('button', { name: previewEntries[0]!.product.name })).toBeTruthy(); // slot A now holds it
  expect(tileFor(0).props.accessibilityState).toMatchObject({ selected: true });
  expect(tileFor(3).props.accessibilityState).toMatchObject({ disabled: true }); // another category
  await fireEvent.press(tileFor(1));
  expect(screen.getByText('4,1 g')).toBeTruthy(); // both chosen, so the comparison opens
});
test('pressing the chosen recent product again takes it out of its slot', async () => {
  await render(<Compare />);
  await screen.findByRole('header', { name: ro.home.design.recent });
  await fireEvent.press(tileFor(0));
  expect(tileFor(0).props.accessibilityState).toMatchObject({ selected: true, disabled: false });
  await fireEvent.press(tileFor(0));
  expect(tileFor(0).props.accessibilityState).toMatchObject({ selected: false });
  expect(within(screen.getAllByTestId('compare-slot')[0]!).getByText(ro.compare.pick)).toBeTruthy(); // slot A is empty again
  expect(tileFor(3).props.accessibilityState).toMatchObject({ disabled: false }); // every category can be picked again
});
test('a product photographed from Compare fills slot A when it is empty', async () => {
  mockAdded = previewEntries[0]!.product.id;
  await render(<Compare />);
  expect(await screen.findByRole('button', { name: previewEntries[0]!.product.name })).toBeTruthy(); // slot A holds it
  expect(router.setParams).toHaveBeenCalledWith({ added: undefined });
});
test('a product photographed from Compare goes to slot B when A already has one', async () => {
  mockId = previewEntries[0]!.product.id; // A comes from the product page
  mockAdded = previewEntries[1]!.product.id;
  await render(<Compare />);
  expect(await screen.findByText('13,2 g')).toBeTruthy(); // both products are in, so the table shows
  expect(screen.getByText('4,1 g')).toBeTruthy();
});
test('a photographed product that is not in history is ignored', async () => {
  mockAdded = '00000000-0000-4000-8000-0000000000ff';
  jest.mocked(router.setParams).mockClear();
  await render(<Compare />);
  await screen.findByRole('header', { name: ro.home.design.recent });
  expect(router.setParams).not.toHaveBeenCalled();
});
test('a filled slot shows only the photo, the score and the verdict', async () => {
  await render(<Compare />);
  await screen.findByRole('header', { name: ro.home.design.recent });
  await fireEvent.press(tileFor(0));
  const slot = screen.getAllByTestId('compare-slot')[0]!;
  const scored = productScoreFor(previewEntries[0]!.product, previewEntries[0]!.score);
  expect(within(slot).getByText(design.productA)).toBeTruthy();
  expect(within(slot).getByTestId('slot-photo-tile')).toBeTruthy();
  expect(within(slot).getByText(String(scored.score))).toBeTruthy();
  expect(within(slot).getByText(ro.tiers[scored.tier!])).toBeTruthy();
  for (const text of [previewEntries[0]!.product.name, previewEntries[0]!.product.brand, previewEntries[0]!.product.quantity, ro.score.disclaimer, ro.result.allergens, ro.result.missingAllergenNote, ro.result.source]) {
    expect(within(slot).queryByText(text, { exact: false })).toBeNull();
  }
  expect(within(slot).queryByText(/[•·]/)).toBeNull();
});
test('an empty slot is a small label over plain "Alege produsul" text, with no box around it', async () => {
  await render(<Compare />);
  const slots = await screen.findAllByTestId('compare-slot');
  expect(slots).toHaveLength(2);
  for (const slot of slots) {
    expect(within(slot).getByText(ro.compare.pick)).toBeTruthy();
    const button = StyleSheet.flatten(within(slot).getAllByRole('button')[0]!.props.style);
    expect(button.backgroundColor).toBeUndefined();
    expect(button.borderRadius).toBeUndefined();
  }
});
test('the comparison page ends with "Închide", which goes back to the empty Comparație page', async () => {
  await render(<Compare />);
  await choose(0); await choose(1);
  expect(screen.queryByRole('button', { name: ro.compare.photo })).toBeNull(); // "Fotografiază alt produs" is gone
  expect(screen.queryByRole('button', { name: design.swap })).toBeNull();
  expect(screen.queryByRole('button', { name: design.category })).toBeNull();
  // Fixed below the scrolling content, so it stays right above the navigation bar however long the table is.
  type Node = { type: string; children?: (Node | string)[] | null };
  const find = (node: Node | string): Node | undefined => typeof node === 'string' ? undefined
    : node.type === 'RCTScrollView' ? node : node.children?.map(find).find(Boolean);
  expect(JSON.stringify(find(screen.toJSON() as Node))).not.toContain(ro.app.close);
  expect(within(screen.getByTestId('compare-close-footer')).getByRole('button', { name: ro.app.close })).toBeTruthy();
  const closeStyle = StyleSheet.flatten(screen.getByRole('button', { name: ro.app.close }).props.style);
  expect(typeof closeStyle === 'object' ? closeStyle.backgroundColor : undefined).toBe(light.primary); // the same dark green as the photo button
  await fireEvent.press(screen.getByRole('button', { name: ro.app.close }));
  expect(await screen.findByRole('header', { name: ro.home.design.recent })).toBeTruthy();
  expect(screen.queryByTestId('compare-card')).toBeNull();
  expect(screen.getAllByTestId('compare-slot')).toHaveLength(2);
  expect(router.setParams).toHaveBeenLastCalledWith({ id: undefined, added: undefined });
});

test('the product cards are tall enough, and a long name wraps inside its card instead of running out of it', async () => {
  await render(<Compare />);
  await choose(0); await choose(1);
  for (const [index, card] of screen.getAllByTestId('compare-card').entries()) {
    expect(StyleSheet.flatten(card.props.style).minHeight).toBeGreaterThanOrEqual(120);
    const name = StyleSheet.flatten(within(card).getByText(previewEntries[index]!.product.name).props.style);
    expect(name).toMatchObject({ flex: 1, minWidth: 0 });
  }
});
test('the recent products sit lower on the main page, with room under the two slots', async () => {
  await render(<Compare />);
  expect(StyleSheet.flatten((await screen.findByTestId('recent-section')).props.style).marginTop).toBeGreaterThanOrEqual(28);
});
