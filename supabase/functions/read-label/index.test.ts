import { strict as assert } from 'node:assert';
import { createClient } from '@supabase/supabase-js';
import { HttpError } from '../_lib/http.ts';
import { UpstreamError } from '../_lib/claude.ts';
import { createHandler } from './index.ts';
import { createService } from './service.ts';

for (const failure of ['storage', 'quota'] as const) {
  Deno.test(`read-label reports a failed ${failure} cleanup as an upstream failure`, async () => {
    const requests: string[] = [];
    const db = createClient('http://127.0.0.1:1', 'test-key', {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: async (url) => {
          const path = new URL(String(url)).pathname;
          requests.push(path);
          if (path.endsWith('/reserve_usage')) return Response.json(42);
          if (path.endsWith('/uploads') && failure === 'storage') {
            return Response.json({ message: 'private storage error' }, { status: 500 });
          }
          if (path.endsWith('/usage_events') && failure === 'quota') {
            return Response.json({ message: 'private quota error' }, { status: 500 });
          }
          return Response.json([]);
        },
      },
    });
    const handler = createHandler(createService({
      adminClient: () => db,
      saveJpeg: async (_photo, device, suffix) => {
        if (suffix === 'nutrition') throw new HttpError(400);
        return `${device}/first-ingredients.jpg`;
      },
      askClaude: async () => assert.fail('an invalid photo pair must not reach the provider'),
    }));
    const response = await handler(
      new Request('http://local/read-label', {
        method: 'POST',
        headers: { 'x-device-id': crypto.randomUUID() },
        body: JSON.stringify({ ingredientsImage: 'first', nutritionImage: 'invalid' }),
      }),
    );
    assert.deepEqual(requests, [
      '/rest/v1/rpc/reserve_usage',
      '/storage/v1/object/uploads',
      '/rest/v1/usage_events',
    ]);
    assert.equal(response.status, 502);
    assert.equal((await response.json()).error, 'upstream_failed');
  });
}

Deno.test('read-label cleans up a photo pair too large for the provider before calling it', async () => {
  const requests: string[] = [];
  const db = createClient('http://127.0.0.1:1', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (url, init) => {
        const path = new URL(String(url)).pathname;
        const method = init?.method ?? 'GET';
        requests.push(method);
        if (path.endsWith('/reserve_usage')) return Response.json(42);
        if (method === 'GET') return new Response(new Uint8Array(1_500_000));
        return Response.json([]);
      },
    },
  });
  let providerCalls = 0;
  const handler = createHandler(createService({
    adminClient: () => db,
    saveJpeg: async (_photo, device, suffix) => `${device}/stored-${suffix}.jpg`,
    askClaude: async () => {
      providerCalls++;
      throw new Error('Photo pair exceeds provider limits');
    },
  }));
  const response = await handler(
    new Request('http://local/read-label', {
      method: 'POST',
      headers: { 'x-device-id': crypto.randomUUID() },
      body: JSON.stringify({ ingredientsImage: 'first', nutritionImage: 'second' }),
    }),
  );
  assert.equal(response.status, 502);
  assert.equal(providerCalls, 0);
  assert.deepEqual(requests, ['POST', 'GET', 'GET', 'DELETE', 'DELETE']);
});

