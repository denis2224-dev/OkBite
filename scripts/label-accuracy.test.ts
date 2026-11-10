import { describe, expect, it } from 'vitest';
import { compare, renderReport, similarity, summarize, Truth } from './label-accuracy';

const nutrients = { kcal: 63, fat: 2.5, sat: 1.6, sugar: 4.1, salt: 0.1, protein: 3.6, fiber: null, fruitVegPct: null };
const truth = Truth.parse({
  nutrition: 'separate', ingredientsText: 'Lapte normalizat, culturi lactice', unit: 'g', nutrients,
});
const read = (over: Record<string, unknown> = {}, n: Record<string, unknown> = {}) => ({
  ingredientsText: 'Lapte normalizat, culturi lactice', unit: 'g', nutrients: { ...nutrients, ...n }, ...over,
});

describe('similarity', () => {
  it('is 1 for the same text ignoring case and spacing, and falls with each wrong character', () => {
    expect(similarity('LAPTE,  zahăr', 'lapte, zahăr')).toBe(1);
    expect(similarity('lapte', 'lapde')).toBeCloseTo(0.8);
    expect(similarity('lapte', null)).toBe(0);
    expect(similarity('', '')).toBe(1);
  });
});

describe('compare', () => {
  it('marks every field exact when the read equals the truth, nulls included', () => {
    const r = compare(truth, read());
    expect(Object.values(r.fields).every((f) => f.exact)).toBe(true);
    expect(r.invented).toEqual([]);
    expect(r.similarity).toBe(1);
  });

  it('separates exact, within 0,1 and wrong nutrient values', () => {
    const r = compare(truth, read({}, { fat: 2.6, sugar: 4.3, kcal: null }));
    expect(r.fields.fat).toEqual({ exact: false, within: true });
    expect(r.fields.sugar).toEqual({ exact: false, within: false });
    expect(r.fields.kcal).toEqual({ exact: false, within: false }); // a printed value that was not read
    expect(r.fields.sat).toEqual({ exact: true, within: true });
  });

  it('lists a number returned for a value the package does not print, and flags zeros', () => {
    const r = compare(truth, read({}, { fiber: 0, fruitVegPct: 12 }));
    expect(r.invented).toEqual([{ key: 'fiber', value: 0 }, { key: 'fruitVegPct', value: 12 }]);
    expect(r.fields.fiber.exact).toBe(false);
  });

  it('compares the ingredients text and unit exactly after trimming', () => {
    const r = compare(truth, read({ ingredientsText: ' Lapte normalizat, culturi lactice ', unit: 'ml' }));
    expect(r.fields.ingredientsText.exact).toBe(true);
    expect(r.fields.unit.exact).toBe(false);
    expect(compare(truth, read({ ingredientsText: null })).similarity).toBe(0);
  });
});

describe('summarize and renderReport', () => {
  const results = [
    { set: 'a', failed: false, ...compare(truth, read()) },
    { set: 'b', failed: false, ...compare(truth, read({}, { fat: 2.6, fiber: 0 })) },
    { set: 'c', failed: true, ...compare(truth, read({ ingredientsText: null })) },
  ];

  it('counts per field over the sets the AI answered, and failed sets apart', () => {
    const s = summarize(results);
    expect(s.sets).toBe(3);
    expect(s.failed).toBe(1);
    expect(s.fields.fat).toEqual({ exact: 1, within: 2, of: 2 });
    expect(s.fields.kcal).toEqual({ exact: 2, within: 2, of: 2 });
    expect(s.invented).toBe(1);
    expect(s.inventedZeros).toBe(1);
    expect(s.meanSimilarity).toBe(1);
  });

  it('renders counts with model, date and commit, and says so when nothing ran', () => {
    const meta = { model: 'test-model', date: '2026-11-10', sha: 'abc1234', skipped: ['d: no truth.json'] };
    const text = renderReport(summarize(results), results, meta);
    expect(text).toContain('test-model');
    expect(text).toContain('2026-11-10');
    expect(text).toContain('| fat | 1/2 | 2/2 |');
    expect(text).toContain('b: fiber = 0');
    expect(text).toContain('d: no truth.json');
    expect(renderReport(summarize([]), [], { ...meta, skipped: [] })).toContain('No photo set has been run');
    const allSkipped = renderReport(summarize([]), [], meta);
    expect(allSkipped).toContain('No photo set has been run');
    expect(allSkipped).toContain('d: no truth.json');
  });
});

describe('Truth', () => {
  it('rejects ground truth with a missing nutrient key instead of treating it as null', () => {
    expect(Truth.safeParse({ ...truth, nutrients: { kcal: 63 } }).success).toBe(false);
    expect(Truth.safeParse({ ...truth, nutrition: 'later' }).success).toBe(false);
  });
});
