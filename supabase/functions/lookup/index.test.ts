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
Deno.test('lookup rejects invalid barcode check digits before database or telemetry I/O', async () => {
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
  for (const code of ['4840001000017', '96385075', '4840001009995']) {
    const response = await handler(req(`?code=${code}`));
    assert.equal(response.status, 400);
    assert.equal(ErrorBody.parse(await response.json()).error, 'bad_request');
    assert.equal(response.headers.get('access-control-allow-origin'), 'https://okbite.md');
  }
  assert.equal(calls, 0);
});

Deno.test('lookup accepts checksum-valid EAN-8 and EAN-13 codes without changing selectors', async () => {
  const selectors: unknown[] = [];
  const handler = createHandler({
    loadProduct: async (by) => {
      selectors.push(by);
      return null;
    },
    logEvent: async () => {},
  });
  for (const code of ['96385074', '4840001000014']) {
    const response = await handler(req(`?code=${code}`));
    assert.equal(response.status, 200);
    assert.deepEqual(LookupResponse.parse(await response.json()), { status: 'not_found' });
  }
  assert.deepEqual(selectors, [{ code: '96385074' }, { code: '4840001000014' }]);
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
  const records = JSON.parse(
    await Deno.readTextFile(
      new URL('../../../apps/mobile/src/test/preview-data.json', import.meta.url),
    ),
  );
  const found = LookupResponse.parse({ status: 'found', ...records[0] });
  if (found.status !== 'found') throw new Error('Expected found fixture');
  for (const result of [null, { product: found.product, score: found.score }]) {
    let logged = 0;
    const res = await createHandler({
      loadProduct: async () => result,
      logEvent: async () => {
        logged++;
        throw new Error('analytics unavailable');
      },
    })(req());
    assert.equal(res.status, 200);
    assert.deepEqual(
      LookupResponse.parse(await res.json()),
      result ? found : { status: 'not_found' },
    );
    assert.equal(logged, 1);
    assert.equal(res.headers.get('access-control-allow-origin'), 'https://okbite.md');
  }
});

Deno.test('lookup telemetry diagnostics exclude exception details and device identifiers', async () => {
  const messages: unknown[][] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => {
    messages.push(args);
  };
  try {
    const response = await createHandler({
      loadProduct: async () => null,
      logEvent: async () => {
        throw new Error(`private credential ${id}`);
      },
    })(req());
    assert.equal(response.status, 200);
    assert.equal(messages.length, 1);
    assert.ok(messages[0].length > 0);
    assert.doesNotMatch(JSON.stringify(messages), /private credential|c2000000/);
  } finally {
    console.warn = original;
  }
});
