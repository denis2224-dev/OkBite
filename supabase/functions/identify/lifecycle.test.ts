import { strict as assert } from 'node:assert';
import { createClient } from '@supabase/supabase-js';
import { askClaude, UpstreamError } from '../_lib/claude.ts';
import { loadProduct } from '../_lib/db.ts';
import { logEvent } from '../_lib/http.ts';
import { createHandler as frontHandler } from './index.ts';
import { createService as frontService } from './service.ts';
import { createHandler as labelHandler } from '../read-label/index.ts';
import { createService as labelService } from '../read-label/service.ts';

for (const kind of ['front', 'label'] as const) {
  for (const outcome of ['unconfigured', 'uncertain', 'malformed'] as const) {
    Deno.test(`${kind}: ${outcome} provider outcome cleans uploads and preserves only attempted quota`, async () => {
      const requests: string[] = [];
      const db = createClient('http://127.0.0.1:1', 'test-key', {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          fetch: async (url, init) => {
            const path = new URL(String(url)).pathname;
            requests.push(`${init?.method ?? 'GET'} ${path}`);
            if (path.endsWith('/reserve_usage')) return Response.json(42);
            if ((init?.method ?? 'GET') === 'GET') return new Response(new Uint8Array([1]));
            return Response.json([]);
          },
        },
      });
      const deps = {
        adminClient: () => db,
        saveJpeg: async (_photo: string, device: string, suffix: string) =>
          `${device}/stored-${suffix}.jpg`,
        askClaude: async () => {
          if (outcome === 'unconfigured') {
            return await askClaude(['x'], 'p', {
              apiKey: '',
              fetch: () => assert.fail('missing key must never reach the provider'),
            });
          }
          if (outcome === 'uncertain') throw new UpstreamError('timeout');
          return '```json\n{"incomplete":\n```';
        },
        loadProduct,
        logEvent,
      };
      const handler = kind === 'front'
        ? frontHandler(frontService(deps))
        : labelHandler(labelService(deps));
      const response = await handler(
        new Request('http://local/test', {
          method: 'POST',
          headers: { 'x-device-id': crypto.randomUUID() },
          body: JSON.stringify(
            kind === 'front'
              ? { photo: 'first' }
              : { ingredientsImage: 'first', nutritionImage: 'second' },
          ),
        }),
      );
      if (kind === 'label' && outcome !== 'unconfigured') {
        assert.equal(response.status, 200);
        const draft = await response.json();
        assert.equal(draft.ingredientsText, null);
        assert.deepEqual(Object.values(draft.nutrients), Array(8).fill(null));
        assert.equal(draft.unclear.length, 9);
        assert.ok(draft.ingredientsPhotoPath.endsWith('/stored-ingredients.jpg'));
        assert.ok(draft.nutritionPhotoPath.endsWith('/stored-nutrition.jpg'));
        assert.equal(requests.some((request) => request.startsWith('DELETE ')), false);
        return;
      }
      assert.equal(response.status, 502);
      assert.equal((await response.json()).error, 'upstream_failed');
      assert.ok(requests.includes('DELETE /storage/v1/object/uploads'), requests.join());
      assert.equal(requests.includes('DELETE /rest/v1/usage_events'), outcome === 'unconfigured');
    });
  }
}
