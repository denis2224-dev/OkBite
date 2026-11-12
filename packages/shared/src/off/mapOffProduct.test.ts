import { describe, expect, it } from 'vitest';
import { computeScore } from '../score';
import { OFF_FIELDS, mapOffProduct, toRow, type AdditiveKey, type OffProduct } from './mapOffProduct';

const off: OffProduct = {
  code: '4840001000014',
  product_name: 'Iaurt natural 2,5%',
  brands: 'Livada Verde, Alt brand',
  quantity: '400 g',
  ingredients_text: 'lapte normalizat, culturi lactice vii',
  lang: 'ro',
  nutrition_data_per: '100g',
  nutriments: {
    'energy-kcal_100g': 63,
    fat_100g: 2.5,
    'saturated-fat_100g': 1.6,
    sugars_100g: 4.1,
    salt_100g: 0.1,
    proteins_100g: 3.6,
  },
};
const kb: AdditiveKey[] = [
  { slug: 'acid-citric-e330', aliases: ['acid citric', 'e330', 'e 330'], group: 'add' },
  { slug: 'colorant-caramel-e150d', aliases: ['caramel', 'e150d', 'e 150d'], group: 'add' },
  { slug: 'not-an-additive', aliases: ['e999'], group: 'base' },
];

describe('mapOffProduct fixtures (N22)', () => {
  it('maps a full product: per-100 g nutrients, allergens and traces, processing, additives, source', () => {
    expect(
      mapOffProduct(
        {
          ...off,
          allergens_tags: ['en:milk'],
          traces_tags: ['en:nuts', 'en:milk'],
          nova_group: 3,
          additives_tags: ['en:e330', 'en:e150d', 'en:e330'],
        },
        kb,
      ),
    ).toEqual({
      code: '4840001000014',
      name: 'Iaurt natural 2,5%',
      brand: 'Livada Verde',
      quantity: '400 g',
      unit: 'g',
      categorySlug: 'necunoscut',
      ingredientsText: 'lapte normalizat, culturi lactice vii',
      nutrients: { kcal: 63, fat: 2.5, sat: 1.6, sugar: 4.1, salt: 0.1, protein: 3.6, fiber: null, fruitVegPct: null },
      photoPath: null,
      ingredientsPhotoPath: '',
      nutritionPhotoPath: null,
      allergens: ['Lapte'],
      mayContain: ['Fructe cu coajă lemnoasă'],
      processing: { level: 3, source: 'off' },
      additives: [
        { code: 'E330', slug: 'acid-citric-e330' },
        { code: 'E150d', slug: 'colorant-caramel-e150d' },
      ],
      source: 'Open Food Facts (ODbL)',
      sourceUrl: 'https://world.openfoodfacts.org/product/4840001000014',
    });
  });

  it('maps a product with no nutrition: every nutrient null and the score unavailable', () => {
    const p = mapOffProduct({ ...off, nutriments: null })!;
    expect(Object.values(p.nutrients).every((v) => v === null)).toBe(true);
    expect(computeScore(p.nutrients, 'general', p.ingredientsText).grade).toBe('unavailable');
  });

  it('maps a per-serving-only product, never taking serving values as per 100 g', () => {
    const p = mapOffProduct({
      ...off,
      nutrition_data_per: 'serving',
      nutriments: { 'energy-kcal_serving': 120, sugars_serving: 8, salt_serving: 0.2 },
    })!;
    expect(p.nutrients).toMatchObject({ kcal: null, sugar: null, salt: null });
    expect(computeScore(p.nutrients, 'general', p.ingredientsText).grade).toBe('unavailable');
    // OFF's _100g fields are normalized even when the label was entered per serving.
    expect(
      mapOffProduct({ ...off, nutrition_data_per: 'serving', nutriments: { sugars_100g: 10, sugars_serving: 2 } })
        ?.nutrients.sugar,
    ).toBe(10);
  });

  it.each([undefined, null, 0, 5, 2.5, '4', Number.NaN])('leaves processing null for nova_group %j', (g) => {
    expect(mapOffProduct({ ...off, nova_group: g })?.processing).toBeNull();
    expect(toRow(mapOffProduct({ ...off, nova_group: g })!)).toMatchObject({ nova_group: null, nova_source: null });
  });

  it.each([1, 2, 3, 4])('maps nova_group %i to processing from off', (g) => {
    expect(mapOffProduct({ ...off, nova_group: g })?.processing).toEqual({ level: g, source: 'off' });
    expect(toRow(mapOffProduct({ ...off, nova_group: g })!)).toMatchObject({ nova_group: g, nova_source: 'off' });
  });

  it('keeps an unknown additive with slug null, matching only the additive group', () => {
    expect(mapOffProduct({ ...off, additives_tags: ['en:e1442', 'en:e999', 'en:not-an-e'] }, kb)?.additives).toEqual([
      { code: 'E1442', slug: null },
      { code: 'E999', slug: null },
    ]);
    expect(mapOffProduct({ ...off, additives_tags: ['en:e330'] })?.additives).toEqual([{ code: 'E330', slug: null }]);
  });

  it('asks OFF for every field it reads', () => {
    for (const f of ['code', 'nutriments', 'allergens_tags', 'traces_tags', 'nova_group', 'additives_tags']) {
      expect(OFF_FIELDS.split(',')).toContain(f);
    }
  });
});

