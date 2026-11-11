import { strict as assert } from 'node:assert';
import { LookupResponse } from '../_shared/contract.ts';
import { offFallback, type OffRow, type OffStore } from '../_lib/off.ts';
import { mapOffProduct } from '../_lib/offMapper.ts';
import { createHandler } from './index.ts';

const code = '4840001000014';
const device = 'c2000000-0000-4000-8000-000000000001';
const req = () =>
  new Request(`http://local/lookup?code=${code}`, { headers: { 'x-device-id': device } });
const offProduct = {
  product_name: 'Iaurt natural',
  brands: 'JLC',
  lang: 'ro',
  ingredients_text: 'lapte integral, culturi lactice',
  quantity: '400 g',
  nutriments: { 'energy-kcal_100g': 60, fat_100g: 3.2, sugars_100g: 4 },
  nova_group: 1,
};
const ok = (product: unknown) =>
  new Response(JSON.stringify({ status: 1, product }), { status: 200 });

function fakeStore() {
  const products = new Map<string, OffRow>();
  const misses = new Map<string, Date>();
  const store: OffStore = {
    recentMiss: async (c) => (misses.get(c)?.getTime() ?? 0) > Date.now() - 86_400_000,
    rememberMiss: async (c) => void misses.set(c, new Date()),
    // Mirrors upsert(..., { onConflict: 'code', ignoreDuplicates: true }).
    insert: async (row) => void (products.has(row.code) || products.set(row.code, row)),
  };
  return { products, misses, store };
}

async function setup(respond: () => Promise<Response>) {
  const { products, misses, store } = fakeStore();
  const urls: string[] = [];
  const agents: (string | null)[] = [];
  const fetchFn = async (url: string | URL | Request, init?: RequestInit) => {
    urls.push(String(url));
    agents.push(new Headers(init?.headers).get('user-agent'));
    return await respond();
  };
  const records = JSON.parse(
    await Deno.readTextFile(
      new URL('../../../apps/mobile/src/test/preview-data.json', import.meta.url),
    ),
  );
  const handler = createHandler({
    loadProduct: async () => {
      const row = products.get(code);
      if (!row) return null;
      const base = LookupResponse.parse({ status: 'found', ...records[0] });
      if (base.status !== 'found') throw new Error('fixture');
      const processing = row.nova_group
        ? { level: row.nova_group, source: row.nova_source! }
        : null;
      return { product: { ...base.product, code, name: row.name, processing }, score: base.score };
    },
    logEvent: async () => {},
    offFallback: (c) => offFallback(c, { fetch: fetchFn, store }),
  });
  return { handler, products, misses, urls, agents };
}

Deno.test('OFF hit is saved as unverified and returned found with processing', async () => {
  const t = await setup(async () => ok(offProduct));
  const body = LookupResponse.parse(await (await t.handler(req())).json());
  assert.equal(body.status, 'found');
  if (body.status !== 'found') return;
  assert.deepEqual(body.product.processing, { level: 1, source: 'off' });
  const row = t.products.get(code)!;
  assert.equal(row.status, 'unverified');
  assert.equal(row.source, 'Open Food Facts');
  assert.equal(row.added_by_device, null);
  assert.equal(row.category_slug, 'necunoscut');
  assert.deepEqual(row.allergens, ['Lapte']);
  assert.equal(t.urls.length, 1);
  assert.match(t.urls[0], new RegExp(`/api/v2/product/${code}\\?fields=`));
  assert.equal(t.agents[0], 'OkBite/1.0 (https://github.com/denis2224-dev/OkBite)');
});

Deno.test('OFF miss is not_found and remembered so the next lookup does not fetch', async () => {
  const t = await setup(async () => new Response('{"status":0}', { status: 404 }));
  for (let i = 0; i < 2; i++) {
    assert.deepEqual(await (await t.handler(req())).json(), { status: 'not_found' });
  }
  assert.equal(t.urls.length, 1);
  assert.ok(t.misses.has(code));
});

Deno.test('OFF product the mapper rejects counts as a remembered miss', async () => {
  const t = await setup(async () => ok({ brands: 'X' }));
  assert.deepEqual(await (await t.handler(req())).json(), { status: 'not_found' });
  assert.ok(t.misses.has(code));
  assert.equal(t.products.size, 0);
});

Deno.test('OFF timeout and 429 are not_found, fetched once and not remembered', async () => {
  for (const respond of [
    () => Promise.reject(new DOMException('timed out', 'TimeoutError')),
    async () => new Response('', { status: 429 }),
    async () => new Response('not json', { status: 200 }),
  ]) {
    const t = await setup(respond);
    const res = await t.handler(req());
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: 'not_found' });
    assert.equal(t.urls.length, 1);
    assert.equal(t.misses.size, 0);
  }
});

Deno.test('cache and insert failures never break the lookup', async () => {
  const fetchFn = async () => ok(offProduct);
  const broken: OffStore = {
    recentMiss: () => Promise.reject(new Error('db')),
    rememberMiss: () => Promise.reject(new Error('db')),
    insert: () => Promise.reject(new Error('db')),
  };
  assert.equal(await offFallback(code, { fetch: fetchFn, store: broken }), false);
  const miss = async () => new Response('', { status: 404 });
  assert.equal(await offFallback(code, { fetch: miss, store: broken }), false);
});

Deno.test('a failing read after the OFF save is not_found, never 502', async () => {
  let loads = 0;
  const handler = createHandler({
    loadProduct: async () => {
      if (loads++ === 0) return null;
      throw new Error('read failed');
    },
    logEvent: async () => {},
    offFallback: async () => true,
  });
  const res = await handler(req());
  assert.equal(res.status, 200);
  assert.deepEqual(LookupResponse.parse(await res.json()), { status: 'not_found' });
  assert.equal(loads, 2);
});

Deno.test('two parallel lookups for the same unknown code create one product', async () => {
  const t = await setup(async () => ok(offProduct));
  const [a, b] = await Promise.all([t.handler(req()), t.handler(req())]);
  assert.equal((await a.json()).status, 'found');
  assert.equal((await b.json()).status, 'found');
  assert.equal(t.products.size, 1);
});

Deno.test('mapper keeps missing nutrients null and nova outside 1..4 null', () => {
  const row = mapOffProduct({
    ...offProduct,
    nova_group: 5,
    nutriments: { fat_100g: -1, salt_100g: 'x' },
  })!;
  assert.equal(row.kcal, null);
  assert.equal(row.fat, null);
  assert.equal(row.salt, null);
  assert.equal(row.nova_group, null);
  assert.equal(row.nova_source, null);
  assert.equal(mapOffProduct({ ...offProduct, nova_group: 2.5 })!.nova_group, null);
  assert.equal(mapOffProduct({ ...offProduct, nova_group: 4 })!.nova_source, 'off');
});

Deno.test('mapper rejects missing name, brand or Romanian ingredients', () => {
  assert.equal(mapOffProduct({ ...offProduct, product_name: '' }), null);
  assert.equal(mapOffProduct({ ...offProduct, brands: undefined }), null);
  assert.equal(mapOffProduct({ ...offProduct, lang: 'en' }), null);
  assert.equal(mapOffProduct(null), null);
  assert.equal(mapOffProduct({ ...offProduct, product_name_ro: 'Iaurt RO' })!.name, 'Iaurt RO');
});
