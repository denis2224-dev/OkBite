import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ScoreFixture, type Nutrients, type ScoreResult } from '../contract';
import { computeScore } from './index';
import { productScore, tierFor, type ScoredProduct } from './product';

const fixtures = ScoreFixture.array().parse(JSON.parse(readFileSync(
  new URL('../../../../data/score-fixtures.json', import.meta.url), 'utf8',
)));

const zero: Nutrients = { kcal: 0, fat: 0, sat: 0, sugar: 0, salt: 0, protein: 0, fiber: 0, fruitVegPct: null };
const add = (name: string, risk?: 'low' | 'moderate' | 'high' | null) => ({ name, group: 'add' as const, risk });
const water = (extra: Partial<ScoredProduct> = {}): ScoredProduct => ({
  nutrients: zero, category: { scoreKind: 'water' }, ingredientsText: 'apă', ingredients: [],
  processing: { level: 1 }, ...extra,
});
const nutrition = (p: ScoredProduct): ScoreResult => computeScore(p.nutrients, p.category.scoreKind, p.ingredientsText);
const run = (p: ScoredProduct) => productScore(p, nutrition(p));
const sum = (r: ReturnType<typeof productScore>) => r.deductions.reduce((s, d) => s + d.points, 0);

describe('productScore weights', () => {
  it('gives 100 to water with no additives and NOVA 1', () => {
    expect(run(water())).toEqual({ score: 100, tier: 'excellent', deductions: [] });
  });

  it('nutrition is worth 60: round(score × 0.6), split into its negative parts', () => {
    const p = water({ category: { scoreKind: 'general' }, nutrients: { ...zero, kcal: 400, sugar: 30 } });
    const n = nutrition(p);
    const r = productScore(p, n);
    expect(r.score).toBe(Math.round(n.score! * 0.6) + 30 + 10);
    expect(100 - sum(r)).toBe(r.score);
    expect(r.deductions.map((d) => d.key).sort()).toEqual(['kcal', 'sugar']);
  });

  it('takes 10 per high-risk and 5 per moderate additive, floor 0', () => {
    expect(run(water({ ingredients: [add('E250', 'moderate')] })).score).toBe(95);
    expect(run(water({ ingredients: [add('E250', 'moderate'), add('E621', 'moderate')] })).score).toBe(90);
    const many = run(water({ ingredients: [add('E250', 'moderate'), ...['a', 'b', 'c', 'd'].map((n) => add(n, 'high'))] }));
    expect(many.deductions.filter((d) => d.key === 'additive').reduce((s, d) => s + d.points, 0)).toBe(30);
  });

  it('lists a not-assessed additive with 0 points and ignores low-risk ones', () => {
    const r = run(water({ ingredients: [add('E330', null), add('E300', 'low'), { name: 'zahăr', group: 'base' }] }));
    expect(r.score).toBe(100);
    expect(r.deductions).toEqual([{ key: 'additive', points: 0, detail: 'E330' }]);
  });

  it('processing is worth 10: NOVA 1–2 full, 3 half, 4 none', () => {
    expect(run(water({ processing: { level: 2 } })).score).toBe(100);
    expect(run(water({ processing: { level: 3 } })).score).toBe(95);
    expect(run(water({ processing: { level: 4 } }))).toEqual({
      score: 90, tier: 'excellent', deductions: [{ key: 'processing', points: 10 }],
    });
  });

  it('rescales nutrition and additives to 100 when processing is unknown', () => {
    expect(run(water({ processing: null })).score).toBe(100);
    expect(run(water({ processing: undefined, ingredients: [add('E250', 'moderate')] })).score).toBe(94); // 85/90
    const r = run(water({ processing: null, ingredients: [add('E250', 'moderate')] }));
    expect(r.deductions).toEqual([{ key: 'additive', points: 6, detail: 'E250' }]);
  });

  it('caps the total at 49 when any additive is high-risk', () => {
    const r = run(water({ ingredients: [add('E171', 'high')] }));
    expect(r.score).toBe(49);
    expect(r.tier).toBe('fair');
    expect(r.deductions).toEqual([{ key: 'additive', points: 10, detail: 'E171' }, { key: 'cap', points: 41 }]);
  });

  it('returns null with no deductions when nutrition is unavailable', () => {
    const p = water({ category: { scoreKind: 'general' }, nutrients: { ...zero, sugar: null } });
    expect(run(p)).toEqual({ score: null, tier: null, deductions: [] });
  });
});

describe('deductions add up', () => {
  const variants: Partial<ScoredProduct>[] = [
    {}, { processing: null }, { processing: { level: 3 } }, { processing: { level: 4 } },
    { processing: null, ingredients: [add('E250', 'moderate')] },
    { processing: { level: 3 }, ingredients: [add('E250', 'moderate'), add('E330', null)] },
    { processing: null, ingredients: [add('E171', 'high')] },
  ];
  for (const f of fixtures) {
    it(`100 − deductions = score for ${f.name}`, () => {
      for (const v of variants) {
        const r = run(water({
          nutrients: f.nutrients, category: { scoreKind: f.scoreKind }, ingredientsText: f.ingredientsText ?? '', ...v,
        }));
        expect(r.score).not.toBeNull();
        expect(100 - sum(r)).toBe(r.score);
        expect(r.deductions.every((d) => Number.isInteger(d.points) && d.points >= 0)).toBe(true);
      }
    });
  }
});

describe('tierFor', () => {
  it.each([
    [100, 'excellent'], [80, 'excellent'], [79, 'good'], [60, 'good'], [59, 'fair'], [40, 'fair'],
    [39, 'poor'], [20, 'poor'], [19, 'bad'], [0, 'bad'],
  ] as const)('%i → %s', (score, tier) => expect(tierFor(score)).toBe(tier));
});
