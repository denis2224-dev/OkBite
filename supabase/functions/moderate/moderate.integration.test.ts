import { integrationTest } from '../_lib/integration.ts';
import { strict as assert } from 'node:assert';
import { createClient } from '@supabase/supabase-js';
import { adminClient } from '../_lib/client.ts';
import { loadProduct } from '../_lib/db.ts';
import { handler } from './index.ts';

integrationTest('real Auth JWT and membership protect verify/hide/report actions and transactional rollback', async () => {
  const db = adminClient();
  const email = `c7-${crypto.randomUUID()}@example.invalid`;
  const password = crypto.randomUUID();
  const created = await db.auth.admin.createUser({ email, password, email_confirm: true });
  assert.equal(created.error, null);
  const actor = created.data.user!.id;
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signed = await client.auth.signInWithPassword({ email, password });
  assert.equal(signed.error, null);
  const token = signed.data.session!.access_token;
  const id = crypto.randomUUID();
  const input = {
    code: null,
    name: 'Produs C7',
    brand: 'Test',
    quantity: '100 g',
    categorySlug: 'iaurt',
    unit: 'g',
    ingredientsText: 'lapte normalizat, zahăr',
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
  };
  const post = (body: unknown, jwt = token) =>
    handler(
      new Request('http://local/moderate', {
        method: 'POST',
        headers: { authorization: `Bearer ${jwt}` },
        body: JSON.stringify(body),
      }),
    );
  let reportId: string | undefined;
  try {
    const verify = { action: 'verify', productId: id, product: input };
    assert.equal((await post(verify, 'forged')).status, 401);
    assert.equal((await post(verify, '')).status, 401);
    assert.equal((await post(verify)).status, 401);
    assert.equal((await db.from('moderators').insert({ user_id: actor })).error, null);
    const row = await db.from('products').insert({
      id,
      name: input.name,
      brand: input.brand,
      quantity: input.quantity,
      category_slug: 'iaurt',
      unit: 'g',
      ingredients_text: 'lapte',
      source: 'Fixture C7',
    });
    assert.equal(row.error, null);
    assert.equal((await post({ ...verify, product: { ...input, name: '' } })).status, 400);
    assert.equal((await post(verify)).status, 200);
    const product = await loadProduct({ id });
    assert.equal(product?.product.status, 'verified');
    assert.equal(product?.product.verifiedAt, new Date().toISOString().slice(0, 10));
    assert.deepEqual(product?.product.ingredients.map((i) => i.name), [
      'lapte normalizat',
      'zahăr',
    ]);
    assert.deepEqual(product?.product.allergens, ['Lapte']);
    const verified = await db.from('products').select('verified_by').eq('id', id).single();
    assert.equal(verified.error, null);
    assert.equal(verified.data!.verified_by, actor);
    assert.equal(
      (await post({
        ...verify,
        product: { ...input, name: 'Rollback', categorySlug: 'missing-c7' },
      })).status,
      400,
    );
    assert.equal((await loadProduct({ id }))?.product.name, input.name);
    const report = await db.from('reports').insert({
      product_id: id,
      device_id: crypto.randomUUID(),
      message: 'Raport C7',
    }).select('id').single();
    assert.equal(report.error, null);
    reportId = report.data!.id;
    assert.equal((await post({ action: 'close_report', reportId })).status, 200);
    const closed = await db.from('reports').select('status').eq('id', reportId).single();
    assert.equal(closed.data!.status, 'closed');
    assert.equal(
      (await post({ action: 'hide', productId: id, reason: 'Etichetă neclară' })).status,
      200,
    );
    assert.equal(await loadProduct({ id }), null);
    const hidden = await db.from('products').select('hidden_reason').eq('id', id).single();
    assert.equal(hidden.data!.hidden_reason, 'Etichetă neclară');
    assert.equal((await db.from('moderators').delete().eq('user_id', actor)).error, null);
    assert.equal((await post(verify)).status, 401);
  } finally {
    if (reportId) assert.equal((await db.from('reports').delete().eq('id', reportId)).error, null);
    assert.equal((await db.from('products').delete().eq('id', id)).error, null);
    assert.equal((await db.from('moderators').delete().eq('user_id', actor)).error, null);
    assert.equal((await db.auth.admin.deleteUser(actor)).error, null);
  }
});
