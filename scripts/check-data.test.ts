import { describe, expect, it } from 'vitest';
import { checkData, type DataFiles } from './check-data';

const ingredient = {
  slug: 'lecitina-soia', name: 'Lecitină din soia', aliases: ['E322', 'lecitină din soia'],
  group: 'add', role: 'Emulgator', explanation: 'Ajută grăsimea și apa să se amestece.',
  source: 'Reg. (UE) nr. 1333/2008', allergen: 'Soia', checkedBy: 'Sergiu', checkedAt: '2026-11-10',
};
const fixture = {
  name: 'Iaurt', scoreKind: 'general', expectedPoints: 1, expectedLetter: 'A', checkedWith: 'SpF calculator 2023',
  nutrients: { kcal: 60, fat: 2, sat: 1, sugar: 4, salt: 0.1, protein: 4, fiber: 0, fruitVegPct: 0 },
};
const ok = (): DataFiles => ({
  categories: [{ slug: 'iaurt', name: 'Iaurt', scoreKind: 'general' }],
  ingredients: [ingredient],
});

describe('checkData', () => {
  it('accepts valid data', () => expect(checkData(ok()).errors).toEqual([]));

  it('reports an ingredient without checkedBy', () => {
    const { checkedBy: _, ...unchecked } = ingredient;
    expect(checkData({ ...ok(), ingredients: [unchecked] }).errors.join()).toMatch(/lecitina-soia.*checkedBy/);
  });

  it('reports a duplicate slug', () => {
    const errors = checkData({ ...ok(), ingredients: [ingredient, { ...ingredient, aliases: ['x'] }] }).errors;
    expect(errors.join()).toMatch(/duplicate slug lecitina-soia/);
  });

  it('reports an alias used twice, ignoring case and diacritics', () => {
    const other = { ...ingredient, slug: 'e322', aliases: ['LECITINA DIN SOIA'] };
    expect(checkData({ ...ok(), ingredients: [ingredient, other] }).errors.join()).toMatch(/duplicate alias/);
  });

  it('reports an allergen not in ALLERGENS', () => {
    const errors = checkData({ ...ok(), ingredients: [{ ...ingredient, allergen: 'Nuci' }] }).errors;
    expect(errors.join()).toMatch(/lecitina-soia.*allergen/);
  });

  it('reports a category with an unknown scoreKind', () => {
    const errors = checkData({ ...ok(), categories: [{ slug: 'apa', name: 'Apă', scoreKind: 'drink' }] }).errors;
    expect(errors.join()).toMatch(/apa.*scoreKind/);
  });

  it('reports an invalid score fixture when fixtures exist', () => {
    expect(checkData({ ...ok(), fixtures: [fixture] }).errors).toEqual([]);
    const errors = checkData({ ...ok(), fixtures: [{ ...fixture, expectedLetter: 'F' }] }).errors;
    expect(errors.join()).toMatch(/Iaurt.*expectedLetter/);
  });
});
