import { describe, it, expect } from '@jest/globals';
import { parseAmount, unitForNutrient } from './parseAmount';

describe('parseAmount', () => {
  it.each([
    ['0,3', undefined, 0.3],
    [' 13.2 g', undefined, 13.2],
    ['13,2 g', 'g', 13.2],
    ['0', undefined, 0],
    ['0,0', 'g', 0],
    ['0 g', 'g', 0],
    [' 42 ', undefined, 42],
    ['250', 'kcal', 250],
    ['250 kcal', 'kcal', 250],
    ['12', '%', 12],
    ['12 %', '%', 12],
  ] as const)('parses valid amount %j (unit=%s) -> %s', (input, unit, expected) => {
    expect(parseAmount(input, unit)).toBe(expected);
  });

  it.each([
    [''],
    ['   '],
    ['\t\n'],
    ['abc'],
    ['g'],
    ['12abc'],
    ['1.2.3'],
    ['1,2,3'],
    [','],
    ['.'],
    ['.5'],
    ['5.'],
    ['-1'],
    ['-0,3'],
    ['-0'],
    ['Infinity'],
    ['-Infinity'],
    ['NaN'],
    ['9'.repeat(400)],
    ['300 mg'],
    ['0,5 kg'],
    ['418 kJ'],
    ['100 ml'],
    ['250 kcal'],
    ['12 %'],
  ])('returns null for invalid, negative, non-finite, or unsupported-unit input %j', (input) => {
    expect(parseAmount(input)).toBeNull();
  });

  it.each([
    ['418 kJ', 'kcal'],
    ['13.2 g', 'kcal'],
    ['12 %', 'kcal'],
    ['250 kcal', 'g'],
    ['300 mg', 'g'],
    ['12 %', 'g'],
    ['13.2 g', '%'],
    ['250 kcal', '%'],
  ] as const)('rejects suffix incompatible with field unit (%j for %s)', (input, unit) => {
    expect(parseAmount(input, unit)).toBeNull();
  });

  it('maps NutrientKey to its expected unit', () => {
    expect(unitForNutrient('kcal')).toBe('kcal');
    expect(unitForNutrient('fruitVegPct')).toBe('%');
    expect(unitForNutrient('fat')).toBe('g');
    expect(unitForNutrient('salt')).toBe('g');
  });
});
