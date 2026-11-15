import { describe, expect, it } from 'vitest';
import { patchFor } from './backfill-off-nutrients';

const line = (code: string, nutrition: object) =>
  JSON.stringify({
    code,
    product_name: 'Coca-Cola',
    nutriments: {},
    nutrition: { aggregated_set: nutrition },
  });
const cola = {
  preparation: 'as_sold',
  nutrients: {
    'energy-kj': { source_per: '100ml', source: 'packaging', value: 180 },
    sugars: { source_per: '100ml', source: 'packaging', value: 10.6 },
    fiber: { source_per: '100g', source: 'estimate', value: 0 },
  },
};

describe('patchFor', () => {
  it('sets only the nutrients OFF declares, for target codes only', () => {
    const codes = new Set(['5449000000996']);
    expect(patchFor(line('5449000000996', cola), codes)).toEqual({
      code: '5449000000996',
      patch: { kcal: 43, sugar: 10.6 },
    });
    expect(patchFor(line('5449000000286', cola), codes)).toBeNull();
    expect(patchFor(line('5449000000996', { nutrients: {} }), codes)).toBeNull();
    expect(patchFor('{"code":"5449000000996", broken', codes)).toBeNull();
  });
});

describe('patchFor --categories', () => {
  it('sets a category from OFF tags and leaves rows that still map to necunoscut alone', () => {
    const codes = new Set(['3017620422003']);
    const nutella = (tags: string[]) =>
      JSON.stringify({ code: '3017620422003', product_name: 'Nutella', categories_tags: tags });
    expect(patchFor(nutella(['en:sweet-spreads']), codes, 'categories')).toEqual({
      code: '3017620422003',
      patch: { category_slug: 'ciocolata-si-dulciuri' },
    });
    expect(patchFor(nutella(['en:groceries']), codes, 'categories')).toBeNull();
  });
});
