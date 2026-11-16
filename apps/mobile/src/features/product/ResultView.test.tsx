import { render, screen, fireEvent, waitFor, within } from '@testing-library/react-native';
import { ResultView } from './ResultView';
import { CompareAction } from './CompareAction';
import { ReportSheet } from './ReportSheet';
import { foundYogurt } from '../../test/fixtures';
import { ro } from '../../copy/ro';
import { api, ApiError } from '../../lib/api';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { light } from '../../theme/tokens';
import type { Product, Profile, ScoreResult } from '@okbite/shared';
import { displayScore } from './displayScore';
import { productScoreFor } from './productScoreFor';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true } }));
let mockProfile: Profile = { goals: [], allergens: [], avoid: [], onboarded: true };
jest.mock('../profile/useProfile', () => ({ useProfile: () => ({ profile: mockProfile, hydrated: true, error: null }) }));
beforeEach(() => { mockProfile = { goals: [], allergens: [], avoid: [], onboarded: true }; });
// Text and accessibility labels in render order.
const inOrder = () => JSON.stringify(screen.toJSON());
// The 0-100 product score line (and the tile's label) the result shows for this product.
const productLine = (product: Product, score: ScoreResult) => {
  const s = productScoreFor(product, score);
  return `${ro.history.score(s.score!)} · ${ro.tiers[s.tier!]}`;
};

jest.mock('../../lib/api', () => ({ ...jest.requireActual('../../lib/api'), api: { report: jest.fn() } }));
it('shows allergens, unverified provenance and the disclaimer', async () => {
  await render(<ResultView product={{ ...foundYogurt.product, status: 'unverified', allergens: ['Lapte'], mayContain: ['Soia'] }} score={foundYogurt.score} />);
  expect(screen.getByText('Lapte')).toBeTruthy();
  expect(screen.getByText('Soia')).toBeTruthy();
  const badge = screen.getByTestId('unverified-badge');
  expect(within(badge).getByText(ro.result.unverified)).toBeTruthy();
  expect(within(badge).getByText(ro.result.unverifiedNote)).toBeTruthy();
  expect(screen.getByText(ro.score.disclaimer)).toBeTruthy();
});
it.each([
  ['declared allergens', { allergens: ['Lapte' as const], mayContain: [] }],
  ['no declared allergens', { allergens: [], mayContain: [] }],
  ['traces only', { allergens: [], mayContain: ['Soia' as const] }],
])('keeps exactly one allergen safety line with %s', async (_, allergens) => {
  await render(<ResultView product={{ ...foundYogurt.product, ...allergens }} score={foundYogurt.score} />);
  expect(screen.getAllByText(ro.result.missingAllergenNote)).toHaveLength(1);
  expect(Object.keys(ro.result)).not.toContain('allergyNote');
});
it.each([['with', foundYogurt.product.nutrients], ['without', { ...foundYogurt.product.nutrients, salt: null }]])('shows brand and quantity %s a score without a middle-dot meta string', async (_, nutrients) => {
  await render(<ResultView product={{ ...foundYogurt.product, nutrients }} score={foundYogurt.score} />);
  expect(screen.getByText(`${foundYogurt.product.brand}, ${foundYogurt.product.quantity}`)).toBeTruthy();
  expect(screen.queryByText(`${foundYogurt.product.brand} · ${foundYogurt.product.quantity}`)).toBeNull();
});
it('shows the yogurt fixture as 86 din 100, Excelent, and reads that score once, from the tag', async () => {
  await render(<ResultView {...foundYogurt} />);
  expect(screen.getAllByLabelText('86 din 100 · Excelent')).toHaveLength(1);
  expect(screen.getByTestId('product-score')).toHaveProp('accessibilityLabel', '86 din 100 · Excelent');
  expect(screen.queryByText(`${ro.score.title}:`, { exact: false })).toBeNull();
  expect(screen.queryByText(`${ro.tiers.nutriScore} B`)).toBeNull(); // no chip
});
it('shows the product photo once, as a thumbnail before the name', async () => {
  const product = { ...foundYogurt.product, imageUrl: 'https://example.test/y.jpg' };
  await render(<ResultView product={product} score={foundYogurt.score} />);
  expect(screen.getAllByTestId('product-thumb', { includeHiddenElements: true })).toHaveLength(1);
  expect(inOrder().match(/"type":"Image"/g)).toHaveLength(1); // the mid-page photo is gone
  expect(inOrder().indexOf('product-thumb')).toBeLessThan(inOrder().indexOf(product.name));
});
it('leaves no empty photo box when the product has no photo', async () => {
  await render(<ResultView product={{ ...foundYogurt.product, imageUrl: null }} score={foundYogurt.score} />);
  expect(screen.queryByTestId('product-thumb', { includeHiddenElements: true })).toBeNull();
  expect(screen.getByText(foundYogurt.product.name)).toBeTruthy();
});
it('lets the score row wrap at large text sizes', async () => {
  await render(<ResultView {...foundYogurt} />);
  expect(StyleSheet.flatten(screen.getByTestId('score-row').props.style)).toMatchObject({ flexWrap: 'wrap' });
});
it('shows the score disclaimer exactly once', async () => {
  await render(<ResultView {...foundYogurt} />);
  expect(screen.getAllByText(ro.score.disclaimer)).toHaveLength(1);
});
it('never shows a zero score when required label values are missing', async () => {
  await render(<ResultView product={{ ...foundYogurt.product, nutrients: { ...foundYogurt.product.nutrients, salt: null } }} score={{ ...foundYogurt.score, score: 0, grade: 'low' }} />);
  expect(screen.getByText(ro.result.scoreUnavailable)).toBeTruthy();
  expect(screen.queryByLabelText(/0 din 100/)).toBeNull();
});
it('retains a failed report for retry and closes only after success', async () => {
  jest.mocked(api.report).mockRejectedValueOnce(new ApiError('offline')).mockResolvedValueOnce();
  const close = jest.fn();
  await render(<ReportSheet productId={foundYogurt.product.id} onClose={close} />);
  await fireEvent.press(screen.getByRole('button', { name: ro.result.reportSend }));
  expect(screen.getByText(ro.result.reportShort)).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText(ro.result.reportLabel), 'Etichetă diferită');
  await fireEvent.press(screen.getByRole('button', { name: ro.result.reportSend }));
  await waitFor(() => expect(screen.getByText(ro.errors.offline)).toBeTruthy());
  expect(screen.getByLabelText(ro.result.reportLabel).props.value).toBe('Etichetă diferită');
  expect(close).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: ro.result.reportSend }));
  await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  expect(api.report).toHaveBeenLastCalledWith({ productId: foundYogurt.product.id, message: 'Etichetă diferită' });
});

