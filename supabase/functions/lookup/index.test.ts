import { strict as assert } from 'node:assert';
import { ErrorBody, LookupResponse } from '../_shared/contract.ts';
import { createHandler } from './index.ts';

const id = 'c2000000-0000-4000-8000-000000000001';
const req = (query = '?code=4840001000014', device: string | null = id, method = 'GET') =>
  new Request(`http://local/lookup${query}`, {
    method,
    headers: {
      origin: 'https://okbite.md',
      ...(device === null ? {} : { 'x-device-id': device }),
    },
  });
Deno.test('lookup rejects malformed, conflicting, duplicate and missing selectors before I/O', async () => {
  let calls = 0;
  const handler = createHandler({
    loadProduct: async () => {
      calls++;
      return null;
    },
    logEvent: async () => {
      calls++;
    },
  });
  for (
    const query of [
      '',
      '?code=abc',
      '?id=abc',
      `?id=${id}&code=4840001000014`,
      '?code=4840001000014&code=4840001000014',
      '?other=1',
    ]
  ) {
    const res = await handler(req(query));
    assert.equal(res.status, 400);
    assert.equal(ErrorBody.parse(await res.json()).error, 'bad_request');
    assert.equal(res.headers.get('access-control-allow-origin'), 'https://okbite.md');
  }
  for (const device of [null, '', 'invalid']) {
    assert.equal((await handler(req(undefined, device))).status, 400);
  }
  assert.equal((await handler(req('', null, 'OPTIONS'))).status, 204);
  const method = await handler(req('', id, 'POST'));
  assert.equal(method.status, 405);
  assert.equal(method.headers.get('allow'), 'GET, OPTIONS');
  assert.equal(calls, 0);
});
Deno.test('lookup validates responses and safely wraps product loading failures', async () => {
  for (
    const dependencies of [
      {
        loadProduct: async () => {
          throw new Error('secret');
        },
        logEvent: async () => {},
      },
      { loadProduct: async () => ({ product: {}, score: {} }) as never, logEvent: async () => {} },
    ]
  ) {
    const res = await createHandler(dependencies)(req());
    assert.equal(res.status, 502);
    assert.equal(res.headers.get('access-control-allow-origin'), 'https://okbite.md');
    const error = ErrorBody.parse(await res.json());
    assert.equal(error.error, 'upstream_failed');
    assert.equal(error.message.includes('secret'), false);
  }
});

Deno.test('optional analytics failures preserve found and not_found lookup responses', async () => {
  // Reuse the existing prototype fixture, not a new nutrition/source contract.
  const records = JSON.parse(await Deno.readTextFile(
    new URL('../../../apps/mobile/src/test/preview-data.json', import.meta.url),
  ));
  const found = LookupResponse.parse({ status: 'found', ...records[0] });
  if (found.status !== 'found') throw new Error('Expected found fixture');
  for (const result of [null, { product: found.product, score: found.score }]) {
    let logged = 0;
    const res = await createHandler({
      loadProduct: async () => result,
      logEvent: async () => { logged++; throw new Error('analytics unavailable'); },
    })(req());
    assert.equal(res.status, 200);
    assert.deepEqual(LookupResponse.parse(await res.json()), result ? found : { status: 'not_found' });
    assert.equal(logged, 1);
    assert.equal(res.headers.get('access-control-allow-origin'), 'https://okbite.md');
  }
});
