import { previewEntries } from '../../test/fixtures';
import { betterOverall, compareRows } from './compare';
const a = previewEntries[0]!.product, b = previewEntries[1]!.product;

test('compares the prototype yogurts with lower sugar and higher protein preferred', () => {
  const rows = compareRows(a, b);
  expect(rows.find(row => row.key === 'sugar')).toEqual({ key: 'sugar', a: 4.1, b: 13.2, better: 'a' });
  expect(rows.find(row => row.key === 'protein')).toEqual({ key: 'protein', a: 3.6, b: 2.9, better: 'a' });
});
test('equal and missing values have no winner; zero remains a declared value', () => {
  const rows = compareRows(a, { ...b, nutrients: { ...b.nutrients, sugar: 0, salt: null, fiber: a.nutrients.fiber } });
  expect(rows.find(row => row.key === 'sugar')?.better).toBe('b');
  expect(rows.find(row => row.key === 'salt')?.better).toBeNull();
  expect(rows.find(row => row.key === 'fiber')?.better).toBeNull();
});
test('different categories, units and hidden products produce no comparison', () => {
  expect(compareRows(a, previewEntries[3]!.product)).toEqual([]);
  expect(compareRows(a, { ...b, unit: 'ml' })).toEqual([]);
  expect(compareRows(a, { ...b, status: 'hidden' })).toEqual([]);
});
test('the overall verdict goes to the higher displayed score in the same category', () => {
  const [yogurt, strawberry] = [previewEntries[0]!, previewEntries[1]!];
  expect(betterOverall(yogurt, strawberry)).toBe('a');
  expect(betterOverall(strawberry, yogurt)).toBe('b');
});
test('no overall verdict across categories, on a tie or when a score is withheld', () => {
  const [yogurt, strawberry, , biscuit] = [previewEntries[0]!, previewEntries[1]!, previewEntries[2]!, previewEntries[3]!];
  expect(betterOverall(yogurt, biscuit)).toBeNull();
  expect(betterOverall(yogurt, { ...strawberry, score: yogurt.score })).toBeNull();
  const incomplete = { ...strawberry, product: { ...strawberry.product, nutrients: { ...strawberry.product.nutrients, salt: null } } };
  expect(betterOverall(yogurt, incomplete)).toBeNull();
});
