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

Deno.test('diagnostics redact callback credentials in messages and stacks before storage', async () => {
  const secrets = ['callback-secret', 'stack-secret', 'person@example.test', 'sb_secret_privatekey', 'sk-ant-privatekey'];
  const response = await createHandler(async (_id, report) => {
    const stored = JSON.stringify(report);
    for (const secret of secrets) assert.equal(stored.includes(secret), false, secret);
    assert.ok(report.stack?.includes('at capture'));
    assert.ok(report.message.includes('Failure'));
    return true;
  })(request({ ...payload,
    message: 'Failure https://okbite.md/admin#access_token=callback-secret person@example.test',
    stack: 'at capture https://okbite.md/capture?token=stack-secret\nAuthorization: Bearer sb_secret_privatekey\nsk-ant-privatekey',
  }));
  assert.equal(response.status, 200);
});

Deno.test('body byte limits and malformed UTF-8 fail before diagnostics admission', async () => {
  let writes = 0;
  const handler = createHandler(async () => { writes++; return true; });
  const headers = { 'x-device-id': device, 'content-type': 'application/json' };
  for (const body of [' '.repeat(16001), new Uint8Array([0xff]), '{', JSON.stringify({ ...payload, message: '' })]) {
    const result = await handler(new Request('https://local/client-error', { method: 'POST', headers, body }));
    assert.equal(result.status, 400);
  }
  assert.equal(writes, 0);
});

Deno.test('redaction preserves schema bounds when replacement text expands', async () => {
  const response = await createHandler(async (_id, report) => {
    assert.ok(report.message.length <= 1000);
    assert.equal(report.message.includes('a@b.co'), false);
    return true;
  })(request({ ...payload, message: 'a@b.co'.repeat(166) }));
  assert.equal(response.status, 200);
});

Deno.test('quoted credential fields and quoted multiword values are fully redacted', async () => {
  for (const message of [
    '{"password":"my-private-password","refresh_token":"my-private-refresh-token"}',
    'password="two word secret"', "api_key='two word secret'",
    '{"password":"escaped \\\"word secret"}',
  ]) {
    const response = await createHandler(async (_id, report) => {
      assert.equal(/private|word|secret/.test(report.message), false, report.message);
      return true;
    })(request({ ...payload, message }));
    assert.equal(response.status, 200, message);
  }
});
