import { strict as assert } from 'node:assert';
import { integrationTest } from '../_lib/integration.ts';
import { EnrichProductRequest, LookupResponse } from '../_shared/contract.ts';
import { fixture, found } from '../add-product/retry-fixture.ts';
import { handler } from './index.ts';

async function setup() {
  const f = await fixture();
  const nutrients = f.input.nutrients; // Existing DEMO fixture, not new nutrition data.
  f.input.nutrients = { kcal: null, fat: null, sat: null, sugar: null, salt: null,
    protein: null, fiber: null, fruitVegPct: null };
  const product = await found(await f.submit());
  const uploads: string[] = [];
  const photo = async () => {
    const path = `${f.device}/${crypto.randomUUID()}-nutrition.jpg`;
    assert.equal((await f.db.storage.from('uploads').copy(f.input.ingredientsPhotoPath, path)).error, null);
    uploads.push(path);
    return path;
  };
  const input = EnrichProductRequest.parse({
    productId: product.id, unit: 'g', nutrients, nutritionPhotoPath: await photo(),
  });
  return { ...f, product, photo, input,
    enrich: (body = input, device = f.device) => handler(new Request('http://local/enrich-product', {
      method: 'POST', headers: { 'x-device-id': device }, body: JSON.stringify(body),
    })),
    async cleanup() {
      const files = await f.db.storage.from('products').list(product.id);
      assert.equal(files.error, null);
      if (files.data?.length) assert.equal((await f.db.storage.from('products').remove(
        files.data.map((file) => `${product.id}/${file.name}`),
      )).error, null);
      assert.equal((await f.db.storage.from('uploads').remove(uploads)).error, null);
      await f.cleanup();
    },
  };
}

integrationTest('U2b enrich fills nulls, preserves identity/status, and recovers retry at full quota', async () => {
  const f = await setup();
  try {
    f.input.productId = f.input.productId.toUpperCase();
    const first = await f.enrich();
    assert.equal(first.status, 200, await first.clone().text());
    const saved = LookupResponse.parse(await first.json());
    if (saved.status !== 'found') throw new Error('Expected enriched product');
    assert.equal(saved.product.id, f.product.id);
    assert.equal(saved.product.status, 'unverified');
    assert.deepEqual(saved.product.nutrients, f.input.nutrients);
    assert.equal(saved.product.nutrients.fiber, null);
    assert.equal(saved.product.ingredientsText, f.product.ingredientsText);
    const row = await f.db.from('products').select('nutrition_photo_path').eq('id', f.product.id).single();
    assert.equal(row.error, null);
    assert.ok(row.data?.nutrition_photo_path);
    const photo = await f.db.storage.from('products').download(row.data!.nutrition_photo_path);
    assert.equal(photo.error, null);
    for (let i = 0; i < 8; i++) assert.equal((await f.db.rpc('reserve_usage', {
      p_device: f.device, p_kind: 'added',
    })).error, null);
    const retry = await f.enrich();
    assert.equal(retry.status, 200);
    assert.deepEqual(await retry.json(), saved);
  } finally { await f.cleanup(); }
});

integrationTest('U2b new second enrichment, verified/partial products and foreign devices conflict', async () => {
  const f = await setup();
  try {
    for (let i = 0; i < 9; i++) await f.db.rpc('reserve_usage', { p_device: f.device, p_kind: 'added' });
    const changes = [{ status: 'verified' }, { status: 'unverified', fat: 0 }];
    for (const change of changes) {
      assert.equal((await f.db.from('products').update(change).eq('id', f.product.id)).error, null);
      assert.equal((await f.enrich()).status, 409);
    }
    assert.equal((await f.db.from('products').update({ fat: null }).eq('id', f.product.id)).error, null);
    const foreign = crypto.randomUUID();
    assert.equal((await f.enrich({ ...f.input, nutritionPhotoPath:
      `${foreign}/${crypto.randomUUID()}-nutrition.jpg` }, foreign)).status, 409);
    assert.equal((await f.db.from('usage_events').delete().eq('device_id', f.device).is('product_id', null)).error, null);
    await found(await f.enrich());
    assert.equal((await f.enrich({ ...f.input, nutritionPhotoPath: await f.photo() })).status, 409);
  } finally { await f.cleanup(); }
});

