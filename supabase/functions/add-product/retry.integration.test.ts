import { strict as assert } from 'node:assert';
import jpeg from 'npm:jpeg-js@0.4.4';
import { integrationTest } from '../_lib/integration.ts';
import { adminClient } from '../_lib/client.ts';
import { publishPhoto, saveJpeg } from '../_lib/storage.ts';
import { loadProduct } from '../_lib/db.ts';
import { AddProductRequest, LookupResponse } from '../_shared/contract.ts';
import { createHandler } from './index.ts';
import { createService } from './service.ts';

async function fixture() {
  const db = adminClient();
  const device = crypto.randomUUID();
  const attemptedIds: string[] = [];
  const handler = createHandler(
    createService({
      adminClient,
      loadProduct,
      publishPhoto,
      newId: () => {
        const id = crypto.randomUUID();
        attemptedIds.push(id);
        return id;
      },
    }),
  );
  const encoded = jpeg.encode({ width: 1, height: 1, data: new Uint8Array(4) }, 80).data;
  const path = await saveJpeg(btoa(String.fromCharCode(...encoded)), device, 'ingredients');
  const input = AddProductRequest.parse({
    code: null,
    name: 'Test retry',
    brand: 'Test',
    quantity: '100 g',
    unit: 'g',
    categorySlug: 'iaurt',
    ingredientsText: 'lapte',
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
    ingredientsPhotoPath: path,
    nutritionPhotoPath: null,
  });
  const submit = () =>
    handler(
      new Request('http://local/add-product', {
        method: 'POST',
        headers: { 'x-device-id': device },
        body: JSON.stringify(input),
      }),
    );
  const products = () => db.from('products').select('id').eq('added_by_device', device);
  return {
    db,
    device,
    input,
    submit,
    products,
    attemptedIds,
    async cleanup() {
      const rows = await products();
      assert.equal(rows.error, null);
      for (const row of rows.data ?? []) {
        assert.equal((await db.from('products').delete().eq('id', row.id)).error, null);
        assert.equal(
          (
            await db.storage
              .from('products')
              .remove([
                `${row.id}/front.jpg`,
                `${row.id}/ingredients.jpg`,
                `${row.id}/nutrition.jpg`,
              ])
          ).error,
          null,
        );
      }
      assert.equal((await db.from('usage_events').delete().eq('device_id', device)).error, null);
      assert.equal((await db.storage.from('uploads').remove([path])).error, null);
    },
  };
}
async function found(response: Response) {
  assert.equal(response.status, 200, await response.clone().text());
  const result = LookupResponse.parse(await response.json());
  assert.equal(result.status, 'found');
  if (result.status !== 'found') throw new Error('Expected saved contribution');
  return result.product;
}

integrationTest(
  'retrying a lost HTTP response without a barcode returns one contribution',
  async () => {
    const f = await fixture();
    try {
      const lost = await f.submit();
      assert.equal(lost.status, 200);
      await lost.body?.cancel(); // The shopper never received the saved product/receipt.
      const persisted = await f.products();
      assert.equal(persisted.error, null);
      f.input.name = 'Edited retry';
      const retry = await found(await f.submit());
      assert.equal(retry.id, persisted.data?.[0]?.id);
      assert.equal(retry.name, 'Test retry');
      assert.equal((await f.products()).data?.length, 1);
      const events = await f.db.from('usage_events').select('id').eq('device_id', f.device);
      assert.equal(events.error, null);
      assert.equal(events.data?.length, 1);
    } finally {
      await f.cleanup();
    }
  },
);

integrationTest(
  'concurrent retries of one upload publish one product and remove loser photos',
  async () => {
    const f = await fixture();
    try {
      const results = await Promise.all([f.submit(), f.submit()]);
      const values = await Promise.all(results.map(found));
      assert.equal(values[0].id, values[1].id);
      assert.equal((await f.products()).data?.length, 1);
      const events = await f.db.from('usage_events').select('id').eq('device_id', f.device);
      assert.equal(events.error, null);
      assert.equal(events.data?.length, 1);
      const photo = await fetch(values[0].labelImageUrl!);
      assert.equal(photo.status, 200);
      await photo.body?.cancel();
      for (const id of f.attemptedIds.filter((id) => id !== values[0].id)) {
        const files = await f.db.storage.from('products').list(id);
        assert.equal(files.error, null);
        assert.deepEqual(files.data, []);
      }
    } finally {
      await f.cleanup();
    }
  },
);

integrationTest(
  'a persisted upload receipt recovers at full quota and cannot revive a hidden product',
  async () => {
    const f = await fixture();
    try {
      const saved = await found(await f.submit());
      for (let i = 0; i < 9; i++) {
        const event = await f.db.rpc('reserve_usage', { p_device: f.device, p_kind: 'added' });
        assert.equal(event.error, null);
        assert.notEqual(event.data, null);
      }
      assert.equal((await found(await f.submit())).id, saved.id);
      assert.equal(
        (await f.db.from('products').update({ status: 'hidden' }).eq('id', saved.id)).error,
        null,
      );
      const retry = await f.submit();
      assert.equal(retry.status, 409);
      assert.equal((await retry.json()).error, 'duplicate');
      assert.equal((await f.products()).data?.length, 1);
    } finally {
      await f.cleanup();
    }
  },
);
