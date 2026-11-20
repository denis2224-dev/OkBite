import { packageAmount } from './packageAmount';

const p = (quantity: string, unit: 'g' | 'ml' = 'g') => ({ quantity, unit });

it.each([
  ['400 g', 'g', 400], ['500g', 'g', 500], ['1,5 kg', 'g', 1500], ['250 ml', 'ml', 250], ['0,5 l', 'ml', 500],
  ['33 cl', 'ml', 330], ['6 x 250 ml', 'ml', 1500], ['2×100 g', 'g', 200], ['Aprox. 200 G', 'g', 200],
] as const)('reads %s as %d in %s', (quantity, unit, expected) => {
  expect(packageAmount(p(quantity, unit))).toBe(expected);
});
it.each([['', 'g'], ['1 bucată', 'g'], ['400 g', 'ml'], ['250 ml', 'g'], ['0 g', 'g']] as const)('gives null for "%s" with unit %s', (quantity, unit) => {
  expect(packageAmount(p(quantity, unit))).toBeNull();
});
