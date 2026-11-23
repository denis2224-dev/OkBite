import { render, screen } from '@testing-library/react-native';
import type { Allergen, Product, Profile } from '@okbite/shared';
import { AllergenSummary } from './AllergenSummary';
import { ResultView } from './ResultView';
import { foundYogurt } from '../../test/fixtures';
import { ro } from '../../copy/ro';

let mockProfile: Profile;
jest.mock('../profile/useProfile', () => ({ useProfile: () => ({ profile: mockProfile, hydrated: true, error: null }) }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true } }));
const profile = (allergens: Allergen[]): Profile => ({ goals: [], allergens, avoid: [], onboarded: true });
const yogurt = (extra: Partial<Product>): Product => ({ ...foundYogurt.product, ...extra });
const inOrder = () => JSON.stringify(screen.toJSON());

it.each([
  ['match', ['Lapte'], yogurt({ allergens: ['Lapte'] }), null],
  ['verified clear', ['Arahide'], yogurt({ status: 'verified', allergens: ['Lapte'] }), ro.result.noProfileAllergens],
  ['unverified', ['Arahide'], yogurt({ status: 'unverified' }), null],
  ['no profile', [], yogurt({ allergens: ['Lapte', 'Soia'] }), ro.result.containsAllergen('lapte, soia')],
  ['nothing declared', [], yogurt({ allergens: [] }), null],
] as const)('case %s', async (_, allergens, product, expected) => {
  mockProfile = profile([...allergens]);
  await render(<AllergenSummary product={product} />);
  if (expected === null) expect(screen.queryByTestId('allergen-summary')).toBeNull();
  else expect(screen.getByTestId('allergen-summary')).toHaveTextContent(expected);
});

it('never claims the label is clear when only a trace of a listed allergen is declared', async () => {
  mockProfile = profile(['Soia']);
  await render(<AllergenSummary product={yogurt({ status: 'verified', allergens: [], mayContain: ['Soia'] })} />);
  expect(screen.queryByTestId('allergen-summary')).toBeNull();
});

it('still shows the summary under the name when the score is unavailable', async () => {
  mockProfile = profile(['Arahide']);
  const product = yogurt({ status: 'verified' });
  await render(<ResultView product={product} score={{ ...foundYogurt.score, score: null, grade: 'unavailable' }} />);
  expect(screen.getByTestId('allergen-summary')).toHaveTextContent(ro.result.noProfileAllergens);
  expect(inOrder().indexOf(product.name)).toBeLessThan(inOrder().indexOf('allergen-summary'));
});

it('sits between the score and the reasons', async () => {
  mockProfile = profile(['Arahide']);
  await render(<ResultView product={yogurt({ status: 'verified' })} score={{ ...foundYogurt.score, letter: 'B' }} />);
  const order = inOrder();
  expect(order.indexOf('product-score')).toBeLessThan(order.indexOf('allergen-summary'));
  expect(order.indexOf('allergen-summary')).toBeLessThan(order.indexOf('reason-tone-'));
});

it.each([
  ['a verified product with a blank label', yogurt({ status: 'verified', ingredientsText: '  ', allergens: [], mayContain: [] })],
  ['an unverified partial record', yogurt({ status: 'unverified', ingredientsText: 'apă', allergens: [], mayContain: [] })],
] as const)('shows incomplete evidence for %s', async (_, product) => {
  mockProfile = profile(['Arahide']);
  await render(<ResultView product={product} score={foundYogurt.score} />);
  expect(screen.queryByText(ro.result.noProfileAllergens)).toBeNull();
  expect(screen.queryByText(ro.result.noAllergens)).toBeNull();
  expect(screen.getByText(ro.result.allergenDataUnknown)).toBeTruthy();
  expect(screen.getAllByText(ro.result.missingAllergenNote)).toHaveLength(1);
});

it('shows possible traces separately from declared allergens', async () => {
  mockProfile = profile([]);
  const product = yogurt({ allergens: ['Lapte'], mayContain: ['Soia'] });
  await render(<ResultView product={product} score={foundYogurt.score} />);
  expect(screen.getByText(ro.result.containsAllergen('lapte'))).toBeTruthy();
  expect(screen.getByText(`${ro.result.mayContain} ${ro.allergens.Soia}`)).toBeTruthy();
  expect(screen.getAllByText(ro.result.missingAllergenNote)).toHaveLength(1);
});
