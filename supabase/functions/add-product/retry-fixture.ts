import { strict as assert } from 'node:assert';
import jpeg from 'npm:jpeg-js@0.4.4';
import { adminClient } from '../_lib/client.ts';
import { publishPhoto, saveJpeg } from '../_lib/storage.ts';
import { loadProduct } from '../_lib/db.ts';
import { AddProductRequest, LookupResponse } from '../_shared/contract.ts';
import { createHandler } from './index.ts';
import { createService } from './service.ts';

export async function fixture() {
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
      assert.equal(
        (await db.from('contribution_receipts').delete().eq('device_id', device)).error,
        null,
      );
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
      assert.equal((await db.from('photo_publications').delete().eq('device_id', device)).error, null);
      assert.equal((await db.from('usage_events').delete().eq('device_id', device)).error, null);
      assert.equal((await db.storage.from('uploads').remove([path])).error, null);
    },
  };
}
export async function found(response: Response) {
  assert.equal(response.status, 200, await response.clone().text());
  const result = LookupResponse.parse(await response.json());
  assert.equal(result.status, 'found');
  if (result.status !== 'found') throw new Error('Expected saved contribution');
  return result.product;
}
