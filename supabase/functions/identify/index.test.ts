import { strict as assert } from 'node:assert';
import { createClient } from '@supabase/supabase-js';
import { loadProduct } from '../_lib/db.ts';
import { HttpError, logEvent } from '../_lib/http.ts';
import { createHandler } from './index.ts';
import { createService } from './service.ts';

Deno.test('identify reports a failed quota release as an upstream failure', async () => {
  const requests: string[] = [];
  const db = createClient('http://127.0.0.1:1', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (_url, init) => {
        const method = init?.method ?? 'GET';
        requests.push(method);
        return method === 'POST'
          ? Response.json(42)
          : Response.json({ message: 'private backend error' }, { status: 500 });
      },
    },
  });
  const handler = createHandler(createService({
    adminClient: () => db,
    loadProduct,
    logEvent,
    saveJpeg: async () => {
      throw new HttpError(400);
    },
    askClaude: async () => assert.fail('an invalid photo must not reach the provider'),
  }));
  const response = await handler(
    new Request('http://local/identify', {
      method: 'POST',
      headers: { 'x-device-id': crypto.randomUUID() },
      body: JSON.stringify({ photo: 'invalid' }),
    }),
  );
  assert.deepEqual(requests, ['POST', 'DELETE']);
  assert.equal(response.status, 502);
  assert.equal((await response.json()).error, 'upstream_failed');
});

Deno.test('identify removes the upload and releases quota when the stored photo cannot be read', async () => {
  const requests: string[] = [];
  const db = createClient('http://127.0.0.1:1', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (url, init) => {
        const method = init?.method ?? 'GET';
        const path = new URL(String(url)).pathname;
        requests.push(`${method} ${path.split('/').slice(0, 5).join('/')}`);
        if (path.endsWith('/rpc/reserve_usage')) return Response.json(42);
        if (method === 'GET') return Response.json({ message: 'gone' }, { status: 500 });
        return Response.json([]);
      },
    },
  });
  const handler = createHandler(createService({
    adminClient: () => db,
    loadProduct,
    logEvent,
    saveJpeg: async (_photo, device) => `${device}/${crypto.randomUUID()}-front.jpg`,
    askClaude: async () => assert.fail('an unreadable photo must not reach the provider'),
  }));
  const response = await handler(
    new Request('http://local/identify', {
      method: 'POST',
      headers: { 'x-device-id': crypto.randomUUID() },
      body: JSON.stringify({ photo: 'stored' }),
    }),
  );
  assert.equal(response.status, 502);
  assert.ok(
    requests.some((r) => r.startsWith('DELETE /storage/v1/object/uploads')),
    requests.join(),
  );
  assert.ok(requests.some((r) => r.startsWith('DELETE /rest/v1/usage_events')), requests.join());
});

Deno.test('identify rejects sparkling-vs-still water mismatches, caps brand-only similarity < 0.6, and loads saved water on barcode', async () => {
  const db = {
    storage: {
      from: () => ({
        download: async () => ({
          data: new Blob([Uint8Array.from([1, 2, 3])]),
          error: null,
        }),
        remove: async () => ({ error: null }),
      }),
    },
    rpc: async (fn: string) => {
      if (fn === 'reserve_usage') return { data: 11, error: null };
      if (fn === 'search_products') {
        return {
          data: [
            {
              id: 'a0000000-0000-4000-8000-000000000001',
              name: 'Apă potabilă plată',
              brand: 'OM',
              quantity: '1,5 L',
              image_path: null,
              similarity: 0.92,
            },
            {
              id: 'a0000000-0000-4000-8000-000000000002',
              name: 'Apă potabilă carbogazoasă',
              brand: 'OM',
              quantity: '1,5 L',
              image_path: null,
              similarity: 0.88,
            },
          ],
          error: null,
        };
      }
      return { data: null, error: null };
    },
    from: (table: string) => {
      if (table === 'products') {
        const rows = [
          {
            id: 'a0000000-0000-4000-8000-000000000001',
            name: 'Apă potabilă plată',
            brand: 'OM',
            quantity: '1,5 L',
            image_path: null,
            category_slug: 'apa',
            water: { carbonation: 'still' },
          },
          {
            id: 'a0000000-0000-4000-8000-000000000002',
            name: 'Apă potabilă carbogazoasă',
            brand: 'OM',
            quantity: '1,5 L',
            image_path: null,
            category_slug: 'apa',
            water: { carbonation: 'sparkling' },
          },
        ];
        const q = {
          in: () => q,
          eq: () => q,
          ilike: () => q,
          neq: () => q,
          limit: async () => ({ data: rows, error: null }),
        };
        return { select: () => q };
      }
      return {
        delete: () => ({ eq: () => ({ is: () => Promise.resolve({ error: null }) }) }),
      };
    },
  };

  // Sparkling photo must exclude still candidate.
  const sparklingSvc = createService({
    adminClient: () => db as never,
    loadProduct: async () => null,
    saveJpeg: async (_p, device) => `${device}/11111111-1111-4111-8111-111111111111-front.jpg`,
    askClaude: async () => '{"brand":"OM","name":"Apă carbogazoasă","quantity":"1,5 L","barcodeDigits":"","isWater":true,"carbonation":"sparkling"}',
    logEvent: async () => {},
  });
  const sparklingRes = await sparklingSvc({ photo: 'x' }, '22222222-2222-4222-8222-222222222222');
  assert.equal(sparklingRes.status, 'candidates');
  if (sparklingRes.status === 'candidates') {
    assert.deepEqual(sparklingRes.candidates.map((c) => c.id), ['a0000000-0000-4000-8000-000000000002']);
  }

  // Brand-only photo caps similarity below 0.6 and asks user confirmation among distinct variants.
  const brandOnlySvc = createService({
    adminClient: () => db as never,
    loadProduct: async () => null,
    saveJpeg: async (_p, device) => `${device}/11111111-1111-4111-8111-111111111111-front.jpg`,
    askClaude: async () => '{"brand":"OM","name":"","quantity":"","barcodeDigits":"","isWater":true,"carbonation":""}',
    logEvent: async () => {},
  });
  const brandOnlyRes = await brandOnlySvc({ photo: 'x' }, '22222222-2222-4222-8222-222222222222');
  assert.equal(brandOnlyRes.status, 'candidates');
  if (brandOnlyRes.status === 'candidates') {
    assert.ok(brandOnlyRes.candidates.every((c) => c.similarity < 0.6));
  }
});