it('preserves a supplied water score when label nutrients are absent', async () => {
  const product = { ...foundYogurt.product, category: { ...foundYogurt.product.category, scoreKind: 'water' as const }, nutrients: { ...foundYogurt.product.nutrients, kcal: null, salt: null, sugar: null, sat: null } };
  const water = { ...foundYogurt.score, score: 100, letter: 'A' as const, grade: 'good' as const };
  await render(<ResultView product={product} score={water} />);
  expect(displayScore(product, water).score).toBe(100);
  expect(screen.getByLabelText(productLine(product, water))).toBeTruthy();
});
it('withholds a fat-category score when total fat is missing', async () => {
  const product = { ...foundYogurt.product, category: { ...foundYogurt.product.category, scoreKind: 'fat' as const }, nutrients: { ...foundYogurt.product.nutrients, fat: null } };
  await render(<ResultView product={product} score={foundYogurt.score} />);
  expect(screen.getByText(ro.result.scoreUnavailable)).toBeTruthy();
});


it('opens the real ingredient and original-label routes for the displayed product', async () => {
  await render(<ResultView {...foundYogurt} />);
  await fireEvent.press(screen.getByRole('button', { name: ro.result.ingredientsTile }));
  expect(router.push).toHaveBeenLastCalledWith({ pathname: '/product/[id]/ingredients', params: { id: foundYogurt.product.id } });
  await fireEvent.press(screen.getByRole('button', { name: ro.result.original }));
  expect(router.push).toHaveBeenLastCalledWith({ pathname: '/product/[id]/label', params: { id: foundYogurt.product.id } });
});

