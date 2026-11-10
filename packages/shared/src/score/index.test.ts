import { expect, it } from 'vitest';
import { ScoreResult, type Nutrients, type ScoreKind } from '../contract';
import { computeScore } from './index';

const zero: Nutrients = { kcal: 0, fat: 0, sat: 0, sugar: 0, salt: 0, protein: 0, fiber: 0, fruitVegPct: 0 };
const score = (over: Partial<Nutrients>, kind: ScoreKind = 'general', ingredients = '') =>
  ScoreResult.parse(computeScore({ ...zero, ...over }, kind, ingredients));

it('missing sugar → unavailable, listing what is missing', () => {
  expect(score({ sugar: null })).toEqual({ score: null, letter: null, grade: 'unavailable', reasons: [], missing: ['sugar'] });
  expect(score({ kcal: null, salt: null }).missing).toEqual(['kcal', 'salt']);
});

it('fats also need fat for the saturates/lipids ratio; water needs nothing', () => {
  expect(score({ fat: null }, 'fat').missing).toEqual(['fat']);
  expect(score({ fat: null }).grade).not.toBe('unavailable');
  expect(score({ kcal: null, sugar: null, sat: null, salt: null }, 'water'))
    .toMatchObject({ score: 100, letter: 'A', grade: 'good' });
});

it('letters A/B → good, C → medium, D/E → low', () => {
  expect(score({}).grade).toBe('good'); // A
  expect(score({ sugar: 3.5 }).grade).toBe('good'); // B
  expect(score({ sugar: 10.1 }).grade).toBe('medium'); // C
  expect(score({ sugar: 52 }).grade).toBe('low'); // D
  expect(score({ sugar: 52, salt: 0.9 }).grade).toBe('low'); // E
});

it('bad reasons: the two worst components at ≥ half their maximum, with the real number and a decimal comma', () => {
  expect(score({ kcal: 430, sugar: 31.25, sat: 9.8, salt: 0.5 }).reasons).toEqual([
    { tone: 'bad', title: 'Multe grăsimi saturate', detail: '9,8 g la 100 g' }, // 9 of 10
    { tone: 'bad', title: 'Mult zahăr', detail: '31,3 g la 100 g' }, // 9 of 15
  ]);
  expect(score({ sugar: 13.2, sat: 9 }).reasons[0]).toEqual(
    { tone: 'bad', title: 'Multe grăsimi saturate', detail: '9 g la 100 g' });
});

it('one good reason from the best favourable component scoring ≥ 2', () => {
  expect(score({ fiber: 7.8, protein: 5.2 }).reasons).toContainEqual(
    { tone: 'good', title: 'Bogat în fibre', detail: '7,8 g la 100 g' });
  expect(score({ fiber: 3.5 }).reasons.some((x) => x.tone === 'good')).toBe(false); // 1 point
});

it('a neutral reason only when fewer than 2 exist', () => {
  expect(score({ sat: 1.6, fiber: 7.8 }).reasons).toEqual([
    { tone: 'good', title: 'Bogat în fibre', detail: '7,8 g la 100 g' },
    { tone: 'neutral', title: 'Grăsimi saturate: nivel mediu', detail: '1,6 g la 100 g' },
  ]);
  const full = score({ kcal: 430, sugar: 26, sat: 9.8, salt: 0.5, fiber: 7.8 }).reasons;
  expect(full.map((x) => x.tone)).toEqual(['bad', 'bad', 'good']);
});

it('beverages say ml', () => {
  expect(score({ sugar: 10.6 }, 'beverage').reasons[0]?.detail).toBe('10,6 g la 100 ml');
});

it('never more than 3 reasons', () => {
  const r = score({ kcal: 500, sugar: 40, sat: 12, salt: 3, fiber: 8, protein: 20, fruitVegPct: 90 }, 'cheese');
  expect(r.reasons.length).toBeLessThanOrEqual(3);
});

it('a beverage with a non-nutritive sweetener in its ingredients drops a letter and says why', () => {
  const plain = score({}, 'beverage', 'apă, dioxid de carbon, acid citric');
  const light = score({}, 'beverage', 'apă, dioxid de carbon, îndulcitori: aspartam, acesulfam K');
  expect([plain.letter, light.letter]).toEqual(['B', 'C']);
  expect(light.reasons).toContainEqual(
    { tone: 'bad', title: 'Conține îndulcitori', detail: 'Îndulcitori fără calorii în ingrediente' });
  expect(score({}, 'general', 'iaurt, aspartam').letter).toBe('A');
});

it.each(['E960b', 'E960c', 'E960d'])('%s adds four beverage points through ingredientsText', (sweetener) => {
  expect(score({}, 'beverage', `apă, îndulcitor: ${sweetener}`))
    .toMatchObject({ letter: 'C', grade: 'medium', score: 53 });
  expect(score({}, 'beverage', `apă, îndulcitor: ${sweetener}`).reasons)
    .toContainEqual({ tone: 'bad', title: 'Conține îndulcitori', detail: 'Îndulcitori fără calorii în ingrediente' });
});
