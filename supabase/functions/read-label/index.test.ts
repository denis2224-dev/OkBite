import { strict as assert } from 'node:assert';
import { createClient } from '@supabase/supabase-js';
import { HttpError } from '../_lib/http.ts';
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