it('keeps additives in the list and their roles and explanations one tap away in the additive sheet', async () => {
  const colaProduct = {
    ...foundYogurt.product,
    name: 'Coca-Cola Zero',
    brand: 'Coca-Cola',
    unit: 'ml' as const,
    category: { slug: 'bauturi-racoritoare', name: 'Băuturi răcoritoare', scoreKind: 'beverage' as const },
    ingredientsText: 'Apă, dioxid de carbon, colorant E150d, îndulcitori (ciclamați, acesulfam K, aspartam).',
    ingredients: [
      {
        slug: 'aspartam-e951',
        name: 'aspartam',
        group: 'add' as const,
        role: 'Îndulcitor intens fără calorii (E951)',
        explanation: 'Îndulcitor artificial; conține o sursă de fenilalanină și adaugă 4 puncte nefavorabile în băuturi.',
        source: 'https://www.efsa.europa.eu/en/efsajournal/pub/3496',
        allergen: null,
      },
      {
        slug: 'colorant-caramel-e150d',
        name: 'colorant: caramel cu sulfit de amoniu (E150d)',
        group: 'add' as const,
        role: 'Colorant sintetic (E150d)',
        explanation: 'Colorant maro închis folosit în băuturile tip cola.',
        source: 'https://www.efsa.europa.eu/en/efsajournal/pub/2004',
        allergen: null,
      },
    ],
  };
  await render(<ResultView product={colaProduct} score={{ ...foundYogurt.score, score: 53, letter: 'C', grade: 'medium' }} />);
  // In the additives list only; ingredient explanations live on the Ingrediente page.
  expect(screen.getAllByText('aspartam')).toHaveLength(1);
  expect(screen.queryByText(/sursă de fenilalanină/)).toBeNull(); // not inline any more
  await fireEvent.press(screen.getByRole('button', { name: /^aspartam, / }));
  expect(screen.getByText(/sursă de fenilalanină/)).toBeTruthy();
  expect(screen.getByText(/Îndulcitor intens fără calorii/)).toBeTruthy();
});

it('re-scores Open Food Facts Coca-Cola Zero as a beverage (53/100) and analyzes its ingredients when DB links are empty', async () => {
  const offCola = {
    ...foundYogurt.product,
    name: 'Coca-Cola Zero Zahăr',
    brand: 'Coca-Cola',
    quantity: '500 ml',
    unit: 'ml' as const,
    source: 'Open Food Facts',
    category: { slug: 'necunoscut', name: 'Necunoscut', scoreKind: 'general' as const },
    nutrients: { kcal: 0.2, fat: 0, sat: 0, sugar: 0, salt: 0.02, protein: 0, fiber: null, fruitVegPct: null },
    ingredientsText:
      'Apă, dioxid de carbon, colorant: caramel cu sulfit de amoniu (E150d), acidifiant: acid fosforic (E338), îndulcitori (ciclamați, acesulfam K și aspartam), corector de aciditate: citrați de sodiu, arome naturale, aromă cafeină.',
    ingredients: [],
  };
  const wrongGeneralScore = {
    score: 80,
    letter: 'A' as const,
    grade: 'good' as const,
    reasons: [{ tone: 'good' as const, title: 'Puține calorii', detail: '0,2 kcal la 100 g' }],
    missing: [],
  };
  await render(<ResultView product={offCola} score={wrongGeneralScore} />);
  expect(displayScore(offCola, wrongGeneralScore).score).toBe(53);
  expect(screen.getByLabelText(productLine(offCola, wrongGeneralScore))).toBeTruthy();
  expect(screen.getByText('Conține îndulcitori')).toBeTruthy();
  expect(screen.getAllByText('aspartam')).toHaveLength(1); // additives list; explanations are on the Ingrediente page
  expect(screen.getAllByText('acidifiant: acid fosforic (E338)')).toHaveLength(1); // additives list
  expect(screen.queryByText('Îndulcitor intens fără calorii (E951)')).toBeNull(); // role lines left the result screen
});



