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
import type { Profile } from '@okbite/shared';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true } }));
let mockProfile: Profile = { goals: [], allergens: [], avoid: [], onboarded: true };
jest.mock('../profile/useProfile', () => ({ useProfile: () => ({ profile: mockProfile, hydrated: true, error: null }) }));
beforeEach(() => { mockProfile = { goals: [], allergens: [], avoid: [], onboarded: true }; });
// Text and accessibility labels in render order.
const inOrder = () => JSON.stringify(screen.toJSON());

jest.mock('../../lib/api', () => ({ ...jest.requireActual('../../lib/api'), api: { report: jest.fn() } }));
it('shows allergens, unverified provenance and the disclaimer', async () => {
  await render(<ResultView product={{ ...foundYogurt.product, status: 'unverified', allergens: ['Lapte'], mayContain: ['Soia'] }} score={foundYogurt.score} />);
  expect(screen.getByText('Lapte')).toBeTruthy();
  expect(screen.getByText('Soia')).toBeTruthy();
  expect(screen.getByText(ro.result.unverifiedNote)).toBeTruthy();
  expect(screen.getByText(ro.score.disclaimer)).toBeTruthy();
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
  await render(<ResultView product={product} score={{ ...foundYogurt.score, score: 100, letter: 'A', grade: 'good' }} />);
  expect(screen.getByLabelText(ro.score.ringLabel(100, 'good'))).toBeTruthy();
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

it('displays matched ingredient roles and risk explanations inline on the product result screen', async () => {
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
  expect(screen.getByText('aspartam')).toBeTruthy();
  expect(screen.getByText('Îndulcitor intens fără calorii (E951)')).toBeTruthy();
  expect(screen.getByText(/sursă de fenilalanină/)).toBeTruthy();
  expect(screen.getByText('Colorant sintetic (E150d)')).toBeTruthy();
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
  expect(screen.getByLabelText(ro.score.ringLabel(53, 'medium'))).toBeTruthy();
  expect(screen.getByText('Conține îndulcitori')).toBeTruthy();
  expect(screen.getByText('aspartam')).toBeTruthy();
  expect(screen.getByText('Îndulcitor intens fără calorii (E951)')).toBeTruthy();
  expect(screen.getByText('Acidifiant (E338)')).toBeTruthy();
});



it.each(['A', 'B', 'C', 'D', 'E'] as const)('shows the supplied Nutri-Score letter %s in the tile, on the bar and with the disclaimer under it', async letter => {
  await render(<ResultView product={foundYogurt.product} score={{ ...foundYogurt.score, letter }} />);
  expect(screen.getByText(letter)).toBeTruthy();
  expect(screen.getByText(`${foundYogurt.score.score} ${ro.score.outOf}`)).toBeTruthy();
  expect(screen.getByLabelText(ro.score.ringLabel(foundYogurt.score.score!, foundYogurt.score.grade))).toBeTruthy();
  expect(screen.getByLabelText(`Nutri-Score: ${letter}`)).toBeTruthy();
  const order = inOrder();
  expect(order.indexOf(`Nutri-Score: ${letter}`)).toBeLessThan(order.indexOf(ro.score.disclaimer));
  expect(order.indexOf(ro.score.disclaimer)).toBeLessThan(order.indexOf(ro.result.whyLetter(letter)));
});
it('does not present a stale letter when the nutrition score is unavailable', async () => {
  await render(<ResultView product={{ ...foundYogurt.product, nutrients: { ...foundYogurt.product.nutrients, salt: null } }} score={foundYogurt.score} />);
  expect(screen.queryByLabelText(/Nutri-Score:/)).toBeNull();
  expect(screen.getByText(ro.result.scoreUnavailable)).toBeTruthy();
});
it('leaves an absent Nutri-Score letter unavailable without inventing one', async () => {
  await render(<ResultView product={foundYogurt.product} score={{ ...foundYogurt.score, letter: null }} />);
  expect(screen.queryByLabelText(/Nutri-Score:/)).toBeNull();
  expect(screen.getByLabelText(ro.score.ringLabel(foundYogurt.score.score!, foundYogurt.score.grade))).toBeTruthy();
});
it('orders the profile alert, score, reasons, allergens, portions and the transcribed label', async () => {
  mockProfile = { ...mockProfile, allergens: ['Lapte'] };
  await render(<ResultView product={foundYogurt.product} score={{ ...foundYogurt.score, letter: 'B' }} />);
  const order = inOrder();
  const markers = [ro.result.profileAlertSub, ro.score.ringLabel(foundYogurt.score.score!, foundYogurt.score.grade), ro.result.whyLetter('B'),
    ro.result.allergens, ro.result.portionNote, ro.result.transcribedLabel, ro.result.source].map(text => order.indexOf(text));
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

it('explains the letter with at most three supplied reasons, problems first, and sugar in teaspoons', async () => {
  const score = { ...foundYogurt.score, letter: 'D' as const, reasons: [
    { tone: 'good' as const, title: 'Bogat în fibre', detail: '6 g la 100 g' },
    { tone: 'bad' as const, title: 'Mult zahăr', detail: '24 g la 100 g' },
  ] };
  await render(<ResultView product={{ ...foundYogurt.product, nutrients: { ...foundYogurt.product.nutrients, sugar: 8 } }} score={score} />);
  expect(screen.getByText(ro.result.whyLetter('D'))).toBeTruthy();
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
it('puts collapse, share and report in a top row of 44 pt icon buttons', async () => {
  await render(<ResultView {...foundYogurt} />);
  for (const name of [ro.result.closeSheet, ro.share.button, ro.result.report]) {
    const style = StyleSheet.flatten(screen.getByRole('button', { name }).props.style);
    expect(style.minWidth).toBeGreaterThanOrEqual(44);
    expect(style.minHeight).toBeGreaterThanOrEqual(44);
  }
  const order = inOrder();
  expect(order.indexOf(ro.result.report)).toBeLessThan(order.indexOf(ro.score.ringLabel(foundYogurt.score.score!, foundYogurt.score.grade)));
  await fireEvent.press(screen.getByRole('button', { name: ro.result.closeSheet }));
  expect(router.back).toHaveBeenCalled();
  await fireEvent.press(screen.getByRole('button', { name: ro.result.report }));
  expect(screen.getByLabelText(ro.result.reportLabel)).toBeTruthy();
});
it('shows Ingrediente and Porție as two tiles side by side, and Porție opens the portion table', async () => {
  await render(<ResultView {...foundYogurt} />);
  const tiles = screen.getByTestId('result-link-tiles');
  expect(tiles).toHaveStyle({ flexDirection: 'row' });
  // Mockup: just the word and a chevron, so long English labels never break mid-word.
  expect(within(tiles).getAllByRole('button').map(button => button.props.accessibilityLabel)).toEqual([ro.result.ingredientsTile, ro.result.portionTile]);
  expect(within(tiles).queryAllByTestId('link-row-icon')).toHaveLength(0);
  expect(screen.getAllByText(ro.result.portionNote)).toHaveLength(1);
  await fireEvent.press(screen.getByRole('button', { name: ro.result.portionTile }));
  expect(screen.getAllByText(ro.result.portionNote)).toHaveLength(2);
  await fireEvent.press(screen.getByRole('button', { name: ro.nav.close }));
  expect(screen.getAllByText(ro.result.portionNote)).toHaveLength(1);
});

it('labels each score reason with its tone next to an icon', async () => {
  await render(<ResultView {...foundYogurt} />);
  const tones = { good: ro.score.positive, bad: ro.score.negative, neutral: ro.score.neutral } as const;
  for (const reason of foundYogurt.score.reasons) expect(screen.getAllByTestId(`reason-tone-${reason.tone}`).length).toBeGreaterThan(0);
  expect(screen.getAllByText(tones[foundYogurt.score.reasons[0]!.tone]).length).toBeGreaterThan(0);
});
