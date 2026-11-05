import { perPortion, percentOfReference, teaspoons } from './portion';

it('scales label values to the selected portion', () => {
  expect(perPortion(13.2, 150)).toBeCloseTo(19.8);
  expect(perPortion(0, 150)).toBe(0);
});
it('uses the adult reference amounts from the spec', () => {
  expect(percentOfReference('sat', 2.4)).toBe(12);
  expect(percentOfReference('kcal', 1000)).toBe(50);
  expect(percentOfReference('sugar', 45)).toBe(50);
  expect(percentOfReference('salt', 3)).toBe(50);
});
it.each([[19.8, '5 lingurițe'], [1.5, 'sub jumătate de linguriță'],
  [2, 'jumătate de linguriță'], [4, '1 linguriță'], [6, '1,5 lingurițe']])(
  'expresses %s g of sugar as teaspoons', (grams, text) => expect(teaspoons(grams)).toBe(text),
);
