import { strict as assert } from 'node:assert';
import { createClient } from '@supabase/supabase-js';
import { HttpError } from '../_lib/http.ts';
import { UpstreamError } from '../_lib/claude.ts';
import { createHandler } from './index.ts';
import { createService } from './service.ts';

for (const failure of ['storage', 'quota'] as const) {
  Deno.test(`read-label reports a failed ${failure} cleanup as an upstream failure`, async () => {
    const requests: string[] = [];
    const db = createClient('http://127.0.0.1:1', 'test-key', {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: async (url) => {
          const path = new URL(String(url)).pathname;
          requests.push(path);
          if (path.endsWith('/reserve_usage')) return Response.json(42);
          if (path.endsWith('/uploads') && failure === 'storage') {
            return Response.json({ message: 'private storage error' }, { status: 500 });
          }
          if (path.endsWith('/usage_events') && failure === 'quota') {
            return Response.json({ message: 'private quota error' }, { status: 500 });
          }
          return Response.json([]);
        },
      },
    });
    const handler = createHandler(createService({
      adminClient: () => db,
      saveJpeg: async (_photo, device, suffix) => {
        if (suffix === 'nutrition') throw new HttpError(400);
        return `${device}/first-ingredients.jpg`;
      },
      askClaude: async () => assert.fail('an invalid photo pair must not reach the provider'),
    }));
    const response = await handler(
      new Request('http://local/read-label', {
        method: 'POST',
        headers: { 'x-device-id': crypto.randomUUID() },
        body: JSON.stringify({ ingredientsImage: 'first', nutritionImage: 'invalid' }),
      }),
    );
    assert.deepEqual(requests, [
      '/rest/v1/rpc/reserve_usage',
      '/storage/v1/object/uploads',
      '/rest/v1/usage_events',
    ]);
    assert.equal(response.status, 502);
    assert.equal((await response.json()).error, 'upstream_failed');
  });
}

Deno.test('read-label cleans up a photo pair too large for the provider before calling it', async () => {
  const requests: string[] = [];
  const db = createClient('http://127.0.0.1:1', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (url, init) => {
        const path = new URL(String(url)).pathname;
        const method = init?.method ?? 'GET';
        requests.push(method);
        if (path.endsWith('/reserve_usage')) return Response.json(42);
        if (method === 'GET') return new Response(new Uint8Array(1_500_000));
        return Response.json([]);
      },
    },
  });
  let providerCalls = 0;
  const handler = createHandler(createService({
    adminClient: () => db,
    saveJpeg: async (_photo, device, suffix) => `${device}/stored-${suffix}.jpg`,
    askClaude: async () => {
      providerCalls++;
      throw new Error('Photo pair exceeds provider limits');
    },
  }));
  const response = await handler(
    new Request('http://local/read-label', {
      method: 'POST',
      headers: { 'x-device-id': crypto.randomUUID() },
      body: JSON.stringify({ ingredientsImage: 'first', nutritionImage: 'second' }),
    }),
  );
  assert.equal(response.status, 502);
  assert.equal(providerCalls, 0);
  assert.deepEqual(requests, ['POST', 'GET', 'GET', 'DELETE', 'DELETE']);
});

Deno.test('read-label keeps the photos and returns blank fields to type in when the AI fails', async () => {
  const requests: string[] = [];
  const db = createClient('http://127.0.0.1:1', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (url, init) => {
        const path = new URL(String(url)).pathname;
        requests.push(init?.method ?? 'GET');
        if (path.endsWith('/reserve_usage')) return Response.json(42);
        if ((init?.method ?? 'GET') === 'GET') return new Response(new Uint8Array(10));
        return Response.json([]);
      },
    },
  });
  const handler = createHandler(createService({
    adminClient: () => db,
    saveJpeg: async (_photo, device, suffix) => `${device}/stored-${suffix}.jpg`,
    askClaude: async () => { throw new UpstreamError('Claude request failed'); },
  }));
  const device = crypto.randomUUID();
  const response = await handler(
    new Request('http://local/read-label', {
      method: 'POST',
      headers: { 'x-device-id': device },
      body: JSON.stringify({ ingredientsImage: 'first', nutritionImage: null }),
    }),
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ingredientsText, null);
  assert.deepEqual(Object.values(body.nutrients), Array(8).fill(null));
  assert.equal(body.unclear.length, 9);
  assert.equal(body.ingredientsPhotoPath, `${device}/stored-ingredients.jpg`);
  assert.equal(requests.includes('DELETE'), false); // the photos stay for the shopper's submission
});
