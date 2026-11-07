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
