import { expect, it } from 'vitest';
import type { Nutrients, ScoreKind } from '../contract';
import { computeScore } from './index';
import { letterFor, nutriScorePoints } from './nutriscore';
import { toHundred } from './toHundred';

const zero: Nutrients = { kcal: 0, fat: 0, sat: 0, sugar: 0, salt: 0, protein: 0, fiber: 0, fruitVegPct: 0 };
it('reproduces the official Red meat sheet example (beef tenderloin steak raw)', () => {
  // SpF 20240404 Red meat!A3:I3: 489 kJ, sugar 0, sat 0.9, salt 0.125,
  // FVL 0, fibre 0, protein 23.7. Updated result AB3/AC3 is -1 / A.
  expect(nutriScorePoints({ ...zero, kcal: 489 / 4.184, sat: 0.9, salt: 0.125, protein: 23.7 }, 'red_meat'))
    .toMatchObject({ points: -1, letter: 'A' });
});
it('keeps beverage salt=3.2 at 15 points, following report/FAQ rather than the workbook typo', () => {
  // FAQ V11 Table 9: 15 >3.0, 16 >3.2. Both pinned workbooks incorrectly use <3.2.
  expect(nutriScorePoints({ ...zero, salt: 3.2 }, 'beverage').components.salt).toBe(15);
  expect(nutriScorePoints({ ...zero, salt: 3.2001 }, 'beverage').components.salt).toBe(16);
});
// Independent reference: SpF 20240404 workbook Scenario and category sheets, updated columns.
const tables: [ScoreKind, keyof Nutrients, string, number[], number?][] = [
  ['general', 'kcal', 'energy', [335,670,1005,1340,1675,2010,2345,2680,3015,3350], 4.184],
  ['general', 'sugar', 'sugar', [3.4,6.8,10,14,17,20,24,27,31,34,37,41,44,48,51]],
  ['general', 'sat', 'sat', [1,2,3,4,5,6,7,8,9,10]],
  ['general', 'salt', 'salt', [0.2,0.4,0.6,0.8,1,1.2,1.4,1.6,1.8,2,2.2,2.4,2.6,2.8,3,3.2,3.4,3.6,3.8,4]],
  ['general', 'protein', 'protein', [2.4,4.8,7.2,9.6,12,14,17]],
  ['general', 'fiber', 'fiber', [3,4.1,5.2,6.3,7.4]],
  ['fat', 'sat', 'energy', [120,240,360,480,600,720,840,960,1080,1200], 37],
  ['beverage', 'kcal', 'energy', [30,90,150,210,240,270,300,330,360,390], 4.184],
  ['beverage', 'sugar', 'sugar', [0.5,2,3.5,5,6,7,8,9,10,11]],
  ['beverage', 'protein', 'protein', [1.2,1.5,1.8,2.1,2.4,2.7,3]],
];
it.each(tables)('%s %s: equality stays below the strict threshold', (kind, key, component, thresholds, scale = 1) => {
  for (const [i, t] of thresholds.entries()) {
    const points = (v: number) => nutriScorePoints({ ...zero, fat: 100, [key]: v / scale }, kind).components[component];
    expect(points(t - 0.0001)).toBe(i);
    expect(points(t)).toBe(i);
    expect(points(t + 0.0001)).toBe(i + 1);
  }
});

it('fat ratio equality is inclusive at every threshold', () => {
  for (const [i, t] of [10,16,22,28,34,40,46,52,58,64].entries()) {
    const points = (v: number) => nutriScorePoints({ ...zero, fat: 10, sat: v / 10 }, 'fat').components.satRatio;
    expect(points(t - 0.0001)).toBe(i);
    expect(points(t)).toBe(i + 1);
    expect(points(t + 0.0001)).toBe(i + 1);
  }
});

it.each(['general','cheese','red_meat','fat','beverage'] as const)('%s fruit/vegetable equality is strict', (kind) => {
  const points = (fruitVegPct: number) => nutriScorePoints({ ...zero, fruitVegPct }, kind).components.fruitVeg;
  expect([40,40.01,60,60.01,80,80.01].map(points))
    .toEqual(kind === 'beverage' ? [0,2,2,4,4,6] : [0,1,1,2,2,5]);
});

it('protein caps apply at N=11 (general/red meat) and N=7 (fats), with the cheese exemption', () => {
  expect(nutriScorePoints({ ...zero, sugar: 37.1, protein: 20, fruitVegPct: 100 }, 'general').components.protein).toBe(0);
  expect(nutriScorePoints({ ...zero, sugar: 37.1, protein: 20 }, 'cheese').components.protein).toBe(7);
  expect(nutriScorePoints({ ...zero, sugar: 34.1, protein: 20 }, 'red_meat').components.protein).toBe(2);
  expect(nutriScorePoints({ ...zero, sugar: 37.1, protein: 20 }, 'red_meat').components.protein).toBe(0);
  expect(nutriScorePoints({ ...zero, fat: 100, sugar: 24.1, protein: 20 }, 'fat').components.protein).toBe(0);
  expect(nutriScorePoints({ ...zero, fat: 100, sugar: 20.1, protein: 20 }, 'fat').components.protein).toBe(7);
});

it.each([
  ['general', [-17,0,1,2,3,10,11,18,19,55]],
  ['cheese', [-17,0,1,2,3,10,11,18,19,55]],
  ['red_meat', [-12,0,1,2,3,10,11,18,19,55]],
  ['fat', [-17,-6,-5,2,3,10,11,18,19,55]],
] as const)('%s uses all ten 0–100 band endpoints', (kind, endpoints) => {
  expect(endpoints.map((p) => toHundred(p, letterFor(p, kind), kind)))
    .toEqual([100,80,79,60,59,40,39,20,19,0]);
});
it('beverages have B–E endpoints; A is reserved for water', () => {
  expect([-18,2,3,6,7,9,10,54].map((p) => toHundred(p, letterFor(p, 'beverage'), 'beverage')))
    .toEqual([79,60,59,40,39,20,19,0]);
});

it.each(['general','cheese','red_meat','fat','beverage'] as const)('%s requires every essential nutrient, while favourable nulls score zero', (kind) => {
  for (const key of ['kcal','sat','sugar','salt', ...(kind === 'fat' ? ['fat'] as const : [])] as const) {
    expect(computeScore({ ...zero, [key]: null }, kind, '').missing).toEqual([key]);
  }
  expect(computeScore({ ...zero, protein: null, fiber: null, fruitVegPct: null }, kind, ''))
    .toEqual(computeScore(zero, kind, ''));
});
