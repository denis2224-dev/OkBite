import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ScoreFixture, type Nutrients } from '../contract';
import { nutriScorePoints } from './nutriscore';

const zero: Nutrients = { kcal: 0, fat: 0, sat: 0, sugar: 0, salt: 0, protein: 0, fiber: 0, fruitVegPct: 0 };
const n = (over: Partial<Nutrients>): Nutrients => ({ ...zero, ...over });

// A3: 30 products checked by a person in the official SpF calculator. Skipped until the file lands.
const fixturesPath = new URL('../../../../data/score-fixtures.json', import.meta.url);
const fixtures = existsSync(fixturesPath)
  ? ScoreFixture.array().parse(JSON.parse(readFileSync(fixturesPath, 'utf8'))) : [];

describe.skipIf(fixtures.length === 0)('data/score-fixtures.json', () => {
  it.each(fixtures.map((f) => [f.name, f] as const))('%s', (_name, f) => {
    const { points, letter } = nutriScorePoints(f.nutrients, f.scoreKind);
    expect({ points, letter }).toEqual({ points: f.expectedPoints, letter: f.expectedLetter });
  });
});

// Boundaries straight from the report tables: a value equal to a threshold scores the lower points.
describe('general foods (2022 report, recap §1)', () => {
  it.each([
    [{ kcal: 80 }, 0], [{ kcal: 81 }, 1], [{ kcal: 1000 }, 10],
    [{ sugar: 3.4 }, 0], [{ sugar: 3.5 }, 1], [{ sugar: 52 }, 15],
    [{ sat: 1 }, 0], [{ sat: 10.1 }, 10],
    [{ salt: 0.2 }, 0], [{ salt: 0.21 }, 1], [{ salt: 4.1 }, 20],
  ])('unfavourable %o → %i points', (over, points) => {
    expect(nutriScorePoints(n(over), 'general').points).toBe(points);
  });

  it.each([
    [{ protein: 2.4 }, 0], [{ protein: 2.5 }, -1], [{ protein: 17.1 }, -7],
    [{ fiber: 3 }, 0], [{ fiber: 3.1 }, -1], [{ fiber: 7.5 }, -5],
    [{ fruitVegPct: 40 }, 0], [{ fruitVegPct: 41 }, -1], [{ fruitVegPct: 61 }, -2], [{ fruitVegPct: 81 }, -5],
  ])('favourable %o → %i points', (over, points) => {
    expect(nutriScorePoints(n(over), 'general').points).toBe(points);
  });

  it('letters: A ≤ 0, B 1–2, C 3–10, D 11–18, E ≥ 19', () => {
    const letter = (sugar: number) => nutriScorePoints(n({ sugar }), 'general').letter;
    expect([letter(0), letter(3.5), letter(7), letter(10.1), letter(52)]).toEqual(['A', 'B', 'B', 'C', 'D']);
    expect(nutriScorePoints(n({ sugar: 52, salt: 0.9 }), 'general').letter).toBe('E'); // 15 + 4
  });

  it('drops protein when A ≥ 11, keeps fibre and fruit/veg', () => {
    const r = nutriScorePoints(n({ sugar: 52, protein: 20, fiber: 8 }), 'general');
    expect(r.points).toBe(15 - 5);
    expect(r.components.protein).toBe(0);
  });

  it('cheese keeps protein whatever A is', () => {
    expect(nutriScorePoints(n({ sugar: 52, protein: 20 }), 'cheese').points).toBe(15 - 7);
  });

  it('red meat gets at most 2 protein points', () => {
    expect(nutriScorePoints(n({ protein: 20 }), 'red_meat').points).toBe(-2);
  });

  it('missing favourable values count as 0', () => {
    expect(nutriScorePoints(n({ protein: null, fiber: null, fruitVegPct: null }), 'general').points).toBe(0);
  });
});

