import { integrationTest } from '../_lib/integration.ts';
import { strict as assert } from 'node:assert';
import { ErrorBody, LookupResponse } from '../_shared/contract.ts';
import { adminClient } from '../_lib/http.ts';

integrationTest(
  'local gateway serves shopper lookup and CORS without a login JWT or API key',
  async () => {
    const device = crypto.randomUUID();
    const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/lookup`;
    const headers = { 'x-device-id': device, origin: 'https://okbite.md' };
    try {
      const preflight = await fetch(url, {
        method: 'OPTIONS',
        headers: {
          origin: headers.origin,
          'access-control-request-method': 'GET',
          'access-control-request-headers': 'x-device-id',
        },
      });
      assert.equal(preflight.status, 204);
      assert.equal(preflight.headers.get('access-control-allow-origin'), headers.origin);
      const found = await fetch(`${url}?code=4840001000014`, { headers });
      assert.equal(found.status, 200);
      assert.equal(LookupResponse.parse(await found.json()).status, 'found');
      for (
        const [query, status] of [
          ['code=4840001009994', 200],
          ['code=abc', 400],
          ['code=4840001000017', 400],
          ['code=96385075', 400],
          ['code=4840001009995', 400],
        ]
      ) {
        const res = await fetch(`${url}?${query}`, { headers });
        assert.equal(res.status, status);
        assert.equal(res.headers.get('access-control-allow-origin'), headers.origin);
        const body = await res.json();
        if (status === 200) assert.equal(LookupResponse.parse(body).status, 'not_found');
        else assert.equal(ErrorBody.parse(body).error, 'bad_request');
      }
      const denied = await fetch(`${url}?id=c2000000-0000-4000-8000-000000000001`, {
        headers: { origin: 'https://okbite.md.evil.test' },
      });
      assert.equal(denied.status, 403);
      assert.equal(denied.headers.has('access-control-allow-origin'), false);
      await denied.body?.cancel();
    } finally {
      assert.equal(
        (await adminClient().from('usage_events').delete().eq('device_id', device)).error,
        null,
      );
    }
  },
);