describe('mapOffProduct rules moved from import-off', () => {
  it('prefers the Romanian name and ingredients, and per 100 ml when OFF says so', () => {
    const r = mapOffProduct({ ...off, product_name_ro: 'Suc de mere', ingredients_text_ro: 'suc de mere 100%', nutrition_data_per: '100ml' });
    expect(r).toMatchObject({ name: 'Suc de mere', ingredientsText: 'suc de mere 100%', unit: 'ml' });
    expect(mapOffProduct({ ...off, nutrition_data_per: '100g', product_quantity_unit: 'ml' })?.unit).toBe('ml');
  });

  it('keeps imported products sold in Moldova, not only 484 codes', () => {
    expect(mapOffProduct({ ...off, code: '5901234123457' })?.code).toBe('5901234123457');
  });

  it.each([
    ['a failing checksum', { code: '4840001000017' }],
    ['no name', { product_name: ' ' }],
    ['no brand', { brands: undefined }],
    ['no ingredients text', { ingredients_text: '' }],
    ['ingredients text that is not Romanian', { lang: 'en', ingredients_text: 'peanuts, sugar' }],
  ])('returns null for %s', (_why, over) => expect(mapOffProduct({ ...off, ...over })).toBeNull());

  it('ignores negative or non-numeric nutrient values', () => {
    const r = mapOffProduct({ ...off, nutriments: { sugars_100g: '4', salt_100g: -1 } });
    expect(r?.nutrients).toMatchObject({ sugar: null, salt: null });
  });

  it('returns null rather than throwing for malformed inputs, and accepts OFF nulls', () => {
    for (const raw of [null, 'x', { code: 4840001000014 }, { ...off, allergens_tags: 'en:milk' }]) {
      expect(() => mapOffProduct(raw)).not.toThrow();
      expect(mapOffProduct(raw)).toBeNull();
    }
    expect(mapOffProduct({ ...off, product_name_ro: null, ingredients_text_ro: null, quantity: null, nutriments: null })).not.toBeNull();
  });

  it('maps Coca-Cola Zero and OFF category tags to real OkBite categories so beverage sweeteners are penalized', () => {
    const cola = mapOffProduct({
      code: '5449000131805',
      product_name: 'Coca-Cola Zero Zahăr',
      brands: 'Coca-Cola',
      quantity: '500 ml',
      nutrition_data_per: '100ml',
      categories_tags: ['en:beverages', 'en:carbonated-drinks', 'en:sodas', 'en:colas'],
      lang: 'ro',
      ingredients_text_ro:
        'Apă, dioxid de carbon, colorant E150d, acidifiant acid fosforic, îndulcitori (ciclamați, acesulfam K, aspartam), corector de aciditate citrați de sodiu, arome naturale, aromă cafeină.',
      nutriments: { 'energy-kcal_100g': 0.2, fat_100g: 0, 'saturated-fat_100g': 0, sugars_100g: 0, salt_100g: 0.02, proteins_100g: 0 },
    })!;
    expect(cola.categorySlug).toBe('bauturi-racoritoare');
    expect(cola.unit).toBe('ml');
    const scored = computeScore(cola.nutrients, 'beverage', cola.ingredientsText);
    expect([scored.score, scored.letter, scored.grade]).toEqual([53, 'C', 'medium']);
    expect(scored.reasons).toContainEqual({ tone: 'bad', title: 'Conține îndulcitori', detail: 'Îndulcitori fără calorii în ingrediente' });
  });
});

describe('toRow', () => {
  it('adds OFF allergen and trace tags to what the matcher finds, traces never repeating an allergen', () => {
    const p = mapOffProduct({ ...off, allergens_tags: ['en:gluten', 'en:milk', 'en:unknown'], traces_tags: ['en:nuts', 'en:milk'] })!;
    expect(toRow(p)).toMatchObject({
      code: '4840001000014',
      status: 'unverified',
      allergens: ['Gluten', 'Lapte'],
      may_contain: ['Fructe cu coajă lemnoasă'],
      portion_label: '100 g',
      source: 'Open Food Facts (ODbL)',
    });
    expect(toRow(p, 'Open Food Facts (ODbL, tradus automat)').source).toBe('Open Food Facts (ODbL, tradus automat)');
  });
});
