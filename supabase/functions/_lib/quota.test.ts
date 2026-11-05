import { strict as assert } from 'node:assert';
import { createClient } from '@supabase/supabase-js';
import { reserveUsage } from './quota.ts';

Deno.test('AI quota admission reserves its event and preserves quota and backend failures', async () => {
  const device = crypto.randomUUID();
  for (const kind of ['photo', 'read_label'] as const) {
    for (const outcome of ['admitted', 'limited', 'failed'] as const) {
      let calls = 0;
      const db = createClient('http://127.0.0.1:1', 'test-key', {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          fetch: async (url, init) => {
            calls++;
            assert.ok(String(url).endsWith('/rpc/reserve_usage'));
            assert.deepEqual(JSON.parse(String(init?.body)), { p_device: device, p_kind: kind });
            return outcome === 'failed'
              ? Response.json({ message: 'Unavailable' }, { status: 400 })
              : Response.json(outcome === 'limited' ? null : 42);
          },
        },
      });
      if (outcome === 'admitted') assert.equal(await reserveUsage(db, device, kind), 42);
      else {await assert.rejects(
          () => reserveUsage(db, device, kind),
          outcome === 'limited' ? /limita zilnică/ : /Quota admission failed/,
        );}
      assert.equal(calls, 1);
    }
  }
});
