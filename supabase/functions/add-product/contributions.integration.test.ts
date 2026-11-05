import { integrationTest } from '../_lib/integration.ts';
import { strict as assert } from 'node:assert';
import jpeg from 'npm:jpeg-js@0.4.4';
import { createHandler, handler as addHandler } from './index.ts';
import { createService } from './service.ts';
import { handler as reportHandler } from '../report/index.ts';
import { adminClient } from '../_lib/client.ts';
import { loadProduct } from '../_lib/db.ts';
import { publishPhoto, saveJpeg } from '../_lib/storage.ts';
import { LookupResponse } from '../_shared/contract.ts';

const seed = 'c2000000-0000-4000-8000-000000000001';
const post = (handler: (req: Request) => Promise<Response>, body: unknown, device: string) =>
  handler(
    new Request('http://local/', {
      method: 'POST',
      headers: { 'x-device-id': device },
      body: JSON.stringify(body),
    }),
  );

integrationTest('lost transaction response preserves the committed product, photos and usage event', async () => {
  const f = await fixture();
  const originalFetch = globalThis.fetch;
  let injected = false;
  try {
    globalThis.fetch = async (...args: Parameters<typeof fetch>) => {
      const response = await originalFetch(...args);
      if (String(args[0]).includes('/rpc/commit_product') && !injected) {
        injected = true;
        await response.body?.cancel();
        throw new Error('Simulated lost response after commit');
      }
      return response;
    };
    const response = await post(addHandler, f.input, f.device);
    assert.equal(response.status, 200);
    const result = LookupResponse.parse(await response.json());
    assert.equal(result.status, 'found');
    if (result.status !== 'found') throw new Error('Expected committed product');
    const photo = await fetch(result.product.labelImageUrl!);
    assert.equal(photo.status, 200);
    await photo.body?.cancel();
    assert.equal(await count(f.db, 'usage_events', 'device_id', f.device), 1);
  } finally {
    globalThis.fetch = originalFetch;
    await f.cleanup();
  }
});
const count = async (db: ReturnType<typeof adminClient>, table: string, column: string, value: string) => {
  const r = await db.from(table).select('*', { count: 'exact', head: true }).eq(column, value);
  assert.equal(r.error, null);
  return r.count;
};
async function fixture() {
  const db = adminClient();
  const device = crypto.randomUUID();
  const encoded =
    jpeg.encode({ width: 1, height: 1, data: new Uint8Array([255, 0, 0, 255]) }, 80).data;
  const photo = await saveJpeg(btoa(String.fromCharCode(...encoded)), device, 'ingredients');
  const input = {
    code: null as string | null,
    name: 'Produs test C6',
    brand: 'Test',
    quantity: '100 g',
    unit: 'g',
    categorySlug: 'iaurt',
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
    ingredientsText: 'lapte normalizat, zahăr. Poate conține susan.',
    photoPath: null as string | null,
    ingredientsPhotoPath: photo,
    nutritionPhotoPath: null,
  };
  const ids: string[] = [];
  return {
    db,
    device,
    photo,
    input,
    ids,
    async cleanup() {
      assert.equal((await db.from('reports').delete().eq('device_id', device)).error, null);
      const rows = await db.from('products').select('id').eq('added_by_device', device);
      assert.equal(rows.error, null);
      const allIds = new Set([...ids, ...(rows.data ?? []).map((r) => r.id)]);
      for (const id of allIds) {
        assert.equal((await db.from('reports').delete().eq('product_id', id)).error, null);
        assert.equal((await db.from('products').delete().eq('id', id)).error, null);
        assert.equal(
          (await db.storage.from('products').remove(
            ['front', 'ingredients', 'nutrition'].map((s) => `${id}/${s}.jpg`),
          )).error,
          null,
        );
      }
      assert.equal((await db.from('usage_events').delete().eq('device_id', device)).error, null);
      assert.equal((await db.storage.from('uploads').remove([photo])).error, null);
    },
  };
}
integrationTest('add-product is immediately visible, derives allergens, publishes photos and resolves concurrent duplicate codes', async () => {
  const f = await fixture();
  try {
    const responses = await Promise.all([
      post(addHandler, { ...f.input, code: '96385074' }, f.device),
      post(addHandler, { ...f.input, code: '96385074' }, f.device),
    ]);
    for (const r of responses) assert.equal(r.status, 200, await r.clone().text());
    const values = await Promise.all(
      responses.map(async (r) => LookupResponse.parse(await r.json())),
    );
    assert.equal(values[0].status, 'found');
    assert.deepEqual(values[0], values[1]);
    const result = values[0];
    if (result.status !== 'found') throw new Error('Expected product');
    assert.equal(result.product.status, 'unverified');
    assert.deepEqual(result.product.allergens, ['Lapte']);
    assert.deepEqual(result.product.mayContain, ['Susan']);
    assert.ok(
      result.product.labelImageUrl?.includes(`/products/${result.product.id}/ingredients.jpg`),
    );
    assert.equal(await count(f.db, 'products', 'code', '96385074'), 1);
    assert.equal(await count(f.db, 'usage_events', 'device_id', f.device), 1);
    const photo = await fetch(result.product.labelImageUrl!);
    assert.equal(photo.status, 200);
    await photo.body?.cancel();
    assert.equal((await post(addHandler, { ...f.input, code: '96385074' }, f.device)).status, 200);
    assert.equal(await count(f.db, 'usage_events', 'device_id', f.device), 1);
    assert.equal(
      (await f.db.from('products').update({ status: 'hidden' }).eq('id', result.product.id)).error,
      null,
    );
    assert.equal((await post(addHandler, { ...f.input, code: '96385074' }, f.device)).status, 409);
  } finally {
    await f.cleanup();
  }
});
integrationTest('foreign uploads, failed copies and rejected transactions leave no products, public photos or quota events', async () => {
  const f = await fixture();
  try {
    const foreign = f.photo.replace(f.device, crypto.randomUUID());
    assert.equal(
      (await post(addHandler, { ...f.input, ingredientsPhotoPath: foreign }, f.device)).status,
      400,
    );
    assert.equal(await count(f.db, 'usage_events', 'device_id', f.device), 0);
    for (
      const bad of [
        {
          ...f.input,
          photoPath: f.photo,
          ingredientsPhotoPath: `${f.device}/${crypto.randomUUID()}-ingredients.jpg`,
        },
        { ...f.input, categorySlug: 'unknown-c6-category' },
      ]
    ) {
      const id = crypto.randomUUID();
      f.ids.push(id);
      const handler = createHandler(
        createService({ adminClient, loadProduct, publishPhoto, newId: () => id }),
      );
      const response = await post(handler, bad, f.device);
      assert.equal(
        response.status,
        'categorySlug' in bad && bad.categorySlug === 'unknown-c6-category' ? 400 : 502,
      );
      assert.equal(await count(f.db, 'products', 'id', id), 0);
      assert.equal(await count(f.db, 'usage_events', 'device_id', f.device), 0);
      const files = await f.db.storage.from('products').list(id);
      assert.equal(files.error, null);
      assert.deepEqual(files.data, []);
    }
  } finally {
    await f.cleanup();
  }
});
integrationTest('quota admission is atomic under concurrency; 11th add and 21st report are rejected', async () => {
  const f = await fixture();
  try {
    const reservations = await Promise.all(
      Array.from(
        { length: 15 },
        () => f.db.rpc('reserve_usage', { p_device: f.device, p_kind: 'added' }),
      ),
    );
    for (const r of reservations) assert.equal(r.error, null);
    assert.equal(reservations.filter((r) => r.data !== null).length, 10);
    assert.equal((await post(addHandler, f.input, f.device)).status, 429);
    assert.equal(
      (await post(reportHandler, { productId: seed, message: 'xx' }, f.device)).status,
      400,
    );
    const reports = await Promise.all(
      Array.from(
        { length: 25 },
        () => post(reportHandler, { productId: seed, message: 'Raport de test C6' }, f.device),
      ),
    );
    assert.equal(reports.filter((r) => r.status === 200).length, 20);
    assert.equal(reports.filter((r) => r.status === 429).length, 5);
    for (const r of reports) await r.body?.cancel();
    assert.equal(await count(f.db, 'reports', 'device_id', f.device), 20);
    assert.equal((await f.db.from('reports').delete().eq('device_id', f.device)).error, null);
  } finally {
    await f.cleanup();
  }
});