Deno.test('read-label keeps the photos and returns blank fields to type in when the AI fails', async () => {
  const requests: string[] = [];
  const db = createClient('http://127.0.0.1:1', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (url, init) => {
        const path = new URL(String(url)).pathname;
        requests.push(init?.method ?? 'GET');
        if (path.endsWith('/reserve_usage')) return Response.json(42);
        if ((init?.method ?? 'GET') === 'GET') return new Response(new Uint8Array(10));
        return Response.json([]);
      },
    },
  });
  const handler = createHandler(createService({
    adminClient: () => db,
    saveJpeg: async (_photo, device, suffix) => `${device}/stored-${suffix}.jpg`,
    askClaude: async () => { throw new UpstreamError('Claude request failed'); },
  }));
  const device = crypto.randomUUID();
  const response = await handler(
    new Request('http://local/read-label', {
      method: 'POST',
      headers: { 'x-device-id': device },
      body: JSON.stringify({ ingredientsImage: 'first', nutritionImage: null }),
    }),
  );
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ingredientsText, null);
  assert.deepEqual(Object.values(body.nutrients), Array(8).fill(null));
  assert.equal(body.unclear.length, 9);
  assert.equal(body.ingredientsPhotoPath, `${device}/stored-ingredients.jpg`);
  assert.equal(requests.includes('DELETE'), false); // the photos stay for the shopper's submission
});

const ANSWER = JSON.stringify({
  ingredientsText: 'lapte, zahăr',
  unit: 'g',
  perPortionOnly: false,
  kcal: '63',
  fat: '2,5',
  sat: '1,6',
  sugar: '4,1',
  salt: '0,1',
  protein: '3,6',
  fiber: '',
  fruitVegPct: '',
});
const NUTRIENTS = ['kcal', 'fat', 'sat', 'sugar', 'salt', 'protein', 'fiber', 'fruitVegPct'];

function modeHandler(ask: () => Promise<string> = async () => ANSWER) {
  const calls: { images: number; prompt: string }[] = [];
  const saved: string[] = [];
  const deleted: string[] = [];
  const db = createClient('http://127.0.0.1:1', 'test-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: async (url, init) => {
        const path = new URL(String(url)).pathname;
        const method = init?.method ?? 'GET';
        if (method === 'DELETE') deleted.push(path);
        if (path.endsWith('/reserve_usage')) return Response.json(42);
        if (method === 'GET') return new Response(new Uint8Array(10));
        return Response.json([]);
      },
    },
  });
  const handler = createHandler(createService({
    adminClient: () => db,
    saveJpeg: async (_photo, device, suffix) => {
      saved.push(suffix);
      return `${device}/stored-${suffix}.jpg`;
    },
    askClaude: async (images, prompt) => {
      calls.push({ images: images.length, prompt });
      return await ask();
    },
  }));
  const post = (body: unknown) =>
    handler(
      new Request('http://local/read-label', {
        method: 'POST',
        headers: { 'x-device-id': crypto.randomUUID() },
        body: JSON.stringify(body),
      }),
    );
  return { calls, saved, deleted, post };
}

for (const [mode, reason] of [['none', 'not_printed'], ['skipped', 'not_photographed']] as const) {
  Deno.test(`read-label mode '${mode}' does not ask about nutrition`, async () => {
    const t = modeHandler();
    const res = await t.post({ ingredientsImage: 'a', nutritionImage: null, nutrition: mode });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(t.calls.map((c) => c.images), [1]);
    assert.doesNotMatch(t.calls[0].prompt, /nutrition|kcal/i);
    assert.deepEqual(Object.values(body.nutrients), Array(8).fill(null));
    assert.deepEqual(body.unclear, []);
    for (const key of NUTRIENTS) assert.equal(body.reasons[key], reason);
    assert.equal(body.reasons.ingredientsText, 'read');
    assert.equal(body.nutritionPhotoPath, null);
  });
}

Deno.test("read-label mode 'same_photo' reads both from the ingredients photo", async () => {
  const t = modeHandler();
  const body =
    await (await t.post({ ingredientsImage: 'a', nutritionImage: null, nutrition: 'same_photo' }))
      .json();
  assert.deepEqual(t.calls.map((c) => c.images), [1]);
  assert.match(t.calls[0].prompt, /nutrition table/i);
  assert.equal(body.nutrients.kcal, 63);
  assert.equal(body.reasons.kcal, 'read');
  assert.equal(body.reasons.fiber, 'not_printed');
  assert.deepEqual(t.saved, ['ingredients']);
});

