import { strict as assert } from 'node:assert';
import { integrationTest } from '../_lib/integration.ts';
import { adminClient } from '../_lib/client.ts';
import { handler } from './index.ts';

integrationTest(
  'reports recover a lost RPC response, reject hidden products and release failed quota',
  async () => {
    const db = adminClient();
    const device = crypto.randomUUID();
    const product = crypto.randomUUID();
    const original = globalThis.fetch;
    const submit = () =>
      handler(
        new Request('http://local/report', {
          method: 'POST',
          headers: { 'x-device-id': device },
          body: JSON.stringify({ productId: product, message: 'Local report fixture' }),
        }),
      );
    try {
      assert.equal(
        (await db.from('products').insert({
          id: product,
          name: 'Local report fixture',
          brand: '',
          quantity: '',
          category_slug: 'iaurt',
          unit: 'g',
          ingredients_text: 'test',
          source: 'test',
        })).error,
        null,
      );
      globalThis.fetch = async (...args) => {
        const response = await original(...args);
        if (String(args[0]).endsWith('/rpc/commit_report')) {
          assert.equal(response.ok, true);
          await response.body?.cancel();
          throw new Error('Lost response after real report commit');
        }
        return response;
      };
      const saved = await submit();
      assert.equal(saved.status, 200);
      assert.deepEqual(await saved.json(), { status: 'ok' });
      globalThis.fetch = original;
      const rows = await db.from('reports').select('status').eq('device_id', device);
      assert.equal(rows.error, null);
      assert.deepEqual(rows.data, [{ status: 'open' }]);
      assert.equal(
        (await db.from('products').update({ status: 'hidden' }).eq('id', product)).error,
        null,
      );
      const hidden = await submit();
      assert.equal(hidden.status, 404);
      assert.equal((await hidden.json()).error, 'not_found');
      const events = await db.from('usage_events').select('product_id').eq('device_id', device);
      assert.equal(events.error, null);
      assert.deepEqual(events.data, [{ product_id: product }]);
    } finally {
      globalThis.fetch = original;
      assert.equal((await db.from('reports').delete().eq('device_id', device)).error, null);
      assert.equal((await db.from('usage_events').delete().eq('device_id', device)).error, null);
      assert.equal((await db.from('products').delete().eq('id', product)).error, null);
    }
  },
);
