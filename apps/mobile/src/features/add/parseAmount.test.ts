import { describe, it, expect } from '@jest/globals';
import { parseAmount } from './parseAmount';

describe('parseAmount', () => {
  it.each([
    ['0,3', 0.3],
    [' 13.2 g', 13.2],
    ['13,2 g', 13.2],
    ['250 kcal', 250],
    ['12 %', 12],
    ['100 ml', 100],
    ['0', 0],
    ['0,0', 0],
    [' 42 ', 42],
  ])('parses valid amount %j -> %s', (input, expected) => {
    expect(parseAmount(input)).toBe(expected);
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
  ])('returns null for invalid, negative, or non-finite input %j', (input) => {
    expect(parseAmount(input)).toBeNull();
  });
});

