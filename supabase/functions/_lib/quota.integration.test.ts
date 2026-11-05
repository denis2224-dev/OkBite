import { strict as assert } from 'node:assert';
import { adminClient } from './client.ts';
import { integrationTest } from './integration.ts';
import { reserveUsage } from './quota.ts';
import { HttpError } from './http.ts';

integrationTest(
  'AI quotas atomically admit 40 photos and 20 label reads with one event per admission',
  async () => {
    const db = adminClient();
    const device = crypto.randomUUID();
    try {
      for (const [kind, limit] of [['photo', 40], ['read_label', 20]] as const) {
        const results = await Promise.allSettled(
          Array.from({ length: limit + 5 }, () => reserveUsage(db, device, kind)),
        );
        const accepted = results.filter((result) => result.status === 'fulfilled');
        const denied = results.filter((result) => result.status === 'rejected');
        assert.equal(accepted.length, limit);
        assert.equal(denied.length, 5);
        for (const result of denied) {
          assert.ok(result.status === 'rejected' && result.reason instanceof HttpError);
          assert.equal(result.reason.status, 429);
        }
        const events = await db.from('usage_events').select('id,product_id').eq('device_id', device)
          .eq('kind', kind);
        assert.equal(events.error, null);
        assert.equal(events.data?.length, limit);
        assert.equal(new Set(events.data?.map((row) => row.id)).size, limit);
        assert.ok(events.data?.every((row) => row.product_id === null));
      }
    } finally {
      assert.equal((await db.from('usage_events').delete().eq('device_id', device)).error, null);
    }
  },
);
