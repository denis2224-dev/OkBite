import { strict as assert } from 'node:assert';
import jpeg from 'npm:jpeg-js@0.4.4';
import { integrationTest } from '../_lib/integration.ts';
import { adminClient } from '../_lib/client.ts';
import { loadProduct } from '../_lib/db.ts';
import { saveJpeg } from '../_lib/storage.ts';
import { AddProductRequest, LookupResponse } from '../_shared/contract.ts';
import { handler as addProduct } from '../add-product/index.ts';
import { handler as lookup } from './index.ts';

// Reuse C2's explicitly DEMO seed values; this is wiring evidence, not A3 validation.
integrationTest(
  'C4 scores survive contribution and lookup while required nulls stay unavailable',
  async () => {
    const db = adminClient();
    const device = crypto.randomUUID();
    const productIds = new Set<string>();
    let photo: string | undefined;
    try {
      const seed = await loadProduct({ id: 'c2000000-0000-4000-8000-000000000001' });
      assert.ok(seed);
      assert.equal(seed.score.letter, 'B');
      assert.equal(seed.score.grade, 'good');
      assert.equal(seed.score.score, 79);
      const pixel =
        jpeg.encode({ width: 1, height: 1, data: new Uint8Array([255, 0, 0, 255]) }, 80).data;
      photo = await saveJpeg(btoa(String.fromCharCode(...pixel)), device, 'ingredients');
      const input = AddProductRequest.parse({
        code: null,
        name: 'Test integrare C4',
        brand: seed.product.brand,
        quantity: seed.product.quantity,
        unit: seed.product.unit,
        categorySlug: seed.product.category.slug,
        nutrients: seed.product.nutrients,
        ingredientsText: seed.product.ingredientsText,
        photoPath: null,
        ingredientsPhotoPath: photo,
        nutritionPhotoPath: null,
      });
      for (const missing of [null, 'kcal', 'sat', 'sugar', 'salt'] as const) {
        const response = await addProduct(
          new Request('http://local/add-product', {
            method: 'POST',
            headers: { 'x-device-id': device },
            body: JSON.stringify({
              ...input,
              nutrients: missing ? { ...input.nutrients, [missing]: null } : input.nutrients,
            }),
          }),
        );
        assert.equal(response.status, 200, await response.clone().text());
        const added = LookupResponse.parse(await response.json());
        assert.equal(added.status, 'found');
        if (added.status !== 'found') throw new Error('Expected contributed product');
        productIds.add(added.product.id);
        assert.equal(added.product.status, 'unverified');
        if (missing) {
          assert.equal(added.product.nutrients[missing], null);
          assert.deepEqual(added.score, {
            score: null,
            letter: null,
            grade: 'unavailable',
            reasons: [],
            missing: [missing],
          });
        } else {
          assert.deepEqual(added.score, seed.score);
        }
        const read = await lookup(
          new Request(`http://local/lookup?id=${added.product.id}`, {
            headers: { 'x-device-id': device },
          }),
        );
        assert.equal(read.status, 200);
        assert.deepEqual(LookupResponse.parse(await read.json()), added);
      }
    } finally {
      const rows = await db.from('products').select('id').eq('added_by_device', device);
      assert.equal(rows.error, null);
      for (const row of rows.data ?? []) productIds.add(row.id);
      for (const id of productIds) {
        assert.equal((await db.from('products').delete().eq('id', id)).error, null);
        assert.equal(
          (await db.storage.from('products').remove([`${id}/ingredients.jpg`])).error,
          null,
        );
      }
      if (photo) assert.equal((await db.storage.from('uploads').remove([photo])).error, null);
      assert.equal((await db.from('usage_events').delete().eq('device_id', device)).error, null);
    }
  },
);