it.each(['A', 'B', 'C', 'D', 'E'] as const)('shows the supplied Nutri-Score letter %s in the tile, on the bar and with the disclaimer under it', async letter => {
  await render(<ResultView product={foundYogurt.product} score={{ ...foundYogurt.score, letter }} />);
  expect(screen.getByText(letter, { includeHiddenElements: true })).toBeTruthy(); // drawn in the tile; the A-E bar announces it
  expect(screen.getByLabelText(productLine(foundYogurt.product, { ...foundYogurt.score, letter }))).toBeTruthy();
  expect(screen.getByLabelText(`Nutri-Score: ${letter}`)).toBeTruthy();
  const order = inOrder();
  expect(order.indexOf(`Nutri-Score: ${letter}`)).toBeLessThan(order.indexOf(ro.score.disclaimer));
  expect(order.indexOf(ro.score.disclaimer)).toBeLessThan(order.indexOf('reason-tone-'));
});
it('does not present a stale letter when the nutrition score is unavailable', async () => {
  await render(<ResultView product={{ ...foundYogurt.product, nutrients: { ...foundYogurt.product.nutrients, salt: null } }} score={foundYogurt.score} />);
  expect(screen.queryByLabelText(/Nutri-Score:/)).toBeNull();
  expect(screen.getByText(ro.result.scoreUnavailable)).toBeTruthy();
});
it('leaves an absent Nutri-Score letter unavailable without inventing one', async () => {
  await render(<ResultView product={foundYogurt.product} score={{ ...foundYogurt.score, letter: null }} />);
  expect(screen.queryByLabelText(/Nutri-Score:/)).toBeNull();
  expect(screen.getByLabelText(productLine(foundYogurt.product, { ...foundYogurt.score, letter: null }))).toBeTruthy();
});
it('orders the profile alert, score, reasons, the detail buttons, the composition card, source and the original label', async () => {
  mockProfile = { ...mockProfile, allergens: ['Lapte'] };
  await render(<ResultView product={foundYogurt.product} score={{ ...foundYogurt.score, letter: 'B' }} />);
  const order = inOrder();
  const markers = [ro.result.profileAlertSub, productLine(foundYogurt.product, foundYogurt.score), 'reason-tone-',
    ro.result.ingredientsTile, ro.result.composition, ro.result.source, ro.result.original].map(text => order.indexOf(text));
  expect(markers.every(index => index >= 0)).toBe(true);
  expect([...markers].sort((a, b) => a - b)).toEqual(markers);
});

it('shows no profile alert when the profile is empty', async () => {
  await render(<ResultView product={{ ...foundYogurt.product, allergens: ['Lapte'], mayContain: ['Soia'] }} score={foundYogurt.score} />);
  expect(screen.queryByRole('alert')).toBeNull();
  expect(screen.queryByText(ro.result.profileAlertSub)).toBeNull();
});
it('raises a red alert for a declared allergen on the profile', async () => {
  mockProfile = { ...mockProfile, allergens: ['Lapte', 'Gluten'] };
  await render(<ResultView {...foundYogurt} />);
  expect(screen.getByRole('alert')).toBeTruthy();
  expect(screen.getByText(ro.result.containsAllergen(ro.allergens.Lapte.toLocaleLowerCase()))).toBeTruthy();
  expect(screen.getByText(ro.result.profileAlertSub)).toBeTruthy();
  expect(screen.getByTestId('profile-alert-contains')).toHaveStyle({ backgroundColor: light.lowBg });
  expect(screen.queryByText(/Gluten/i)).toBeNull();
});
it('raises an amber outlined alert for a may-contain allergen on the profile', async () => {
  mockProfile = { ...mockProfile, allergens: ['Soia'] };
  await render(<ResultView product={{ ...foundYogurt.product, mayContain: ['Soia'] }} score={foundYogurt.score} />);
  expect(screen.getByText(ro.result.mayContainAllergen(ro.allergens.Soia.toLocaleLowerCase()))).toBeTruthy();
  expect(screen.getByTestId('profile-alert-trace')).toHaveStyle({ backgroundColor: light.warningBg, borderColor: light.warningBorder });
  expect(screen.queryByTestId('profile-alert-contains')).toBeNull();
});

