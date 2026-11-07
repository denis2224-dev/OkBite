import { strict as assert } from 'node:assert';
import { integrationTest } from '../_lib/integration.ts';
import { adminClient } from '../_lib/client.ts';
import { loadProduct } from '../_lib/db.ts';
import { publishPhoto } from '../_lib/storage.ts';
import { createHandler } from './index.ts';
import { createService } from './service.ts';
import { fixture, found } from './retry-fixture.ts';

integrationTest(
  'an existing barcode result is retained when its upload is retried without the code',
  async () => {
    const f = await fixture();
    try {
      f.input.code = '4840001000014';
      const first = await found(await f.submit());
      f.input.code = null;
      assert.equal((await found(await f.submit())).id, first.id);
      assert.equal((await f.products()).data?.length, 0);
      const events = await f.db.from('usage_events').select('id').eq('device_id', f.device);
      assert.equal(events.error, null);
      assert.equal(events.data?.length, 0);
    } finally {
      await f.cleanup();
    }
  },
);

integrationTest('invented upload paths cannot mint a receipt for an existing barcode', async () => {
  const f = await fixture();
  try {
    f.input.code = '4840001000014';
    f.input.ingredientsPhotoPath = `${f.device}/${crypto.randomUUID()}-ingredients.jpg`;
    const response = await f.submit();
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error, 'bad_request');
    const receipts = await f.db
      .from('contribution_receipts')
      .select('product_id')
      .eq('device_id', f.device);
    assert.equal(receipts.error, null);
    assert.deepEqual(receipts.data, []);
  } finally {
    await f.cleanup();
  }
});

integrationTest(
  'a concurrent retry at the last quota slot recovers after the in-flight commit',
  async () => {
    const f = await fixture();
    const original = globalThis.fetch;
    let release = () => {};
    let started = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const publishing = new Promise<void>((resolve) => {
      started = resolve;
    });
    let first: Promise<Response> | undefined;
    try {
      for (let i = 0; i < 9; i++) {
        assert.equal(
          (await f.db.rpc('reserve_usage', { p_device: f.device, p_kind: 'added' })).error,
          null,
        );
      }
      const blocked = createHandler(
        createService({
          adminClient,
          loadProduct,
          newId: () => crypto.randomUUID(),
          publishPhoto: async (...args) => {
            started();
            await gate;
            return publishPhoto(...args);
          },
        }),
      );
      first = blocked(
        new Request('http://local/', {
          method: 'POST',
          headers: { 'x-device-id': f.device },
          body: JSON.stringify(f.input),
        }),
      );
      await publishing;
      globalThis.fetch = async (...args) => {
        const response = await original(...args);
        if (
          String(args[0]).endsWith('/rpc/reserve_usage') &&
          (await response.clone().json()) === null
        ) {
          release();
          await first; // Commit occurs after admission denial, before recovery can read it.
        }
        return response;
      };
      const retried = await found(await f.submit());
      assert.equal(retried.id, (await found(await first)).id);
      assert.equal((await f.products()).data?.length, 1);
      const events = await f.db.from('usage_events').select('product_id').eq('device_id', f.device);
      assert.equal(events.error, null);
      assert.equal(events.data?.filter((row) => row.product_id).length, 1);
    } finally {
      globalThis.fetch = original;
      release();
      if (first) await (await first).body?.cancel().catch(() => {});
      await f.cleanup();
    }
  },
);
