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

if (Deno.env.get('C6_PENDING_COMMIT_FIXTURE') === '1') {
  integrationTest(
    'a report still committing when transport fails recovers without another report',
    async () => {
      const db = adminClient();
      const device = crypto.randomUUID();
      const original = globalThis.fetch;
      let pending: Promise<Response> | undefined;
      try {
        globalThis.fetch = async (...args) => {
          if (String(args[0]).endsWith('/rpc/commit_report')) {
            pending = original(...args);
            let waiting = false;
            for (let i = 0; i < 100 && !waiting; i++) {
              const state = await db.rpc('c6_test_commit_waiting');
              assert.equal(state.error, null);
              waiting = state.data === true;
              if (!waiting) await new Promise((resolve) => setTimeout(resolve, 10));
            }
            assert.ok(waiting, 'fault must occur during the report DB transaction');
            throw new Error('Lost connection during report commit');
          }
          return original(...args);
        };
        const response = await handler(
          new Request('http://local/report', {
            method: 'POST',
            headers: { 'x-device-id': device },
            body: JSON.stringify({
              productId: 'c2000000-0000-4000-8000-000000000001',
              message: 'C6 slow report fixture',
            }),
          }),
        );
        const committed = await pending!;
        assert.equal(committed.ok, true, await committed.clone().text());
        await committed.body?.cancel();
        const rows = await db.from('reports').select('status').eq('device_id', device);
        assert.equal(rows.error, null);
        assert.deepEqual(rows.data, [{ status: 'open' }]);
        assert.equal(response.status, 200, await response.clone().text());
        assert.deepEqual(await response.json(), { status: 'ok' });
      } finally {
        globalThis.fetch = original;
        if (pending) await (await pending).body?.cancel().catch(() => {});
        assert.equal((await db.from('reports').delete().eq('device_id', device)).error, null);
        assert.equal((await db.from('usage_events').delete().eq('device_id', device)).error, null);
      }
    },
  );
}