it('lists at most three supplied reasons, problems first, sugar in teaspoons, with no heading above them', async () => {
  const score = { ...foundYogurt.score, letter: 'D' as const, reasons: [
    { tone: 'good' as const, title: 'Bogat în fibre', detail: '6 g la 100 g' },
    { tone: 'bad' as const, title: 'Mult zahăr', detail: '24 g la 100 g' },
  ] };
  await render(<ResultView product={{ ...foundYogurt.product, nutrients: { ...foundYogurt.product.nutrients, sugar: 8 } }} score={score} />);
  expect(screen.queryByText(ro.result.whyLetter('D'))).toBeNull(); // no "De ce" heading above the reasons
  expect(screen.queryByText(ro.tiers.why)).toBeNull();
  const order = inOrder();
  expect(order.indexOf('Mult zahăr')).toBeLessThan(order.indexOf('Bogat în fibre'));
  expect(screen.getByText(`≈ ${ro.result.teaspoons.many('2')}`)).toBeTruthy();
  expect(screen.getByTestId('reason-tone-bad')).toBeTruthy();
});

it('separates declared allergens from possible traces', async () => {
  await render(<ResultView product={{ ...foundYogurt.product, allergens: ['Lapte'], mayContain: ['Soia'] }} score={foundYogurt.score} />);
  expect(screen.getByLabelText('Lapte')).toBeTruthy();
  expect(screen.getByLabelText(`${ro.result.mayContain} Soia`)).toBeTruthy();
});

it('lists the detail pages as short tiles and leaves the one main action to the fixed footer', async () => {
  await render(<ResultView {...foundYogurt} />);
  expect(screen.queryByText(ro.result.ingredientsHint)).toBeNull();
  expect(screen.queryByRole('button', { name: ro.result.compare })).toBeNull();
  expect(screen.queryByText(/alternative/i)).toBeNull();
  for (const name of [ro.result.ingredientsTile, ro.result.portionTile, ro.result.original]) {
    expect(StyleSheet.flatten(screen.getByRole('button', { name }).props.style).backgroundColor).not.toBe(light.soft);
  }
});
it('makes "Compară cu alt produs" the primary action for this product', async () => {
  await render(<CompareAction productId={foundYogurt.product.id} />);
  const compare = screen.getByRole('button', { name: ro.result.compare });
  expect(StyleSheet.flatten(compare.props.style).backgroundColor).toBe(light.primary);
  await fireEvent.press(compare);
  expect(router.push).toHaveBeenLastCalledWith({ pathname: '/compare', params: { id: foundYogurt.product.id } });
});
it('puts share and report in a top row of 44 pt icon buttons, with no back arrow', async () => {
  await render(<ResultView {...foundYogurt} />);
  expect(screen.queryByRole('button', { name: ro.result.closeSheet })).toBeNull();
  for (const name of [ro.share.button, ro.result.report]) {
    const style = StyleSheet.flatten(screen.getByRole('button', { name }).props.style);
    expect(style.minWidth).toBeGreaterThanOrEqual(44);
    expect(style.minHeight).toBeGreaterThanOrEqual(44);
  }
  const order = inOrder();
  expect(order.indexOf(ro.result.report)).toBeLessThan(order.indexOf(productLine(foundYogurt.product, foundYogurt.score)));
  await fireEvent.press(screen.getByRole('button', { name: ro.result.report }));
  expect(screen.getByLabelText(ro.result.reportLabel)).toBeTruthy();
});
it('shows Ingrediente and Porție as full-width chevron rows in one card, and only Porție shows the portion table', async () => {
  await render(<ResultView {...foundYogurt} />);
  const rows = screen.getByTestId('result-link-rows');
  expect(rows).not.toHaveStyle({ flexDirection: 'row' });
  const buttons = within(rows).getAllByRole('button');
  expect(buttons.map(button => button.props.accessibilityLabel)).toEqual([ro.result.ingredientsTile, ro.result.portionTile]);
  for (const button of buttons) expect(StyleSheet.flatten(button.props.style).minHeight).toBeGreaterThanOrEqual(44);
  expect(within(rows).queryAllByTestId('link-row-icon')).toHaveLength(0);
  expect(screen.queryByText(ro.result.portionNote)).toBeNull(); // the table lives only in the sheet
  await fireEvent.press(screen.getByRole('button', { name: ro.result.portionTile }));
  expect(screen.getAllByText(ro.result.portionNote)).toHaveLength(1);
  await fireEvent.press(screen.getByRole('button', { name: ro.nav.close }));
  expect(screen.queryByText(ro.result.portionNote)).toBeNull();
});
it('leaves the label text and ingredient explanations to the Ingrediente page', async () => {
  const ingredient = { group: 'add' as const, source: 'https://example.invalid/source', allergen: null };
  await render(<ResultView product={{ ...foundYogurt.product, ingredients: [
    { ...ingredient, slug: 'test-a', name: 'acid citric (E330)', role: 'Acid citric (E330)', explanation: 'Prima propoziție de test.' },
  ] }} score={foundYogurt.score} />);
  expect(screen.queryByText(ro.result.transcribedLabel)).toBeNull();
  expect(screen.queryByText(foundYogurt.product.ingredientsText)).toBeNull();
  expect(screen.queryByText(ro.result.explainedWithSource)).toBeNull();
  expect(screen.queryByText('Prima propoziție de test.')).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: ro.result.ingredientsTile }));
  expect(router.push).toHaveBeenLastCalledWith({ pathname: '/product/[id]/ingredients', params: { id: foundYogurt.product.id } });
});

