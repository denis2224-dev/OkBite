import { describe, expect, it } from 'vitest';
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
});

