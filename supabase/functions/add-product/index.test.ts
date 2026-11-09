import { strict as assert } from 'node:assert';
import { createHandler } from './index.ts';
import { createHandler as reportHandler } from '../report/index.ts';

const device = 'c6000000-0000-4000-8000-000000000001';
Deno.test('submission handlers validate method, device and body before writes; errors carry CORS', async () => {
  let calls = 0;
  const handlers = [
    createHandler(async () => {
      calls++;
      return { status: 'not_found' };
    }),
    reportHandler(async () => {
      calls++;
      return { status: 'ok' };
    }),
  ];
  for (const handler of handlers) {
    const headers = { origin: 'https://okbite.md', 'x-device-id': device };
    const invalid = await handler(
      new Request('http://local/', { method: 'POST', headers, body: '{}' }),
    );
    assert.equal(invalid.status, 400);
    assert.equal(invalid.headers.get('access-control-allow-origin'), headers.origin);
    assert.equal((await handler(new Request('http://local/', { headers }))).status, 405);
    assert.equal(
      (await handler(new Request('http://local/', { method: 'OPTIONS', headers }))).status,
      204,
    );
    assert.equal(
      (await handler(new Request('http://local/', { method: 'POST', body: '{}' }))).status,
      400,
    );
  }
  assert.equal(calls, 0);
});

Deno.test('add-product saves a product without a category as necunoscut', async () => {
  const seen: (string | undefined)[] = [];
  const handler = createHandler(async (input) => {
    seen.push(input.categorySlug);
    return { status: 'not_found' };
  });
  const body = {
    code: null,
    name: 'Biscuiți',
    brand: '',
    quantity: '',
    unit: 'g',
    ingredientsText: 'făină, zahăr',
    nutrients: {
      kcal: null,
      fat: null,
      sat: null,
      sugar: null,
      salt: null,
      protein: null,
      fiber: null,
      fruitVegPct: null,
    },
    photoPath: null,
    ingredientsPhotoPath: `${device}/i.jpg`,
    nutritionPhotoPath: null,
  };
  const headers = { origin: 'https://okbite.md', 'x-device-id': device };
  for (const categorySlug of [undefined, 'iaurt']) {
    const response = await handler(
      new Request('http://local/', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ...body, categorySlug }),
      }),
    );
    assert.equal(response.status, 200);
  }
  assert.deepEqual(seen, ['necunoscut', 'iaurt']);
});