it('marks each reason with a tone icon and keeps the tone word out of sight but in the spoken label', async () => {
  await render(<ResultView {...foundYogurt} />);
  for (const reason of foundYogurt.score.reasons) expect(screen.getAllByTestId(`reason-tone-${reason.tone}`).length).toBeGreaterThan(0);
  for (const word of [ro.score.positive, ro.score.negative, ro.score.neutral]) expect(screen.queryByText(word)).toBeNull();
  const first = foundYogurt.score.reasons[0]!;
  const tone = { good: ro.score.positive, bad: ro.score.negative, neutral: ro.score.neutral }[first.tone];
  expect(screen.getByLabelText(new RegExp(`^${tone}: ${first.title}`))).toBeTruthy();
});
it('drops the separate "De ce?" points breakdown', async () => {
  await render(<ResultView {...foundYogurt} />);
  expect(screen.queryByRole('button', { name: ro.tiers.why })).toBeNull();
  expect(screen.queryByTestId('deduction-row')).toBeNull();
});
it('puts declared allergens and the processing level together in one "Compoziție" card', async () => {
  await render(<ResultView product={{ ...foundYogurt.product, allergens: ['Lapte'], mayContain: ['Soia'], processing: { level: 1, source: 'off' } }} score={foundYogurt.score} />);
  const card = screen.getByTestId('composition-card');
  expect(within(card).getByRole('header', { name: ro.result.composition })).toBeTruthy();
  expect(within(card).getByText(ro.result.allergens)).toBeTruthy();
  expect(within(card).getByLabelText('Lapte')).toBeTruthy();
  expect(within(card).getByLabelText(`${ro.result.mayContain} Soia`)).toBeTruthy();
  expect(within(card).getByText(ro.result.missingAllergenNote)).toBeTruthy();
  expect(within(card).getByText(ro.processing.title)).toBeTruthy();
  expect(within(card).getByText(`1 · ${ro.processing[1]}`)).toBeTruthy();
  expect(screen.getAllByText(ro.processing.title)).toHaveLength(1);
  expect(screen.getAllByText(ro.result.allergens)).toHaveLength(1);
});
it.each([
  ['Open Food Facts import', 'Open Food Facts (ODbL)', () => ro.result.offNote, () => ro.result.unverifiedNote],
  ['shopper photos', 'Fotografiile utilizatorului', () => ro.result.unverifiedNote, () => ro.result.offNote],
])('explains the unverified badge for %s', async (_, source, shown, hidden) => {
  await render(<ResultView product={{ ...foundYogurt.product, source, status: 'unverified' }} score={foundYogurt.score} />);
  const badge = screen.getByTestId('unverified-badge');
  expect(within(badge).getByText(shown())).toBeTruthy();
  expect(screen.queryByText(hidden())).toBeNull();
});
