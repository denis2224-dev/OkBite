import { strict as assert } from 'node:assert';
import { createClient } from '@supabase/supabase-js';
import { createService } from './index.ts';

const device = 'c6000000-0000-4000-8000-000000000001';
const productId = 'c2000000-0000-4000-8000-000000000001';

Deno.test('report recovers a lost commit response from its linked reservation without releasing quota', async () => {
  let releases = 0;
  const db = createClient('http://127.0.0.1:1', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (url, init) => {
        const path = new URL(String(url)).pathname;
        if (path.endsWith('/rpc/reserve_usage')) return Response.json(42);
        if (path.endsWith('/rpc/commit_report')) throw new Error('Lost committed response');
        assert.ok(path.endsWith('/usage_events'));
        if (init?.method === 'DELETE') releases++;
        return Response.json({ product_id: productId });
      },
    },
  });
  const report = createService({ adminClient: () => db });
  assert.deepEqual(
    await report({ productId: productId.toUpperCase(), message: 'Raport de test C6' }, device),
    {
      status: 'ok',
    },
  );
  assert.equal(releases, 0);
});

Deno.test('report compensates only a confirmed unused reservation and keeps uncertain outcomes reserved', async () => {
  for (const state of ['unused', 'unreadable', 'foreign', 'release-failed'] as const) {
    let releases = 0;
    const db = createClient('http://127.0.0.1:1', 'test-key', {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: async (url, init) => {
          const path = new URL(String(url)).pathname;
          if (path.endsWith('/rpc/reserve_usage')) return Response.json(42);
          if (path.endsWith('/rpc/commit_report')) {
            return Response.json({ code: 'P0002', message: 'Not found' }, { status: 404 });
          }
          assert.ok(path.endsWith('/usage_events'));
          if (init?.method === 'DELETE') {
            releases++;
            return state === 'release-failed'
              ? Response.json({ message: 'Unavailable' }, { status: 503 })
              : new Response(null, { status: 204 });
          }
          if (state === 'unreadable') {
            return Response.json({ message: 'Unavailable' }, { status: 503 });
          }
          return Response.json({ product_id: state === 'foreign' ? crypto.randomUUID() : null });
        },
      },
    });
    const report = createService({ adminClient: () => db });
    await assert.rejects(
      () => report({ productId, message: 'Raport de test C6' }, device),
      state === 'unused'
        ? /Produs negăsit/
        : state === 'release-failed'
        ? /Quota release failed/
        : /Report/,
    );
    assert.equal(releases, state === 'unused' || state === 'release-failed' ? 1 : 0, state);
  }
});
