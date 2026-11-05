import { strict as assert } from 'node:assert';
import { createHandler } from './index.ts';

const device = '10000000-0000-4000-8000-000000000001';
const payload = { message: 'Failure', stack: null, screen: '/scan', appVersion: '1', platform: 'ios' };
const request = (body: unknown = payload, id = device) => new Request('https://local/client-error', {
  method: 'POST', headers: { 'x-device-id': id, 'Content-Type': 'application/json', origin: 'https://okbite.md' },
  body: JSON.stringify(body),
});

Deno.test('client errors validate method, device and bounded payload before storage', async () => {
  let writes = 0;
  const handler = createHandler(async () => { writes++; return true; });
  for (const req of [request(payload, 'bad'), request({ ...payload, stack: 'x'.repeat(2001) }),
    request({ ...payload, platform: 'other' }), request({ ...payload, secret: 'bad' }),
    new Request('https://local/client-error')]) {
    assert.equal((await handler(req)).status, req.method === 'GET' ? 405 : 400);
  }
  assert.equal(writes, 0);
});

Deno.test('client errors use the atomic store result for quota admission', async () => {
  const handler = createHandler(async (id, report) => {
    assert.equal(id, device); assert.deepEqual(report, payload); return true;
  });
  const response = await handler(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://okbite.md');
  const limited = await createHandler(async () => false)(request());
  assert.equal(limited.status, 429);
  assert.equal((await limited.json()).error, 'rate_limited');
});

Deno.test('storage failures expose no diagnostics and preflight writes nothing', async () => {
  const handler = createHandler(async () => { throw new Error('server key'); });
  const response = await handler(request());
  assert.equal(response.status, 502);
  assert.equal((await response.text()).includes('server key'), false);
  assert.equal((await handler(new Request('https://local/client-error', {
    method: 'OPTIONS', headers: { origin: 'https://okbite.md' },
  }))).status, 204);
});