integrationTest('U2b rejects foreign/missing photos and malformed bodies without consuming quota', async () => {
  const f = await setup();
  try {
    for (const path of [`${crypto.randomUUID()}/${crypto.randomUUID()}-nutrition.jpg`,
      `${f.device}/${crypto.randomUUID()}-nutrition.jpg`]) {
      assert.equal((await f.enrich({ ...f.input, nutritionPhotoPath: path })).status, 400);
    }
    const bad = await handler(new Request('http://local/', {
      method: 'POST', headers: { 'x-device-id': f.device }, body: '{}',
    }));
    assert.equal(bad.status, 400);
    const events = await f.db.from('usage_events').select('id').eq('device_id', f.device);
    assert.equal(events.data?.length, 1); // Only the original add.
    for (let i = 0; i < 9; i++) await f.db.rpc('reserve_usage', { p_device: f.device, p_kind: 'added' });
    assert.equal((await f.enrich()).status, 429);
  } finally { await f.cleanup(); }
});

integrationTest('U2b simultaneous identical enrichments return one product and one quota charge', async () => {
  const f = await setup();
  try {
    const responses = await Promise.all([f.enrich(), f.enrich()]);
    const values = await Promise.all(responses.map(found));
    assert.deepEqual(values[0], values[1]);
    const events = await f.db.from('usage_events').select('id').eq('device_id', f.device);
    assert.equal(events.data?.length, 2);
    const files = await f.db.storage.from('products').list(f.product.id);
    assert.equal(files.data?.filter((file) => file.name.startsWith('nutrition-')).length, 1);
  } finally { await f.cleanup(); }
});

integrationTest('U2b a lost commit response recovers the receipt and keeps the committed photo', async () => {
  const f = await setup();
  const original = globalThis.fetch;
  let lost = false;
  try {
    globalThis.fetch = async (...args) => {
      const response = await original(...args);
      if (!lost && String(args[0]).endsWith('/rpc/enrich_product') &&
        typeof args[1]?.body === 'string' && JSON.parse(args[1].body).p_nutrients) {
        lost = true;
        await response.body?.cancel();
        throw new Error('Simulated lost enrichment response');
      }
      return response;
    };
    const saved = await found(await f.enrich());
    assert.equal(lost, true);
    assert.equal(saved.id, f.product.id);
    assert.deepEqual(await found(await f.enrich()), saved);
  } finally { globalThis.fetch = original; await f.cleanup(); }
});

integrationTest('U2b hide tombstones a prepared enrichment before a delayed copy publishes', async () => {
  const f = await setup();
  let actor: string | undefined;
  try {
    const user = await f.db.auth.admin.createUser({
      email: `enrich-${crypto.randomUUID()}@example.invalid`, email_confirm: true,
    });
    assert.equal(user.error, null);
    actor = user.data.user!.id;
    assert.equal((await f.db.from('moderators').insert({ user_id: actor })).error, null);
    const event = await f.db.rpc('reserve_usage', { p_device: f.device, p_kind: 'added' });
    assert.equal(event.error, null);
    const suffix = 'nutrition-0123456789abcdef0123';
    assert.equal((await f.db.rpc('enrich_product', {
      p_id: f.product.id, p_device: f.device, p_upload: f.input.nutritionPhotoPath,
      p_suffix: suffix, p_event: event.data,
    })).error, null);
    assert.equal((await f.db.rpc('moderate_product', {
      p_actor: actor, p_action: 'hide', p_id: f.product.id, p_reason: 'Local late-copy test',
    })).error, null);
    const late = await f.db.storage.from('uploads').copy(f.input.nutritionPhotoPath,
      `${f.product.id}/${suffix}.jpg`, { destinationBucket: 'products' });
    assert.ok(late.error, 'hidden enrichment must reject a copy even before its worker resumes');
    assert.equal((await f.enrich()).status, 409);
  } finally {
    await f.cleanup();
    await f.db.from('photo_removals').delete().eq('product_id', f.product.id);
    if (actor) {
      await f.db.from('moderators').delete().eq('user_id', actor);
      await f.db.auth.admin.deleteUser(actor);
    }
  }
});
