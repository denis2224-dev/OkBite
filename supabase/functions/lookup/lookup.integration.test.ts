import { strict as assert } from 'node:assert';
import { createClient } from '@supabase/supabase-js';
import { LookupResponse } from '../_shared/contract.ts';
import { adminClient } from '../_lib/http.ts';
import { loadProduct } from '../_lib/db.ts';
import { handler } from './index.ts';

const seedId = 'c2000000-0000-4000-8000-000000000001';
Deno.test('lookup resolves seeded code/id, label order, nulls and usage events', async () => {
  const db = adminClient();
  const device = crypto.randomUUID();
  const lookup = async (query: string) => {
    const res = await handler(
      new Request(`http://local/lookup?${query}`, {
        headers: { 'x-device-id': device },
      }),
    );
    assert.equal(res.status, 200);
    return LookupResponse.parse(await res.json());
  };
  try {
    const found = await lookup('code=4840001000014');
    assert.equal(found.status, 'found');
    if (found.status !== 'found') throw new Error('Expected seeded product');
    assert.equal(found.product.status, 'verified');
    assert.equal(found.score.grade, 'unavailable');
    assert.deepEqual(found.product.ingredients.map((i) => i.name), [
      'Lapte normalizat',
      'Culturi lactice vii',
    ]);
    assert.equal(found.product.nutrients.fat, 2.5);
    assert.equal(found.product.nutrients.fruitVegPct, null);
    assert.equal(found.product.imageUrl, null);
    assert.equal(found.product.addedAt, '2026-10-12');
    assert.equal(found.product.verifiedAt, '2026-10-28');
    assert.deepEqual(await lookup(`id=${seedId}`), found);
    assert.deepEqual(await lookup('code=4840001009995'), { status: 'not_found' });
    const juice = await loadProduct({ code: '4840001000052' });
    assert.equal(juice?.product.nutrients.sugar, null);
    assert.equal(juice?.score.grade, 'unavailable');
    const events = await db.from('usage_events').select('kind,product_id').eq('device_id', device)
      .order('id');
    assert.equal(events.error, null);
    assert.deepEqual(events.data, [{ kind: 'barcode', product_id: seedId }, {
      kind: 'not_found',
      product_id: null,
    }]);
  } finally {
    assert.equal((await db.from('usage_events').delete().eq('device_id', device)).error, null);
  }
});
Deno.test('public loader respects column grants, unverified visibility, unknown ingredients and hidden exclusion', async () => {
  const db = adminClient();
  const id = crypto.randomUUID();
  const seed = await db.from('products').select(
    'name,brand,quantity,category_slug,unit,ingredients_text,source',
  )
    .eq('id', seedId).single();
  assert.equal(seed.error, null);
  try {
    assert.equal(
      (await db.from('products').insert({
        ...seed.data,
        id,
        code: '96385074',
        status: 'unverified',
        image_path: `${id}/front.jpg`,
        ingredients_photo_path: `${id}/ingredients.jpg`,
      })).error,
      null,
    );
    assert.equal(
      (await db.from('product_ingredients').insert([
        { product_id: id, position: 2, raw_name: 'Ingredient test', ingredient_slug: null },
        {
          product_id: id,
          position: 1,
          raw_name: 'Lapte integral',
          ingredient_slug: 'lapte-normalizat',
        },
      ])).error,
      null,
    );
    const result = await loadProduct({ id });
    assert.equal(result?.product.status, 'unverified');
    assert.equal(result?.product.verifiedAt, null);
    assert.equal(result?.product.nutrients.kcal, null);
    assert.deepEqual(result?.product.ingredients.map((i) => i.name), [
      'Lapte integral',
      'Ingredient test',
    ]);
    assert.equal(result?.product.ingredients[1].source, null);
    assert.equal(result?.product.ingredients[1].slug, null);
    assert.ok(result?.product.imageUrl?.endsWith(`/products/${id}/front.jpg`));
    assert.ok(result?.product.labelImageUrl?.endsWith(`/products/${id}/ingredients.jpg`));
    const anon = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    assert.equal((await anon.from('products').select('id,name').eq('id', id)).error, null);
    assert.equal((await anon.from('products').select('*').eq('id', id)).error?.code, '42501');
    assert.equal((await db.from('products').update({ status: 'hidden' }).eq('id', id)).error, null);
    assert.equal(await loadProduct({ id }), null);
    assert.equal(await loadProduct({ code: '96385074' }), null);
    const hidden = await handler(
      new Request(`http://local/lookup?id=${id}`, {
        headers: { 'x-device-id': id },
      }),
    );
    assert.equal(hidden.status, 200);
    assert.deepEqual(LookupResponse.parse(await hidden.json()), { status: 'not_found' });
  } finally {
    assert.equal((await db.from('products').delete().eq('id', id)).error, null);
    assert.equal((await db.from('usage_events').delete().eq('device_id', id)).error, null);
  }
});
