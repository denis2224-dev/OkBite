import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { importOff, mapOffProduct, type OffProduct } from './import-off';
import { loadData } from './load-data';

const off: OffProduct = {
  code: '4840001000014', product_name: 'Iaurt natural 2,5%', brands: 'Livada Verde, Alt brand', quantity: '400 g',
  ingredients_text: 'lapte normalizat, culturi lactice vii', lang: 'ro', nutrition_data_per: '100g',
  nutriments: { 'energy-kcal_100g': 63, fat_100g: 2.5, 'saturated-fat_100g': 1.6, sugars_100g: 4.1, salt_100g: 0.1, proteins_100g: 3.6 },
};

describe('mapOffProduct', () => {
  it('maps name, first brand, quantity and the per-100 g nutrients; absent ones stay null', () => {
    expect(mapOffProduct(off)).toEqual({
      code: '4840001000014', name: 'Iaurt natural 2,5%', brand: 'Livada Verde', quantity: '400 g', unit: 'g',
      categorySlug: 'necunoscut', ingredientsText: 'lapte normalizat, culturi lactice vii',
      nutrients: { kcal: 63, fat: 2.5, sat: 1.6, sugar: 4.1, salt: 0.1, protein: 3.6, fiber: null, fruitVegPct: null },
      photoPath: null, ingredientsPhotoPath: '', nutritionPhotoPath: null,
    });
  });

  it('prefers the Romanian name and ingredients, and per 100 ml when OFF says so', () => {
    const r = mapOffProduct({ ...off, product_name_ro: 'Suc de mere', ingredients_text_ro: 'suc de mere 100%', nutrition_data_per: '100ml' });
    expect(r).toMatchObject({ name: 'Suc de mere', ingredientsText: 'suc de mere 100%', unit: 'ml' });
  });

  it.each([
    ['a non-Moldovan code', { code: '5901234123457' }],
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
});

describe('importOff and loadData against stubbed services', () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  beforeEach(() => {
    vi.stubEnv('SUPABASE_URL', 'http://db.test');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key');
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); calls.length = 0; });

  // OFF returns the given page; the fake database keeps codes it has seen and echoes only new rows, like ignore-duplicates.
  const stubFetch = (products: OffProduct[], existing = new Set<string>()) =>
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (url.includes('openfoodfacts')) return Response.json({ products });
      const rows = JSON.parse(String(init?.body)) as { code?: string }[];
      const fresh = rows.filter((r) => !r.code || !existing.has(r.code));
      fresh.forEach((r) => r.code && existing.add(r.code));
      return Response.json(fresh);
    });

  it('inserts new codes as unverified OFF products, and a re-run inserts 0', async () => {
    stubFetch([off, { ...off, code: '4840001000017' }]);
    expect(await importOff()).toEqual({ mapped: 1, inserted: 1 });
    const insert = calls.find((c) => c.url.startsWith('http://db.test'))!;
    expect(insert.url).toBe('http://db.test/rest/v1/products?on_conflict=code');
    expect(new Headers(insert.init?.headers).get('prefer')).toContain('resolution=ignore-duplicates');
    expect(JSON.parse(String(insert.init?.body))[0]).toMatchObject({
      code: '4840001000014', status: 'unverified', source: 'Open Food Facts', category_slug: 'necunoscut',
      allergens: ['Lapte'], portion_label: '100 g',
    });
    expect(await importOff()).toEqual({ mapped: 1, inserted: 0 });
  });

  it('keeps paging while OFF returns full pages', async () => {
    const page = Array.from({ length: 100 }, () => off);
    let n = 0;
    vi.stubGlobal('fetch', async (url: string) =>
      Response.json(url.includes('openfoodfacts') ? { products: n++ === 0 ? page : [] } : []));
    const pauses: number[] = [];
    await importOff(async (ms) => { pauses.push(ms); });
    expect([n, pauses.length]).toEqual([2, 1]);
  });

  it('stops at page 10 when a prefix has exactly 1000 results', async () => {
    const pages: number[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      if (!url.includes('openfoodfacts')) return Response.json([]);
      const page = Number(new URL(url).searchParams.get('page'));
      pages.push(page);
      if (page > 10) return new Response(null, { status: 401 });
      return Response.json({ count: 1000, products: Array.from({ length: 100 }, () => off) });
    });
    expect(await importOff(async () => {})).toEqual({ mapped: 1000, inserted: 0 });
    expect(pages).toEqual(Array.from({ length: 10 }, (_, page) => page + 1));
  });

  it('splits a code prefix with more than 1000 results, because OFF refuses deeper pages', async () => {
    const asked: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      if (!url.includes('openfoodfacts')) return Response.json([{}]);
      const tag = new URL(url).searchParams.get('codes_tags')!;
      asked.push(tag);
      if (tag === '484xxxxxxxxxx') return Response.json({ count: 1726, products: [off] });
      return Response.json({ count: tag === '4840xxxxxxxxx' ? 1 : 0, products: tag === '4840xxxxxxxxx' ? [off] : [] });
    });
    expect(await importOff(async () => {})).toEqual({ mapped: 1, inserted: 1 });
    expect(asked).toEqual(['484xxxxxxxxxx', ...Array.from({ length: 10 }, (_, d) => `484${d}xxxxxxxxx`)]);
  });

  it('keeps importing other prefixes when OFF stays down for one, then reports it', async () => {
    vi.stubGlobal('fetch', async (url: string) => {
      if (!url.includes('openfoodfacts')) return Response.json([{}]);
      const tag = new URL(url).searchParams.get('codes_tags')!;
      if (tag === '484xxxxxxxxxx') return Response.json({ count: 1726, products: [] });
      if (tag === '4841xxxxxxxxx') return new Response('busy', { status: 503 });
      return Response.json({ count: 1, products: tag === '4840xxxxxxxxx' ? [off] : [] });
    });
    await expect(importOff(async () => {})).rejects.toThrow(
      'Open Food Facts import incomplete (1 usable, 1 new; re-run to resume): 4841xxxxxxxxx page 1: HTTP 503');
  });

  it('retries OFF when it is busy', async () => {
    let n = 0;
    vi.stubGlobal('fetch', async (url: string) => url.includes('openfoodfacts')
      ? (n++ === 0 ? new Response('busy', { status: 503 }) : Response.json({ products: [off] }))
      : Response.json([{}]));
    const pauses: number[] = [];
    expect(await importOff(async (ms) => { pauses.push(ms); })).toEqual({ mapped: 1, inserted: 1 });
    expect(pauses).toEqual([6500]);
  });

  it('requires the Supabase environment', async () => {
    vi.stubEnv('SUPABASE_URL', '');
    stubFetch([off]);
    await expect(importOff()).rejects.toThrow('SUPABASE_URL');
  });

  it('loadData writes nothing while data:check reports errors', async () => {
    stubFetch([]);
    await expect(loadData({ categories: [{ slug: 'x', name: 'X', scoreKind: 'nope' }], ingredients: [] }))
      .rejects.toThrow('nothing loaded');
    expect(calls).toEqual([]);
  });

  it('loadData upserts categories and ingredients in database column names', async () => {
    stubFetch([]);
    const counts = await loadData({ categories: [{ slug: 'iaurt', name: 'Iaurt', scoreKind: 'general' }], ingredients: [] });
    expect(counts).toEqual({ categories: 1, ingredients: 0 });
    expect(calls[0]?.url).toBe('http://db.test/rest/v1/categories?on_conflict=slug');
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual([{ slug: 'iaurt', name: 'Iaurt', score_kind: 'general' }]);
  });
});
