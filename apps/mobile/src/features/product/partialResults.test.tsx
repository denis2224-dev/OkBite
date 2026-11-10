import { fireEvent, render, screen } from '@testing-library/react-native';
import { NUTRIENT_KEYS } from '@okbite/shared';
import { router } from 'expo-router';
import { ResultView } from './ResultView';
import { foundYogurt } from '../../test/fixtures';
import { ro } from '../../copy/ro';
import { roDate } from './SourceCard';
import { light as mockLight, dark as mockDarkColors } from '../../theme/tokens';

let mockDark = false;
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('../../theme/useTheme', () => ({ useTheme: () => ({ colors: mockDark ? mockDarkColors : mockLight }) }));
const empty = Object.fromEntries(NUTRIENT_KEYS.map(key => [key, null])) as typeof foundYogurt.product.nutrients;
const product = { ...foundYogurt.product, status: 'unverified' as const, nutrients: empty };
for (const dark of [false, true]) describe(dark ? 'dark partial result' : 'light partial result', () => {
  beforeEach(() => { mockDark = dark; jest.clearAllMocks(); });
  it('replaces absent nutrition with a neutral card while keeping ingredients and provenance', async () => {
    await render(<ResultView product={{...product, allergens: [], mayContain: ['Soia']}} score={foundYogurt.score} />);
    expect(screen.getByText(ro.result.nutritionUnavailable)).toBeTruthy();
    expect(screen.queryByText(ro.score.title)).toBeNull();
    expect(screen.queryByText(ro.result.portion)).toBeNull();
    expect(screen.queryAllByText(/% din referința zilnică/)).toHaveLength(0);
    expect(screen.getByText(product.ingredientsText)).toBeTruthy();
    expect(screen.getByText(ro.result.transcribedLabel)).toBeTruthy();
    expect(screen.getByText('Soia')).toBeTruthy();
    expect(screen.getByText(ro.result.missingAllergenNote)).toBeTruthy();
    expect(screen.getByText(product.source)).toBeTruthy();
    expect(screen.getByText(`${ro.result.added}: ${roDate(product.addedAt)}`)).toBeTruthy();
    expect(screen.getByText(ro.result.unverifiedNote)).toBeTruthy();
  });
  it('shows only available values on their declared basis, preserving real zero', async () => {
    await render(<ResultView product={{...product, nutrients: {...empty, sugar: 0, salt: 0.5}}} score={foundYogurt.score} />);
    expect(screen.getByText(ro.result.insufficientNutrition)).toBeTruthy();
    expect(screen.getByText(ro.result.per100(product.unit))).toBeTruthy();
    expect(screen.getByText('0 g')).toBeTruthy();
    expect(screen.getByText('0,5 g')).toBeTruthy();
    expect(screen.queryByText(ro.result.nutrients.kcal)).toBeNull();
    expect(screen.queryByText(ro.result.portion)).toBeNull();
    expect(screen.queryByLabelText(/din 100, calitate/)).toBeNull();
  });
  it('withholds even a stale water score when the category is unconfirmed', async () => {
    await render(<ResultView product={{...foundYogurt.product, category: {slug: 'necunoscut', name: 'Necunoscut', scoreKind: 'water'}}} score={{...foundYogurt.score, score:100, grade:'good'}} />);
    expect(screen.getByText(ro.result.categoryUnconfirmed)).toBeTruthy();
    expect(screen.queryByText(ro.score.title)).toBeNull();
    expect(screen.queryByLabelText(/100 din 100/)).toBeNull();
  });
  it('hides enrichment by default and links the same product only when integration is ready', async () => {
    const view = await render(<ResultView product={product} score={foundYogurt.score} />);
    expect(screen.queryByRole('button', {name: ro.result.addNutrition})).toBeNull();
    await view.rerender(<ResultView product={product} score={foundYogurt.score} nutritionAdditionAvailable />);
    await fireEvent.press(screen.getByRole('button', {name: ro.result.addNutrition}));
    expect(router.push).toHaveBeenCalledWith({pathname: '/add/nutrition', params: {productId: product.id}});
    await view.rerender(<ResultView product={{...product, status:'verified'}} score={foundYogurt.score} nutritionAdditionAvailable />);
    expect(screen.queryByRole('button', {name: ro.result.addNutrition})).toBeNull();
    await view.rerender(<ResultView product={{...product, nutrients: {...empty, sugar:0}}} score={foundYogurt.score} nutritionAdditionAvailable />);
    expect(screen.queryByRole('button', {name: ro.result.addNutrition})).toBeNull();
  });
});
