import { strict as assert } from 'node:assert';
import { integrationTest } from '../_lib/integration.ts';
import { fixture, found } from './retry-fixture.ts';

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
