import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Ingredient } from '../contract';
import { BUILTIN_INGREDIENTS, matchIngredients, resolveOffCategory, resolveProductIngredients } from './index';

describe('shared ingredients and OFF category resolution', () => {
  it('matches Coca-Cola Zero sweeteners and additives against BUILTIN_INGREDIENTS', () => {
    const matched = matchIngredients(
      'Ingrediente: Apă, dioxid de carbon, colorant: caramel cu sulfit de amoniu (E150d), acidifiant: acid fosforic (E338), îndulcitori (ciclamați, acesulfam K și aspartam), corector de aciditate: citrați de sodiu, arome naturale, aromă cafeină. Conține o sursă de fenilalanină.',
      BUILTIN_INGREDIENTS,
    );
    expect(matched).toEqual([
      { rawName: 'Apă', slug: 'apa-carbogazoasa' },
      { rawName: 'dioxid de carbon', slug: 'dioxid-de-carbon-e290' },
      { rawName: 'colorant: caramel cu sulfit de amoniu (E150d)', slug: 'colorant-caramel-e150d' },
      { rawName: 'acidifiant: acid fosforic (E338)', slug: 'acid-fosforic-e338' },
      { rawName: 'ciclamați', slug: 'ciclamat-de-sodiu-e952' },
      { rawName: 'acesulfam K', slug: 'acesulfam-k-e950' },
      { rawName: 'aspartam', slug: 'aspartam-e951' },
      { rawName: 'corector de aciditate: citrați de sodiu', slug: 'citrati-de-sodiu-e331' },
      { rawName: 'arome naturale', slug: 'aroma-naturala' },
      { rawName: 'aromă cafeină', slug: 'cafeina' },
    ]);
  });

  it('keeps allergen notices outside the ingredient list in a multilingual label', () => {
    expect(matchIngredients(
      'Ingredients: wheat flour, salt. May contain milk and peanuts. Contains: wheat.',
      [],
    )).toEqual([{ rawName: 'wheat flour', slug: null }, { rawName: 'salt', slug: null }]);
  });

  it('populates product.ingredients from ingredientsText when DB links are empty', () => {
    const resolved = resolveProductIngredients({
      ingredients: [],
      ingredientsText: 'Apă, îndulcitori (aspartam, acesulfam K).',
    });
    expect(resolved.map((i) => i.slug)).toEqual(['apa-carbogazoasa', 'aspartam-e951', 'acesulfam-k-e950']);
    expect(resolved[1]?.role).toContain('E951');
  });

  it('resolves Open Food Facts soft drinks from necunoscut to bauturi-racoritoare', () => {
    expect(
      resolveOffCategory({
        category: { slug: 'necunoscut', name: 'Necunoscut', scoreKind: 'general' },
        source: 'Open Food Facts',
        unit: 'ml',
        name: 'Coca-Cola Zero',
        ingredientsText: 'Apă, dioxid de carbon, îndulcitori (aspartam).',
      }),
    ).toEqual({
      slug: 'bauturi-racoritoare',
      name: 'Băuturi răcoritoare',
      scoreKind: 'beverage',
    });
  });

  it('carries every entry of data/ingredients.json, with its risk and sources, so the app never lags the checked list', () => {
    const file = JSON.parse(readFileSync(new URL('../../../../data/ingredients.json', import.meta.url), 'utf8')) as Record<string, unknown>[];
    const bySlug = new Map(BUILTIN_INGREDIENTS.map((entry) => [entry.slug, entry]));
    for (const { checkedBy: _by, checkedAt: _at, ...entry } of file) {
      expect(bySlug.get(entry.slug as string), String(entry.slug)).toEqual({ risk: null, riskSource: null, ...entry });
    }
    expect(BUILTIN_INGREDIENTS).toHaveLength(file.length);
  });

  describe('stored ingredients are filled in from the knowledge base', () => {
    const stored = (over: Partial<Ingredient>): Ingredient => ({ slug: null, name: 'Pectină (E440)', group: 'add', role: 'Gelifiant', explanation: null, source: null, allergen: null, ...over });
    const resolve = (ingredients: Ingredient[]) => resolveProductIngredients({ ingredients, ingredientsText: '' });

    it('gives a stored additive with nothing but a name its explanation, source, risk and risk source', () => {
      const [pectin] = resolve([stored({})]);
      expect(pectin).toMatchObject({
        slug: 'pectina-e440', name: 'Pectină (E440)', group: 'add', role: 'Gelifiant', risk: 'low',
        explanation: expect.stringContaining('Fibră solubilă'), source: expect.stringContaining('eur-lex'), riskSource: expect.stringContaining('efsa'),
      });
    });
    it('finds it by the plain name or by its E-number', () => {
      expect(resolve([stored({ name: 'Pectină' })])[0]?.slug).toBe('pectina-e440');
      expect(resolve([stored({ name: 'Gelifiant: E440' })])[0]?.slug).toBe('pectina-e440');
      expect(resolve([stored({ name: 'Carmin (E120)' })])[0]?.slug).toBe('carmin-e120');
    });
    it('never overwrites what the backend already sent', () => {
      const [pectin] = resolve([stored({ explanation: 'Text din backend', source: 'https://example.com/s', risk: 'moderate', riskSource: 'https://example.com/r', role: 'Altceva' })]);
      expect(pectin).toMatchObject({ explanation: 'Text din backend', source: 'https://example.com/s', risk: 'moderate', riskSource: 'https://example.com/r', role: 'Altceva' });
    });
    it('leaves an ingredient the list does not know exactly as it was', () => {
      const unknown = stored({ name: 'Ingredient necunoscut', role: null });
      expect(resolve([unknown])).toEqual([unknown]);
    });
    it('leaves a plain ingredient like milk without a risk', () => {
      const [milk] = resolve([stored({ name: 'Lapte normalizat', group: 'base', role: null })]);
      expect(milk).toMatchObject({ slug: 'lapte-normalizat', explanation: expect.any(String) });
      expect(milk?.risk ?? null).toBeNull();
    });
    it('also gives the risk when the product only has its label text', () => {
      const [pectin] = resolveProductIngredients({ ingredients: [], ingredientsText: 'lapte, gelifiant: pectină.' }).filter((i) => i.slug === 'pectina-e440');
      expect(pectin).toMatchObject({ risk: 'low', riskSource: expect.stringContaining('efsa') });
    });
  });
});
