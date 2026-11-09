import { strict as assert } from 'node:assert';
import { createHandler } from './index.ts';

Deno.test('moderation requires a genuine moderator identity before invoking any action', async () => {
  let writes = 0;
  const handler = createHandler({
    authorize: async () => null,
    moderate: async () => {
      writes++;
    },
  });
  const response = await handler(
    new Request('http://local/moderate', {
      method: 'POST',
      headers: { authorization: 'Bearer forged', origin: 'https://okbite.md' },
      body: JSON.stringify({ action: 'close_report', reportId: crypto.randomUUID() }),
    }),
  );
  assert.equal(response.status, 401);
  assert.equal(writes, 0);
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://okbite.md');
});

Deno.test('moderation validates requests before writes and uses only the authorized actor', async () => {
  const actor = crypto.randomUUID();
  const id = crypto.randomUUID();
  const writes: { actor: string; input: unknown }[] = [];
  const handler = createHandler({
    authorize: async () => actor,
    moderate: async (input, identity) => {
      writes.push({ input, actor: identity });
    },
  });
  const post = (body: string) =>
    handler(
      new Request('http://local/moderate', {
        method: 'POST',
        body,
        headers: { origin: 'https://okbite.md' },
      }),
    );
  for (
    const body of [
      '{',
      '{}',
      JSON.stringify({ action: 'hide', productId: id, reason: ' ' }),
      JSON.stringify({ action: 'verify', productId: id, product: { name: '' } }),
      JSON.stringify({ action: 'close_report', reportId: 'invalid' }),
    ]
  ) {
    assert.equal((await post(body)).status, 400);
  }
  assert.deepEqual(writes, []);
  assert.equal(
    (await post(
      JSON.stringify({ action: 'close_report', reportId: id, actor: 'forged', moderator: true }),
    )).status,
    200,
  );
  assert.deepEqual(writes, [{ actor, input: { action: 'close_report', reportId: id } }]);
  const method = await handler(new Request('http://local/moderate'));
  assert.equal(method.status, 405);
  assert.equal(method.headers.get('allow'), 'POST, OPTIONS');
  const preflight = await handler(
    new Request('http://local/moderate', {
      method: 'OPTIONS',
      headers: { origin: 'https://okbite.md' },
    }),
  );
  assert.equal(preflight.status, 204);
  assert.equal(writes.length, 1);
});

Deno.test('verify rejects a bad barcode check digit before invoking the mutation', async () => {
  let writes = 0;
  const handler = createHandler({
    authorize: async () => crypto.randomUUID(),
    moderate: async () => {
      writes++;
    },
  });
  const request = (code: string | null) =>
    new Request('http://local/moderate', {
      method: 'POST',
      body: JSON.stringify({
        action: 'verify',
        productId: crypto.randomUUID(),
        product: {
          code,
          name: 'Fixture',
          brand: 'Test',
          quantity: '100 g',
          categorySlug: 'iaurt',
          unit: 'g',
          ingredientsText: 'lapte',
          nutrients: {
            kcal: 63,
            fat: 2.5,
            sat: 1.6,
            sugar: 4.1,
            salt: 0.1,
            protein: 3.6,
            fiber: null,
            fruitVegPct: null,
          },
        },
      }),
    });
  assert.equal((await handler(request('4840001000015'))).status, 400);
  assert.equal(writes, 0);
  assert.equal((await handler(request('4840001000014'))).status, 200);
  assert.equal((await handler(request(null))).status, 200);
  assert.equal(writes, 2);
});
