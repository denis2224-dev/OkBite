import { previewEntries } from '../../test/fixtures';
import { betterOverall, compareRows, pickable, placeAdded, togglePick } from './compare';
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

const [pa, pb, pc, pd] = [previewEntries[0]!, previewEntries[1]!, previewEntries[2]!, previewEntries[3]!];
describe('placeAdded', () => {
  test('a photographed product fills slot A while it is empty', () => {
    expect(placeAdded(undefined, undefined, pa)).toEqual({ a: pa, b: undefined });
    expect(placeAdded(undefined, pb, pa)).toEqual({ a: pa, b: pb });
  });
  test('it goes to slot B when A already has a product, replacing the one in B', () => {
    expect(placeAdded(pa, undefined, pb)).toEqual({ a: pa, b: pb });
    expect(placeAdded(pa, pb, pc)).toEqual({ a: pa, b: pc });
  });
  test('a product already in a slot changes nothing', () => {
    expect(placeAdded(pa, pb, pa)).toEqual({ a: pa, b: pb });
    expect(placeAdded(pa, pb, pb)).toEqual({ a: pa, b: pb });
  });
});
describe('pickable', () => {
  test('everything can be picked while nothing is chosen', () => {
    expect(pickable(undefined, undefined, pa)).toBe(true);
    expect(pickable(undefined, undefined, pd)).toBe(true);
  });
  test('the product already in a slot cannot be picked again', () => {
    expect(pickable(pa, undefined, pa)).toBe(false);
    expect(pickable(pa, pb, pb)).toBe(false);
  });
  test('after A, only the same category can be picked', () => {
    expect(pickable(pa, undefined, pb)).toBe(true);
    expect(pickable(pa, undefined, pd)).toBe(false);
  });
});

describe('togglePick', () => {
  test('a product already in slot A or B is taken out, and the other slot stays', () => {
    expect(togglePick(pa, pb, pa)).toEqual({ a: undefined, b: pb });
    expect(togglePick(pa, pb, pb)).toEqual({ a: pa, b: undefined });
    expect(togglePick(pa, undefined, pa)).toEqual({ a: undefined, b: undefined });
  });
  test('any other product goes to the next free slot', () => {
    expect(togglePick(undefined, undefined, pa)).toEqual({ a: pa, b: undefined });
    expect(togglePick(pa, undefined, pb)).toEqual({ a: pa, b: pb });
  });
});
