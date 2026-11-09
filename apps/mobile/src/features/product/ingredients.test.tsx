import { render, fireEvent, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import Ingredients from '../../../app/product/[id]/ingredients';
import Label from '../../../app/product/[id]/label';
import { foundYogurt, previewEntries } from '../../test/fixtures';
import { ro } from '../../copy/ro';
let mockProduct = foundYogurt.product;
const mockScore = foundYogurt.score;
jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({ id: 'test' }), router: { canGoBack: () => false, replace: jest.fn() } }));
jest.mock('./useProduct', () => ({ useProduct: () => ({ loading: false, data: { product: mockProduct, score: mockScore } }) }));

test('uses the ordered ingredient groups and expands an unknown ingredient', async () => {
  mockProduct = { ...foundYogurt.product, ingredients: [
    ...previewEntries[2]!.product.ingredients, ...previewEntries[1]!.product.ingredients,
  ] };
  await render(<Ingredients />);
  expect(screen.getAllByRole('header').map(node => node.props.children)).toEqual([
    ro.ingredients.title, ro.ingredients.base, ro.ingredients.fat, ro.ingredients.taste, ro.ingredients.add, ro.ingredients.cult, ro.result.source,
  ]);
  await fireEvent.press(screen.getByRole('button', { name: 'Smântână' }));
  expect(screen.getByText(ro.ingredients.explanationSoon)).toBeTruthy();
});
test('expands source-backed test content and opens only a web source', async () => {
  // Reserved test content is not a human-verified ingredient fact.
  mockProduct = { ...foundYogurt.product, ingredients: [{ slug: 'test-only', name: 'Ingredient pentru test',
    group: 'base', role: 'Rol pentru test', explanation: 'Explicație pentru test', source: 'https://example.invalid/source', allergen: null }] };
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  await render(<Ingredients />);
  await fireEvent.press(screen.getByRole('button', { name: 'Ingredient pentru test' }));
  expect(screen.getByText('Rol pentru test')).toBeTruthy();
  expect(screen.getByText('Explicație pentru test')).toBeTruthy();
  expect(screen.getByText(ro.result.explainedWithSource)).toBeTruthy();
  expect(screen.getByText(ro.result.transcribedLabel)).toBeTruthy();
  expect(screen.getByText(mockProduct.ingredientsText)).toBeTruthy();
  expect(screen.getByText(ro.result.missingAllergenNote)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: ro.ingredients.source }));
  expect(open).toHaveBeenCalledWith('https://example.invalid/source');
  open.mockRestore();
});
test('original label includes text and provenance, and hidden products reveal no contents', async () => {
  mockProduct = foundYogurt.product;
  const result = await render(<Label />);
  expect(screen.getByText(mockProduct.ingredientsText!)).toBeTruthy();
  expect(screen.getByText(mockProduct.source)).toBeTruthy();
  await result.unmount();
  mockProduct = { ...foundYogurt.product, status: 'hidden' };
  await render(<Ingredients />);
  expect(screen.getByText(ro.result.notFound)).toBeTruthy();
  expect(screen.queryByText(mockProduct.name)).toBeNull();
});
test('ingredients retain declared allergens and product provenance', async () => {
  mockProduct = foundYogurt.product;
  await render(<Ingredients />);
  expect(screen.getAllByText('Lapte').length).toBeGreaterThan(0);
  expect(screen.getByText(mockProduct.source)).toBeTruthy();
});