Deno.test("read-label mode 'separate' reads the second photo", async () => {
  const t = modeHandler();
  const body =
    await (await t.post({ ingredientsImage: 'a', nutritionImage: 'b', nutrition: 'separate' }))
      .json();
  assert.deepEqual(t.calls.map((c) => c.images), [2]);
  assert.deepEqual(t.saved, ['ingredients', 'nutrition']);
  assert.equal(body.reasons.salt, 'read');
  assert.ok(body.nutritionPhotoPath.endsWith('stored-nutrition.jpg'));
});

Deno.test('read-label old clients without a mode keep working', async () => {
  const one = modeHandler();
  await one.post({ ingredientsImage: 'a', nutritionImage: null });
  assert.match(one.calls[0].prompt, /nutrition table/i);
  const two = modeHandler();
  await two.post({ ingredientsImage: 'a', nutritionImage: 'b' });
  assert.deepEqual(two.calls.map((c) => c.images), [2]);
});

Deno.test('read-label enrich read sends only the nutrition photo', async () => {
  const t = modeHandler();
  const res = await t.post({ ingredientsImage: null, nutritionImage: 'b', nutrition: 'separate' });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(t.calls.map((c) => c.images), [1]);
  assert.deepEqual(t.saved, ['nutrition']);
  assert.doesNotMatch(t.calls[0].prompt, /ingredients list/i);
  assert.equal(body.ingredientsPhotoPath, null);
  assert.equal(body.ingredientsText, null);
  assert.equal(body.reasons.ingredientsText, 'not_photographed');
  assert.equal(body.nutrients.kcal, 63);
});

for (
  const bad of [
    { ingredientsImage: 'a', nutritionImage: 'b', nutrition: 'none' },
    { ingredientsImage: 'a', nutritionImage: 'b', nutrition: 'same_photo' },
    { ingredientsImage: 'a', nutritionImage: null, nutrition: 'separate' },
    { ingredientsImage: null, nutritionImage: null, nutrition: 'separate' },
    { ingredientsImage: null, nutritionImage: 'b', nutrition: 'skipped' },
    { ingredientsImage: null, nutritionImage: 'b' },
    { ingredientsImage: 'a', nutritionImage: null, nutrition: 'later' },
  ]
) {
  Deno.test(`read-label rejects ${JSON.stringify(bad)} before any work`, async () => {
    const t = modeHandler();
    const res = await t.post(bad);
    assert.equal(res.status, 400);
    assert.equal(t.calls.length, 0);
    assert.deepEqual(t.saved, []);
  });
}

for (const mode of ['same_photo', 'none'] as const) {
  Deno.test(`read-label returns 'failed' and keeps the photos when the AI fails (mode '${mode}')`, async () => {
    const t = modeHandler(async () => {
      throw new UpstreamError('Claude deadline reached');
    });
    const res = await t.post({ ingredientsImage: 'a', nutritionImage: null, nutrition: mode });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.reasons.ingredientsText, 'failed');
    assert.equal(body.ingredientsText, null);
    assert.deepEqual(Object.values(body.nutrients), Array(8).fill(null));
    const nutrientReason = mode === 'none' ? 'not_printed' : 'failed';
    for (const key of NUTRIENTS) assert.equal(body.reasons[key], nutrientReason);
    assert.deepEqual(
      body.unclear,
      mode === 'none' ? ['ingredientsText'] : [...NUTRIENTS, 'ingredientsText'],
    );
    assert.deepEqual(t.deleted, []);
  });
}

Deno.test("read-label returns 'failed' when the AI answer is not JSON", async () => {
  const t = modeHandler(async () => 'Nu pot citi.');
  const body =
    await (await t.post({ ingredientsImage: 'a', nutritionImage: 'b', nutrition: 'separate' }))
      .json();
  assert.equal(body.reasons.kcal, 'failed');
  assert.equal(body.reasons.ingredientsText, 'failed');
});
