import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { importOff, mapOffProduct, toRow, type OffProduct } from './import-off';
import { loadData } from './load-data';

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

describe('mapOffProduct', () => {
  it('maps name, first brand, quantity and the per-100 g nutrients; absent ones stay null', () => {
    expect(mapOffProduct(off)).toEqual({
      code: '4840001000014',
      name: 'Iaurt natural 2,5%',
      brand: 'Livada Verde',
      quantity: '400 g',
      unit: 'g',
      categorySlug: 'necunoscut',
      ingredientsText: 'lapte normalizat, culturi lactice vii',
      nutrients: {
        kcal: 63,
        fat: 2.5,
        sat: 1.6,
        sugar: 4.1,
        salt: 0.1,
        protein: 3.6,
        fiber: null,
        fruitVegPct: null,
      },
      photoPath: null,
      ingredientsPhotoPath: '',
      nutritionPhotoPath: null,
    });
  });

  it('prefers the Romanian name and ingredients, and per 100 ml when OFF says so', () => {
    const r = mapOffProduct({
      ...off,
      product_name_ro: 'Suc de mere',
      ingredients_text_ro: 'suc de mere 100%',
      nutrition_data_per: '100ml',
    });
    expect(r).toMatchObject({
      name: 'Suc de mere',
      ingredientsText: 'suc de mere 100%',
      unit: 'ml',
    });
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
});

describe('toRow', () => {
  it('adds OFF allergen and trace tags to what the matcher finds, traces never repeating an allergen', () => {
    const p = mapOffProduct(off)!;
    expect(
      toRow(p, {
        allergens_tags: ['en:gluten', 'en:milk', 'en:unknown'],
        traces_tags: ['en:nuts', 'en:milk'],
      }),
    ).toMatchObject({ allergens: ['Gluten', 'Lapte'], may_contain: ['Fructe cu coajă lemnoasă'] });
  });
});

describe('importOff and loadData against stubbed services', () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  beforeEach(() => {
    vi.stubEnv('SUPABASE_URL', 'http://db.test');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key');
    vi.stubEnv('AI_API_KEY', '');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    calls.length = 0;
  });

  const ru: OffProduct = {
    ...off,
    code: '4840001000021',
    lang: 'ru',
    ingredients_text: 'молоко, сахар',
    allergens_tags: ['en:milk'],
    traces_tags: ['en:nuts'],
  };
  const answer = (content: string, finish_reason = 'stop') =>
    Response.json({ choices: [{ finish_reason, message: { content } }] });

  // OFF returns the given products for the Romanian query only; the fake database keeps codes it has seen,
  // echoes only new rows like ignore-duplicates, and answers code lookups; the AI answers with `ai`.
  const stubFetch = (
    products: OffProduct[],
    existing = new Set<string>(),
    ai = () => answer('lapte, zahăr'),
  ) =>
    vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      if (url.includes('openfoodfacts')) {
        const lang = new URL(url).searchParams.get('languages_tags');
        return Response.json({ products: lang === 'en:romanian' ? products : [] });
      }
      if (url.includes('tokenharbor')) return ai();
      if (!init?.method) {
        const asked = decodeURIComponent(url)
          .match(/in\.\((.*)\)/)![1]!
          .split(',');
        return Response.json(asked.filter((c) => existing.has(c)).map((code) => ({ code })));
      }
      const rows = JSON.parse(String(init?.body)) as { code?: string }[];
      const fresh = rows.filter((r) => !r.code || !existing.has(r.code));
      fresh.forEach((r) => r.code && existing.add(r.code));
      return Response.json(fresh);
    });
  const aiCalls = () => calls.filter((c) => c.url.includes('tokenharbor'));
  const inserts = () =>
    calls.filter((c) => c.init?.method === 'POST' && c.url.startsWith('http://db.test'));
  const noPause = async () => {};

  it('inserts new codes as unverified OFF products, and a re-run inserts 0', async () => {
    stubFetch([off, { ...off, code: '4840001000017' }]);
    expect(await importOff(noPause)).toEqual({
      mapped: 1,
      inserted: 1,
      translated: 0,
      untranslated: 0,
    });
    const insert = inserts()[0]!;
    expect(insert.url).toBe('http://db.test/rest/v1/products?on_conflict=code');
    expect(new Headers(insert.init?.headers).get('prefer')).toContain(
      'resolution=ignore-duplicates',
    );
    expect(JSON.parse(String(insert.init?.body))[0]).toMatchObject({
      code: '4840001000014',
      status: 'unverified',
      source: 'Open Food Facts',
      category_slug: 'necunoscut',
      allergens: ['Lapte'],
      portion_label: '100 g',
    });
    expect(await importOff(noPause)).toEqual({
      mapped: 1,
      inserted: 0,
      translated: 0,
      untranslated: 0,
    });
  });

  it('asks OFF for products sold in Moldova in four queries that split by label language', async () => {
    stubFetch([off]);
    await importOff(noPause);
    const qs = calls
      .filter((c) => c.url.includes('openfoodfacts'))
      .map((c) => new URL(c.url).searchParams);
    expect(qs.map((q) => q.get('countries_tags'))).toEqual(Array(4).fill('en:moldova'));
    expect(qs.map((q) => q.get('languages_tags'))).toEqual([
      'en:romanian',
      '-en:romanian,en:russian',
      '-en:romanian,-en:russian,en:english',
      '-en:romanian,-en:russian,-en:english',
    ]);
  });

  it('translates Russian ingredients to Romanian once, merging OFF allergen tags', async () => {
    vi.stubEnv('AI_API_KEY', 'thk_live_test');
    stubFetch([ru]);
    expect(await importOff(noPause)).toEqual({
      mapped: 1,
      inserted: 1,
      translated: 1,
      untranslated: 0,
    });
    const req = aiCalls()[0]!;
    expect(new Headers(req.init?.headers).get('authorization')).toBe('Bearer thk_live_test');
    const body = JSON.parse(String(req.init?.body));
    expect(body.model).toBe('deepseek-v4.1-flash:free');
    expect(JSON.stringify(body.messages)).toContain('молоко, сахар');
    expect(JSON.parse(String(inserts()[0]!.init?.body))[0]).toMatchObject({
      code: '4840001000021',
      ingredients_text: 'lapte, zahăr',
      source: 'Open Food Facts (tradus automat)',
      status: 'unverified',
      allergens: ['Lapte'],
      may_contain: ['Fructe cu coajă lemnoasă'],
    });
    // A re-run finds the code already saved and does not pay for a second translation.
    expect(await importOff(noPause)).toMatchObject({ inserted: 0, translated: 0 });
    expect(aiCalls()).toHaveLength(1);
  });

  it('skips translation without AI_API_KEY and counts what it left out', async () => {
    stubFetch([off, ru]);
    expect(await importOff(noPause)).toEqual({
      mapped: 1,
      inserted: 1,
      translated: 0,
      untranslated: 1,
    });
    expect(aiCalls()).toEqual([]);
  });

  it('counts an unusable AI answer as untranslated and moves on', async () => {
    vi.stubEnv('AI_API_KEY', 'k');
    stubFetch([ru], new Set(), () => answer('lapte', 'length'));
    expect(await importOff(noPause)).toEqual({
      mapped: 0,
      inserted: 0,
      translated: 0,
      untranslated: 1,
    });
  });

  it('waits out AI rate limits, honouring retry-after', async () => {
    vi.stubEnv('AI_API_KEY', 'k');
    let n = 0;
    stubFetch([ru], new Set(), () =>
      n++ === 0
        ? new Response('slow down', { status: 429, headers: { 'retry-after': '7' } })
        : answer('lapte, zahăr'),
    );
    const pauses: number[] = [];
    expect(
      await importOff(async (ms) => {
        pauses.push(ms);
      }),
    ).toMatchObject({ translated: 1 });
    expect(pauses).toContain(7000);
  });

  it('saves what it has and stops when the AI key is refused, so a re-run can resume', async () => {
    vi.stubEnv('AI_API_KEY', 'bad');
    stubFetch([off, ru], new Set(), () => new Response('no', { status: 401 }));
    await expect(importOff(noPause)).rejects.toThrow(
      'Open Food Facts import incomplete (1 usable, 1 new, 0 translated; re-run to resume): translation: HTTP 401',
    );
    expect(inserts()).toHaveLength(1);
  });

  it('keeps paging while OFF returns full pages', async () => {
    const page = Array.from({ length: 100 }, () => off);
    let n = 0;
    vi.stubGlobal('fetch', async (url: string) =>
      Response.json(url.includes('openfoodfacts') ? { products: n++ === 0 ? page : [] } : []),
    );
    const pauses: number[] = [];
    await importOff(async (ms) => {
      pauses.push(ms);
    });
    expect([n, pauses.length]).toEqual([5, 4]); // two pages of the first query, one of each other query
  });

  it('stops at page 10 when a query has exactly 1000 results', async () => {
    const pages: number[] = [];
    vi.stubGlobal('fetch', async (url: string) => {
      if (!url.includes('openfoodfacts')) return Response.json([]);
      const q = new URL(url).searchParams;
      if (q.get('languages_tags') !== 'en:romanian') return Response.json({ products: [] });
      const page = Number(q.get('page'));
      pages.push(page);
      if (page > 10) return new Response(null, { status: 401 });
      return Response.json({ count: 1000, products: Array.from({ length: 100 }, () => off) });
    });
    expect(await importOff(noPause)).toMatchObject({ mapped: 1000, inserted: 0 });
    expect(pages).toEqual(Array.from({ length: 10 }, (_, page) => page + 1));
  });

  it('reports what it saved when OFF stays down, so a re-run can resume', async () => {
    let n = 0;
    vi.stubGlobal('fetch', async (url: string) => {
      if (!url.includes('openfoodfacts')) return Response.json([{}]);
      return n++ === 0
        ? Response.json({ count: 150, products: Array.from({ length: 100 }, () => off) })
        : new Response('busy', { status: 503 });
    });
    await expect(importOff(noPause)).rejects.toThrow(
      'Open Food Facts import incomplete (100 usable, 1 new, 0 translated; re-run to resume): en:romanian page 2: HTTP 503',
    );
  });

  it('retries OFF when it is busy', async () => {
    let n = 0;
    vi.stubGlobal('fetch', async (url: string) =>
      url.includes('openfoodfacts')
        ? n++ === 0
          ? new Response('busy', { status: 503 })
          : Response.json({ products: n === 2 ? [off] : [] })
        : Response.json([{}]),
    );
    const pauses: number[] = [];
    expect(
      await importOff(async (ms) => {
        pauses.push(ms);
      }),
    ).toMatchObject({ mapped: 1, inserted: 1 });
    expect(pauses).toEqual([6500, 6500, 6500, 6500]); // one retry, then the pause before each other query
  });

  it('requires the Supabase environment', async () => {
    vi.stubEnv('SUPABASE_URL', '');
    stubFetch([off]);
    await expect(importOff(noPause)).rejects.toThrow('SUPABASE_URL');
  });

  it('loadData writes nothing while data:check reports errors', async () => {
    stubFetch([]);
    await expect(
      loadData({ categories: [{ slug: 'x', name: 'X', scoreKind: 'nope' }], ingredients: [] }),
    ).rejects.toThrow('nothing loaded');
    expect(calls).toEqual([]);
  });

  it('loadData upserts categories and ingredients in database column names', async () => {
    stubFetch([]);
    const counts = await loadData({
      categories: [{ slug: 'iaurt', name: 'Iaurt', scoreKind: 'general' }],
      ingredients: [],
    });
    expect(counts).toEqual({ categories: 1, ingredients: 0 });
    expect(calls[0]?.url).toBe('http://db.test/rest/v1/categories?on_conflict=slug');
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual([
      { slug: 'iaurt', name: 'Iaurt', score_kind: 'general' },
    ]);
  });
});
