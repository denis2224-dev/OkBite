import { strict as assert } from 'node:assert';
import records from '../../../apps/mobile/src/test/preview-data.json' with { type: 'json' };
import { ErrorBody, LookupResponse, TopProductsResponse } from '../_shared/contract.ts';
import { HttpError } from '../_lib/http.ts';
import { createHandler } from './index.ts';

const request = (query = 'category=iaurt', init?: RequestInit) =>
  new Request(`http://local/top-products?${query}`, init);

Deno.test('top-products caps the response and uses the default or requested limit', async () => {
  const found = LookupResponse.parse({ status: 'found', ...records[0] });
  if (found.status !== 'found') throw new Error('Expected found fixture');
  const candidate = { product: found.product, score: found.score };
  const products = Array.from({ length: 25 }, () => candidate);
  const calls: [string, number][] = [];
  const handler = createHandler({
    loadShelfCandidates: async (category, limit) => {
      calls.push([category, limit]);
      return products;
    },
  });

  for (const [query, limit] of [['category=iaurt', 20], ['category=iaurt&limit=1', 1]] as const) {
    const res = await handler(request(query));
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('cache-control'), 'max-age=180');
    assert.deepEqual(TopProductsResponse.parse(await res.json()), {
      category: 'iaurt',
      products: products.slice(0, limit),
    });
  }
  assert.deepEqual(calls, [['iaurt', 20], ['iaurt', 1]]);
});

Deno.test('top-products returns an empty shelf with the requested category', async () => {
  const handler = createHandler({ loadShelfCandidates: async () => [] });
  const res = await handler(request('category=fructe-legume'));
  assert.equal(res.status, 200);
  assert.deepEqual(TopProductsResponse.parse(await res.json()), {
    category: 'fructe-legume',
    products: [],
  });
});

Deno.test('top-products rejects invalid, unknown and repeated parameters before I/O', async () => {
  let calls = 0;
  const handler = createHandler({
    loadShelfCandidates: async () => {
      calls++;
      return [];
    },
  });
  for (
    const query of [
      '',
      'category=',
      'category=Iaurt',
      'category=iaurt%20',
      'category=a--b',
      `category=${'a'.repeat(65)}`,
      'category=iaurt&limit=',
      'category=iaurt&limit=0',
      'category=iaurt&limit=21',
      'category=iaurt&limit=abc',
      'category=iaurt&limit=1.5',
      'category=iaurt&limit=1e1',
      'category=iaurt&limit=%201',
      'category=iaurt&foo=1',
      'category=iaurt&category=suc',
      'category=iaurt&limit=1&limit=20',
    ]
  ) {
    const res = await handler(request(query, { headers: { origin: 'https://okbite.md' } }));
    assert.equal(res.status, 400, query);
    assert.equal(ErrorBody.parse(await res.json()).error, 'bad_request');
    assert.equal(res.headers.get('access-control-allow-origin'), 'https://okbite.md');
  }
  assert.equal(calls, 0);
});

Deno.test('top-products maps unknown categories and hides database errors', async () => {
  for (
    const [error, status, body] of [
      [new HttpError(400), 400, { error: 'bad_request', message: 'Cerere invalidă.' }],
      [
        new Error('private database details'),
        502,
        { error: 'upstream_failed', message: 'Serviciul nu este disponibil momentan.' },
      ],
    ] as const
  ) {
    const handler = createHandler({
      loadShelfCandidates: async () => {
        throw error;
      },
    });
    const res = await handler(request());
    assert.equal(res.status, status);
    assert.deepEqual(ErrorBody.parse(await res.json()), body);
  }
});

Deno.test('top-products validates the complete response before returning it', async () => {
  const handler = createHandler({ loadShelfCandidates: async () => [{}] as never });
  const res = await handler(request());
  assert.equal(res.status, 502);
  assert.equal(ErrorBody.parse(await res.json()).error, 'upstream_failed');
});

Deno.test('top-products handles preflight, disallowed origins and unsupported methods', async () => {
  let calls = 0;
  const handler = createHandler({
    loadShelfCandidates: async () => {
      calls++;
      return [];
    },
  });
  const preflight = await handler(request('', {
    method: 'OPTIONS',
    headers: {
      origin: 'https://okbite.md',
      'access-control-request-method': 'GET',
      'access-control-request-headers': 'apikey, x-device-id',
    },
  }));
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://okbite.md');

  const origin = await handler(request(undefined, { headers: { origin: 'https://evil.example' } }));
  assert.equal(origin.status, 403);
  assert.equal(ErrorBody.parse(await origin.json()).error, 'bad_request');

  const method = await handler(request(undefined, { method: 'POST' }));
  assert.equal(method.status, 405);
  assert.equal(method.headers.get('allow'), 'GET, OPTIONS');
  assert.equal(ErrorBody.parse(await method.json()).error, 'bad_request');
  assert.equal(calls, 0);
});
