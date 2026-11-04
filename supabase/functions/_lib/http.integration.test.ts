import { strict as assert } from 'node:assert';
import { adminClient, checkRateLimit, logEvent } from './http.ts';

Deno.test('usage counts are per device/kind over rolling 24h and do not reserve', async () => {
  const db = adminClient();
  const id = crypto.randomUUID();
  try {
    const { error } = await db.from('usage_events').insert([
      { device_id: id, kind: 'photo', created_at: new Date(Date.now() - 86_460_000).toISOString() },
      { device_id: id, kind: 'added', created_at: new Date().toISOString() },
    ]);
    assert.equal(error, null);
    assert.equal(await checkRateLimit(id, 'photo', 1), true);
    await logEvent('photo', id);
    assert.equal(await checkRateLimit(id, 'photo', 1), false);
    assert.equal(await checkRateLimit(id, 'photo', 2), true);
    assert.equal(await checkRateLimit(crypto.randomUUID(), 'photo', 1), true);
    assert.equal(await checkRateLimit(id, 'read_label', 1), true);
    assert.deepEqual(
      await Promise.all([checkRateLimit(id, 'photo', 2), checkRateLimit(id, 'photo', 2)]),
      [true, true],
    ); // Document the count-only interface; this is not atomic admission.
    const { count } = await db.from('usage_events').select('id', { count: 'exact', head: true })
      .eq('device_id', id);
    assert.equal(count, 3);
  } finally {
    const { error } = await db.from('usage_events').delete().eq('device_id', id);
    assert.equal(error, null);
  }
});
Deno.test('usage storage errors propagate and never silently admit a request', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => Promise.resolve(new Response('{"message":"offline"}', { status: 503 }));
  try {
    await assert.rejects(() => checkRateLimit(crypto.randomUUID(), 'photo', 40));
    await assert.rejects(() => logEvent('photo', crypto.randomUUID()));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
