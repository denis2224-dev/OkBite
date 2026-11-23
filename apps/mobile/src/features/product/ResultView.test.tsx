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
import { computeWaterScore, emptyWaterProfile, type Product, type Profile, type ScoreResult } from '@okbite/shared';
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
it('shows the declared allergen as a green line, and no Compoziție card, source card, Porție row or disclaimer', async () => {
  await render(<ResultView product={{ ...foundYogurt.product, status: 'unverified', allergens: ['Lapte'], mayContain: ['Soia'] }} score={foundYogurt.score} />);
  const line = screen.getByTestId('allergen-summary');
  expect(line).toHaveTextContent(ro.result.containsAllergen('lapte'));
  expect(StyleSheet.flatten(line.props.style).backgroundColor).toBe(light.goodBg);
  expect(screen.queryByTestId('composition-card')).toBeNull();
  expect(screen.queryByText(ro.result.composition)).toBeNull();
  expect(screen.queryByTestId('source-card')).toBeNull();
  expect(screen.queryByText(ro.result.source)).toBeNull();
  expect(screen.queryByText(ro.result.unverifiedNote)).toBeNull();
  expect(screen.queryByTestId('result-link-rows')).toBeNull();
  expect(screen.queryByRole('button', { name: ro.result.portionTile })).toBeNull();
  expect(screen.queryByText(ro.result.portion)).toBeNull();
  expect(screen.queryByText(ro.score.disclaimer)).toBeNull();
});
it.each([['with', foundYogurt.product.nutrients], ['without', { ...foundYogurt.product.nutrients, salt: null }]])('shows name and weight, not the brand, %s a score', async (_, nutrients) => {
  await render(<ResultView product={{ ...foundYogurt.product, nutrients }} score={foundYogurt.score} />);
  expect(screen.getByText(foundYogurt.product.quantity)).toBeTruthy();
  expect(screen.queryByText(foundYogurt.product.brand, { exact: false })).toBeNull();
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
it('draws the overview as photo, name, weight and the score with its tier word, and nothing under it', async () => {
  await render(<ResultView {...foundYogurt} />);
  const score = screen.getByTestId('product-score');
  expect(within(score).getByText('86', { includeHiddenElements: true })).toBeTruthy();
  expect(within(score).getByText(ro.tiers.excellent, { includeHiddenElements: true })).toBeTruthy();
  expect(screen.getByTestId('product-thumb-tile', { includeHiddenElements: true })).toBeTruthy();
  expect(screen.queryByText(ro.score.disclaimer)).toBeNull();
  expect(screen.queryByTestId('nutriscore-scale')).toBeNull();
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

it('scores complete water chemistry when food label nutrients are absent', async () => {
  const product = {
    ...foundYogurt.product,
    category: { ...foundYogurt.product.category, scoreKind: 'water' as const },
    nutrients: { ...foundYogurt.product.nutrients, kcal: null, salt: null, sugar: null, sat: null },
    water: {
      ...emptyWaterProfile(),
      tdsMgL: 200, ph: 8.2, carbonation: 'still' as const, classification: 'natural_mineral' as const,
      caMgL: 52, mgMgL: 17, hco3MgL: 220, no3MgL: 0.9, naMgL: 0.7,
    },
  };
  const supplied = { ...foundYogurt.score, score: 100, letter: 'A' as const, grade: 'good' as const };
  await render(<ResultView product={product} score={supplied} />);
  const scored = displayScore(product, supplied);
  expect(scored.score).toBe(100);
  expect(scored.letter).toBeNull();
  expect(screen.getByText(productLine(product, scored).replace(' · ', ', '))).toBeTruthy(); // shown with a comma; the spoken label keeps the dot
});
it('withholds a fat-category score when total fat is missing', async () => {
  const product = { ...foundYogurt.product, category: { ...foundYogurt.product.category, scoreKind: 'fat' as const }, nutrients: { ...foundYogurt.product.nutrients, fat: null } };
  await render(<ResultView product={product} score={foundYogurt.score} />);
  expect(screen.getByText(ro.result.scoreUnavailable)).toBeTruthy();
});


it('shows the ingredient text on the page and opens the original-label route for the displayed product', async () => {
  await render(<ResultView {...foundYogurt} />);
  expect(within(screen.getByTestId('ingredients-text')).getByText(foundYogurt.product.ingredientsText, { exact: false })).toBeTruthy();
  expect(screen.queryByRole('button', { name: ro.result.ingredientsTile })).toBeNull(); // no link row to a separate page
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



it.each(['A', 'B', 'C', 'D', 'E'] as const)('shows the score and tier word for Nutri-Score letter %s, without the A-E bar', async letter => {
  await render(<ResultView product={foundYogurt.product} score={{ ...foundYogurt.score, letter }} />);
  expect(screen.getByLabelText(productLine(foundYogurt.product, { ...foundYogurt.score, letter }))).toBeTruthy();
  expect(screen.queryByLabelText(`Nutri-Score: ${letter}`)).toBeNull();
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
it('orders the profile alert, score, in short, what\'s inside, ingredients and the original label', async () => {
  mockProfile = { ...mockProfile, allergens: ['Lapte'] };
  await render(<ResultView product={foundYogurt.product} score={{ ...foundYogurt.score, letter: 'B' }} />);
  const order = inOrder();
  const markers = [ro.result.profileAlertSub, productLine(foundYogurt.product, foundYogurt.score), 'reason-tone-',
    ro.result.whatsInside, 'ingredients-label', ro.result.original].map(text => order.indexOf(text));
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
  expect(screen.getByTestId('profile-alert-contains')).toHaveStyle({ backgroundColor: light.dangerBg });
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

it('lists the detail pages as short tiles and leaves the one main action to the fixed footer', async () => {
  await render(<ResultView {...foundYogurt} />);
  expect(screen.queryByText(ro.result.ingredientsHint)).toBeNull();
  expect(screen.queryByRole('button', { name: ro.result.compare })).toBeNull();
  expect(screen.queryByText(/alternative/i)).toBeNull();
  for (const name of [ro.result.original]) {
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
    expect(style.minWidth ?? style.width).toBeGreaterThanOrEqual(44);
    expect(style.minHeight ?? style.height).toBeGreaterThanOrEqual(44);
  }
  const order = inOrder();
  expect(order.indexOf(ro.result.report)).toBeLessThan(order.indexOf(productLine(foundYogurt.product, foundYogurt.score)));
  await fireEvent.press(screen.getByRole('button', { name: ro.result.report }));
  expect(screen.getByLabelText(ro.result.reportLabel)).toBeTruthy();
});
it('has no Porție row and no portion table', async () => {
  await render(<ResultView {...foundYogurt} />);
  expect(screen.queryByRole('button', { name: ro.result.portionTile })).toBeNull();
  expect(screen.queryByText(ro.result.portionNote)).toBeNull();
});
it('shows the label text as one block, and leaves ingredient explanations to the Ingrediente page', async () => {
  const ingredient = { group: 'add' as const, source: 'https://example.invalid/source', allergen: null };
  await render(<ResultView product={{ ...foundYogurt.product, ingredients: [
    { ...ingredient, slug: 'test-a', name: 'acid citric (E330)', role: 'Acid citric (E330)', explanation: 'Prima propoziție de test.' },
  ] }} score={foundYogurt.score} />);
  expect(screen.getByText(foundYogurt.product.ingredientsText, { exact: false })).toBeTruthy();
  expect(screen.queryByText(ro.result.explainedWithSource)).toBeNull();
  expect(screen.queryByText('Prima propoziție de test.')).toBeNull();
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
it('puts the product thumbnail before the name, and drops it when the photo fails to load', async () => {
  const imageUrl = 'https://images.openfoodfacts.org/images/products/301/762/042/2003/front_en.879.400.jpg';
  await render(<ResultView product={{ ...foundYogurt.product, imageUrl }} score={foundYogurt.score} />);
  const thumb = screen.getByTestId('product-thumb', { includeHiddenElements: true });
  expect(thumb.props.source).toEqual({ uri: imageUrl });
  expect(inOrder().indexOf('product-thumb')).toBeLessThan(inOrder().indexOf(foundYogurt.product.name));
  await fireEvent(thumb, 'error');
  expect(screen.queryByTestId('product-thumb', { includeHiddenElements: true })).toBeNull();
  expect(screen.queryByTestId('product-photo', { includeHiddenElements: true })).toBeNull();
});

it('scores daily Moldovan water from its mineral profile without food macros or Nutri-Score bar', async () => {
  const emptyNutrients = Object.fromEntries(Object.keys(foundYogurt.product.nutrients).map(k => [k, null])) as Product['nutrients'];
  const omWater: Product = {
    ...foundYogurt.product,
    name: 'OM Apă Plată',
    brand: 'OM',
    quantity: '1500 ml',
    unit: 'ml',
    category: { slug: 'apa', name: 'Apă', scoreKind: 'water' },
    nutrients: emptyNutrients,
    water: { ...emptyWaterProfile(), carbonation: 'still', classification: 'natural_mineral', ph: 6.56, tdsMgL: 375, dryResidueMgL: 260, hco3MgL: 140, so4MgL: 115, naMgL: 55, caMgL: 32.5, mgMgL: 12.5, fMgL: 0.1, no3MgL: 1.5, h3bo3MgL: 0 },
    ingredientsText: '',
    ingredients: [],
    allergens: [],
    mayContain: [],
  };
  await render(<ResultView product={omWater} score={{ score: 100, letter: 'A', grade: 'good', reasons: [], missing: [] }} />);
  const omExpected = computeWaterScore(omWater.water);
  expect(omExpected.score).toBe(96);
  expect(screen.getByTestId('product-score')).toHaveTextContent(`${omExpected.score} din 100, Excelent`);
  expect(screen.getByTestId('water-ph-pill')).toHaveTextContent('pH 6,56');
  expect(screen.getByTestId('water-mineral-count')).toHaveTextContent('9/11');
  expect(screen.getByTestId('water-in-short')).toBeTruthy();
  expect(screen.getByTestId('water-taste-card')).toBeTruthy();
  expect(screen.getByTestId('water-more-card')).toBeTruthy();
  expect(screen.getByText(ro.result.water.tiers.daily)).toBeTruthy();
  expect(screen.getByTestId('water-card')).toBeTruthy();
  expect(within(screen.getByTestId('water-card')).getByText('375 mg/l')).toBeTruthy();
  expect(within(screen.getByTestId('water-card')).getByText('6,56')).toBeTruthy();
  expect(screen.queryByTestId('nutri-score-A')).toBeNull();
  expect(screen.queryByTestId('water-unverified-note')).toBeNull();
  expect(screen.queryByText(ro.result.water.disclaimer)).toBeNull();
  expect(screen.queryByText(ro.result.original)).toBeNull();
  expect(screen.queryByText(ro.result.source)).toBeNull();
  expect(screen.queryByText(ro.result.ingredientsTile)).toBeNull();
  expect(screen.queryByText(ro.processing.title)).toBeNull();
  expect(screen.queryByText(ro.result.transcribedLabel)).toBeNull();
  expect(screen.queryByRole('button', { name: ro.tiers.why })).toBeNull();
});

it('caps therapeutic mineral water scores and flags not-for-daily-use insight', async () => {
  const emptyNutrients = Object.fromEntries(Object.keys(foundYogurt.product.nutrients).map(k => [k, null])) as Product['nutrients'];
  const donatMg: Product = {
    ...foundYogurt.product,
    name: 'Donat Mg',
    brand: 'Donat Mg',
    quantity: '1000 ml',
    unit: 'ml',
    category: { slug: 'apa', name: 'Apă', scoreKind: 'water' },
    nutrients: emptyNutrients,
    water: { ...emptyWaterProfile(), carbonation: 'sparkling', classification: 'therapeutic', tdsMgL: 13200, mgMgL: 1030, naMgL: 1565, caMgL: 380, hco3MgL: 7790, so4MgL: 2200, clMgL: 59, h3bo3MgL: 45, no3MgL: 0 },
    ingredientsText: '',
    ingredients: [],
    allergens: [],
    mayContain: [],
  };
  await render(<ResultView product={donatMg} score={{ score: 100, letter: 'A', grade: 'good', reasons: [], missing: [] }} />);
  const donatExpected = computeWaterScore(donatMg.water);
  expect(donatExpected.score).toBe(20);
  expect(screen.getByTestId('product-score')).toHaveTextContent(`${donatExpected.score} din 100, Slab`);
  expect(screen.getByTestId('water-ph-pill')).toHaveTextContent('pH ≈ 5,5');
  expect(screen.getByText(ro.result.water.tiers.therapeutic)).toBeTruthy();
  expect(screen.getByText(ro.result.water.therapeuticCaution)).toBeTruthy();
  expect(screen.queryByTestId('nutri-score-A')).toBeNull();
});

it('withholds cached 100/A score on legacy waters without water object instead of inventing 100', async () => {
  const emptyNutrients = Object.fromEntries(Object.keys(foundYogurt.product.nutrients).map(k => [k, null])) as Product['nutrients'];
  const { water: _w, ...withoutWater } = foundYogurt.product;
  const legacyWater: Product = {
    ...withoutWater,
    name: 'OM Legacy Plată',
    brand: 'OM',
    quantity: '1500 ml',
    unit: 'ml',
    category: { slug: 'apa', name: 'Apă', scoreKind: 'water' },
    nutrients: emptyNutrients,
    ingredientsText: '',
    ingredients: [],
  };
  await render(<ResultView product={legacyWater} score={{ score: 100, letter: 'A', grade: 'good', reasons: [], missing: [] }} />);
  expect(screen.getByText(ro.result.scoreUnavailable)).toBeTruthy();
  expect(screen.queryByTestId('product-score')).toBeNull();
  expect(screen.queryByText(/100 din 100/)).toBeNull();
  expect(screen.queryByTestId('nutri-score-A')).toBeNull();
  expect(screen.queryByText(ro.result.original)).toBeNull();
  expect(screen.queryByText(ro.result.source)).toBeNull();
});

it('renders ranges, explicit zeroes, and Na+K without provenance clutter on partial water', async () => {
  const emptyNutrients = Object.fromEntries(Object.keys(foundYogurt.product.nutrients).map(k => [k, null])) as Product['nutrients'];
  const omPartial: Product = {
    ...foundYogurt.product,
    status: 'verified',
    name: 'OM Apă Plată',
    brand: 'OM',
    quantity: '1,5 L',
    unit: 'ml',
    category: { slug: 'apa', name: 'Apă', scoreKind: 'water' },
    nutrients: emptyNutrients,
    water: {
      ...emptyWaterProfile(),
      carbonation: 'still',
      classification: 'drinking',
      tdsMgL: 375,
      caMgL: 32.5,
      mgMgL: 12.5,
      naPlusKMgL: 72.5,
      hco3MgL: 140,
      clMgL: 15.5,
      no3MgL: 0,
      ranges: { tdsMgL: { min: 350, max: 400 }, naPlusKMgL: { min: 70, max: 75 } },
      evidence: {
        tdsMgL: { status: 'verified', source: 'apaom.md' },
        no3MgL: { status: 'unverified', source: 'Fotografie utilizator', addedAt: '2026-11-17' },
      },
    },
    ingredientsText: '',
    ingredients: [],
    allergens: [],
    mayContain: [],
  };
  await render(<ResultView product={omPartial} score={{ score: 100, letter: 'A', grade: 'good', reasons: [], missing: [] }} nutritionAdditionAvailable />);
  expect(screen.getByTestId('product-score')).toHaveTextContent(/96 din 100/);
  expect(screen.queryByTestId('product-score-range')).toBeNull();
  expect(screen.queryByTestId('water-unverified-note')).toBeNull();
  expect(screen.queryByText(ro.result.water.missingInputs)).toBeNull();
  expect(within(screen.getByTestId('water-card')).getByText(ro.result.water.ions.naPlusKMgL)).toBeTruthy();
  expect(within(screen.getByTestId('water-card')).getByText('350–400 mg/l')).toBeTruthy();
  expect(within(screen.getByTestId('water-card')).getByText('70–75 mg/l')).toBeTruthy();
  expect(within(screen.getByTestId('water-card')).getByText('0 mg/l')).toBeTruthy();
  expect(within(screen.getByTestId('water-card')).queryByText(/apaom\.md/)).toBeNull();
  expect(within(screen.getByTestId('water-card')).queryByText(/Fotografie utilizator/)).toBeNull();
  expect(screen.getByTestId('water-tier-insight')).toHaveTextContent(ro.result.water.tiers.daily);
});

it('shows estimated sparkling pH, 4/11 mineral counter, expandable unstated rows, and thresholds info on DaviDan', async () => {
  const emptyNutrients = Object.fromEntries(Object.keys(foundYogurt.product.nutrients).map(k => [k, null])) as Product['nutrients'];
  const davidan: Product = {
    ...foundYogurt.product,
    status: 'unverified',
    name: 'Apă potabilă Carbogazificată',
    brand: 'DAVIDAN',
    quantity: '0,5L',
    unit: 'ml',
    category: { slug: 'apa', name: 'Apă', scoreKind: 'water' },
    nutrients: emptyNutrients,
    water: {
      ...emptyWaterProfile(),
      dryResidueMgL: 390,
      carbonation: 'sparkling',
      classification: 'drinking',
      caMgL: 14,
      mgMgL: 42.6,
      no3MgL: 6.4,
    },
    ingredientsText: '',
    ingredients: [],
    allergens: [],
    mayContain: [],
  };
  await render(<ResultView product={davidan} score={{ score: 96, letter: 'A', grade: 'good', reasons: [], missing: [] }} />);
  expect(screen.getByTestId('water-ph-pill')).toHaveTextContent('pH ≈ 5,5');
  expect(screen.getByTestId('water-mineral-count')).toHaveTextContent('4/11');
  expect(screen.queryByText(ro.result.original)).toBeNull();
  expect(screen.queryByText(ro.result.source)).toBeNull();
  expect(screen.queryByText(ro.result.ingredientsTile)).toBeNull();
  expect(screen.queryByText(ro.result.unverifiedNote)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: ro.result.water.otherValues(6) }));
  expect(within(screen.getByTestId('water-card')).getByText(ro.result.water.ions.kMgL)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: ro.result.water.whyThresholds }));
  expect(screen.getByText(ro.result.water.whyThresholdsBody)).toBeTruthy();
});