describe('fats, oils, nuts and seeds (2022 report, recap §2)', () => {
  it('energy from saturates is sat × 37 kJ at 120 kJ a point', () => {
    expect(nutriScorePoints(n({ fat: 100, sat: 3.2 }), 'fat').components.energy).toBe(0); // 118 kJ
    expect(nutriScorePoints(n({ fat: 100, sat: 3.3 }), 'fat').components.energy).toBe(1); // 122 kJ
  });

  it('saturates/lipids ratio: < 10 % → 0, 10 % → 1, ≥ 64 % → 10', () => {
    const ratio = (sat: number) => nutriScorePoints(n({ fat: 100, sat }), 'fat').components.satRatio;
    expect([ratio(9.9), ratio(10), ratio(63.9), ratio(64)]).toEqual([0, 1, 9, 10]);
  });

  it('letters: A ≤ −6, B −5…2', () => {
    expect(nutriScorePoints(n({ fat: 100, fiber: 8, fruitVegPct: 81 }), 'fat').letter).toBe('A'); // −10
    expect(nutriScorePoints(n({ fat: 100, fiber: 6.4 }), 'fat').letter).toBe('B'); // −4
  });

  it('counts protein only while A < 7', () => {
    expect(nutriScorePoints(n({ fat: 100, sat: 5, protein: 20 }), 'fat').components.protein).toBe(7); // A = 1
    expect(nutriScorePoints(n({ fat: 100, sat: 30, protein: 20 }), 'fat').components.protein).toBe(0); // A = 9 + 4
  });
});

it('fat ratio thresholds stay inclusive for decimal label values (5,8 g of 10 g = 58 % → 9 points)', () => {
  const ratio = (sat: number, fat: number) =>
    nutriScorePoints({ ...zero, sat, fat }, 'fat').components.satRatio;
  expect([ratio(5.8, 10), ratio(5.79, 10), ratio(1, 10), ratio(0.99, 10), ratio(6.4, 10)]).toEqual([9, 8, 1, 0, 10]);
});

describe('beverages (2023 report, points allocation)', () => {
  it.each([
    [{ kcal: 7 }, 0], [{ kcal: 7.5 }, 1], [{ kcal: 22 }, 2], [{ kcal: 94 }, 10],
    [{ sugar: 0.5 }, 0], [{ sugar: 0.6 }, 1], [{ sugar: 2.1 }, 2], [{ sugar: 11.1 }, 10],
  ])('unfavourable %o → %i points', (over, points) => {
    expect(nutriScorePoints(n(over), 'beverage').points).toBe(points);
  });

  it('protein from 1.2 g in 0.3 g steps, fruit/veg 2/4/6, no protein cap', () => {
    expect(nutriScorePoints(n({ protein: 3.1 }), 'beverage').points).toBe(-7);
    expect(nutriScorePoints(n({ fruitVegPct: 81 }), 'beverage').points).toBe(-6);
    expect(nutriScorePoints(n({ sugar: 12, salt: 1, protein: 3.1 }), 'beverage').components.protein).toBe(7);
  });

  it('letters: B ≤ 2, C 3–6, D 7–9, E ≥ 10; water is A', () => {
    const letter = (sugar: number) => nutriScorePoints(n({ sugar }), 'beverage').letter;
    expect([letter(0), letter(2.1), letter(3.6), letter(8.1), letter(11.1)]).toEqual(['B', 'B', 'C', 'D', 'E']);
    expect(nutriScorePoints(zero, 'water')).toEqual({ points: 0, letter: 'A', components: {} });
  });

  it('non-nutritive sweeteners add 4 unfavourable points to beverages only (report §6.6.2)', () => {
    expect(nutriScorePoints(zero, 'beverage', true)).toMatchObject({ points: 4, letter: 'C' });
    expect(nutriScorePoints(zero, 'beverage', true).components.sweeteners).toBe(4);
    expect(nutriScorePoints(zero, 'beverage').components.sweeteners).toBe(0);
    expect(nutriScorePoints(zero, 'general', true)).toMatchObject({ points: 0, letter: 'A' });
  });
});
