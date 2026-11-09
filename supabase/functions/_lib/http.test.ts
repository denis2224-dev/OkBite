import { strict as assert } from 'node:assert';
import { z } from 'npm:zod@3.23.8';
import { ErrorBody } from '../_shared/contract.ts';
import { cors, fail, HttpError, json, readDeviceId, readJsonBody, withCors } from './http.ts';

const request = (origin?: string, method = 'GET') =>
  new Request('http://local', {
    method,
    headers: origin ? { origin } : {},
  });
Deno.test('CORS accepts exact app origins and rejects spoofed origins', () => {
  for (
    const origin of [
      'https://okbite.md',
      'https://okbite.app',
      'https://www.okbite.app',
      'https://okbite-ir1.pages.dev',
      'https://0f7ca672.okbite-ir1.pages.dev',
      'https://r2-w1-cors-origins.okbite-ir1.pages.dev',
      'https://pr-12.okbite-ir1.pages.dev',
      'https://branch.okbite-ir1.pages.dev',
      'https://a-b.okbite-ir1.pages.dev',
      'http://localhost:8081',
    ]
  ) {
    assert.equal(cors(request(origin)), null);
    assert.equal(
      withCors(request(origin), fail('bad_request', 'invalid', 400))
        .headers.get('access-control-allow-origin'),
      origin,
    );
    const preflight = cors(request(origin, 'OPTIONS'))!;
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
    assert.match(preflight.headers.get('access-control-allow-headers')!, /x-device-id/);
  }
  for (
    const origin of [
      'https://www.okbite.md',
      'https://okbite.app.evil.test',
      'https://www.okbite.app.evil.test',
      'http://okbite.app',
      'http://www.okbite.app',
      'https://okbite.md.evil.test',
      'https://okbite.pages.dev',
      'https://branch.okbite.pages.dev',
      'https://okbite.pages.dev.evil.test',
      'https://okbite-ir1.pages.dev.evil.test',
      'https://pr-12.okbite-ir1.pages.dev.evil.test',
      'https://a.b.okbite-ir1.pages.dev',
      'https://evil-okbite-ir1.pages.dev',
      'http://okbite-ir1.pages.dev',
      'https://evil-okbite.pages.dev',
      'https://evilokbite.pages.dev',
      'http://okbite.md',
      'http://www.okbite.md',
      'https://www.okbite.md.evil.test',
      'http://a.okbite.pages.dev',
      'https://a.okbite.pages.dev.evil.test',
      'https://a.b.okbite.pages.dev',
      'null',
      'http://localhost:80810',
      'https://okbite.app:443',
      'https://okbite.app/',
    ]
  ) {
    for (const method of ['GET', 'OPTIONS']) {
      const response = cors(request(origin, method))!;
      assert.equal(response.status, 403);
      assert.equal(response.headers.has('access-control-allow-origin'), false);
    }
  }
  assert.equal(cors(request()), null);
  assert.equal(withCors(request(), json({})).headers.has('access-control-allow-origin'), false);
});
Deno.test('preflight rejects unsupported methods and headers', () => {
  const cases: Record<string, string>[] = [{ 'access-control-request-method': 'DELETE' }, {
    'access-control-request-headers': 'x-unknown',
  }];
  for (const headers of cases) {
    const req = new Request('http://local', {
      method: 'OPTIONS',
      headers: { origin: 'https://okbite.app', ...headers },
    });
    assert.equal(cors(req)!.status, 400);
    assert.equal(cors(req)!.headers.get('access-control-allow-origin'), 'https://okbite.app');
  }
});
Deno.test('device ids must be UUIDs and normalize case', () => {
  for (const id of [undefined, '', 'abc', 'a/b', 'a'.repeat(1000)]) {
    const req = new Request('http://local', { headers: id ? { 'x-device-id': id } : {} });
    assert.throws(() => readDeviceId(req), (e) => e instanceof HttpError && e.status === 400);
  }
  const id = crypto.randomUUID();
  assert.equal(
    readDeviceId(
      new Request('http://local', {
        headers: { 'x-device-id': id.toUpperCase() },
      }),
    ),
    id,
  );
});
Deno.test('JSON body validates input and enforces actual byte limits', async () => {
  const schema = z.object({ name: z.string() });
  const req = (body: string, headers = {}) =>
    new Request('http://local', {
      method: 'POST',
      body,
      headers,
    });
  assert.deepEqual(await readJsonBody(req('{"name":"șț"}'), schema), { name: 'șț' });
  for (const body of ['invalid', '{', '{"name":2}', '']) {
    await assert.rejects(() => readJsonBody(req(body), schema), HttpError);
  }
  for (const headers of [{}, { 'content-length': '1' }, { 'content-length': '999' }]) {
    await assert.rejects(
      () => readJsonBody(req('{"name":"șț"}', headers), schema, 13),
      (e) => e instanceof HttpError && e.status === 400,
    );
  }
  assert.deepEqual(await readJsonBody(req('{"name":"a"}'), schema, 12), { name: 'a' });
  const stream = new ReadableStream({
    start(c) {
      c.enqueue(new Uint8Array(1_000_000));
      c.enqueue(new Uint8Array(1_000_001));
      c.close();
    },
  });
  await assert.rejects(() =>
    readJsonBody(
      new Request('http://local', {
        method: 'POST',
        body: stream,
      }),
      schema,
    ), HttpError);
});
Deno.test('HTTP responses serialize JSON and validate errors', async () => {
  assert.equal(json({ ok: true }, 201).status, 201);
  assert.equal(json({}).headers.get('content-type'), 'application/json; charset=utf-8');
  const error = fail('bad_request', 'Invalid', 400);
  assert.equal(error.status, 400);
  assert.deepEqual(ErrorBody.parse(await error.json()), {
    error: 'bad_request',
    message: 'Invalid',
  });
});
