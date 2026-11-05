import { strict as assert } from 'node:assert';
import { askClaude, parseJsonObject, toBase64, UpstreamError } from './claude.ts';

const KEY = 'test-key-not-real';
const ok = (text: string, stop = 'end_turn') =>
  new Response(JSON.stringify({
    stop_reason: stop,
    content: [{ type: 'thinking', thinking: '' }, { type: 'text', text }],
  }));
const fake = (responses: (Response | Error)[]) => {
  const calls: RequestInit[] = [];
  const fetch = ((_url: string, init: RequestInit) => {
    calls.push(init);
    const next = responses.shift()!;
    return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
  }) as unknown as typeof globalThis.fetch;
  return { calls, deps: { fetch, apiKey: KEY, sleep: () => Promise.resolve() } };
};

Deno.test('askClaude sends the documented request and returns the text block', async () => {
  const { calls, deps } = fake([ok('{"a":1}')]);
  assert.equal(await askClaude(['/9j/AA==', '/9j/BB=='], 'citește', deps), '{"a":1}');
  const headers = calls[0].headers as Record<string, string>;
  assert.equal(headers['x-api-key'], KEY);
  assert.equal(headers['anthropic-version'], '2026-10-21');
  const body = JSON.parse(calls[0].body as string);
  assert.equal(body.model, 'claude-haiku-5-5');
  assert.deepEqual(
    body.messages[0].content.map((b: { type: string }) => b.type),
    ['image', 'image', 'text'],
  );
  assert.deepEqual(body.messages[0].content[0].source, {
    type: 'base64',
    media_type: 'image/jpeg',
    data: '/9j/AA==',
  });
  assert.equal('temperature' in body, false); // rejected on API version 2026-10-21
});

Deno.test('askClaude retries 429/529/5xx and network errors, then gives up', async () => {
  const waits: number[] = [];
  const { calls, deps } = fake([
    new Response('busy', { status: 529, headers: { 'retry-after': '2' } }),
    new TypeError('network'),
    ok('gata'),
  ]);
  const sleep = (ms: number) => (waits.push(ms), Promise.resolve());
  assert.equal(await askClaude(['x'], 'p', { ...deps, sleep }), 'gata');
  assert.equal(calls.length, 3);
  assert.equal(waits[0], 2000);
  const failing = fake([
    new Response('', { status: 500 }),
    new Response('', { status: 503 }),
    new Response('', { status: 429 }),
  ]);
  await assert.rejects(askClaude(['x'], 'p', failing.deps), UpstreamError);
  assert.equal(failing.calls.length, 3);
});

Deno.test('askClaude does not retry client errors and never leaks the key or provider body', async () => {
  const { calls, deps } = fake([new Response(`{"error":"bad ${KEY}"}`, { status: 400 })]);
  const error = await askClaude(['x'], 'p', deps).catch((e) => e);
  assert.ok(error instanceof UpstreamError);
  assert.equal(calls.length, 1);
  assert.equal(String(error.message).includes(KEY), false);
});

Deno.test('askClaude rejects refusals, truncation, empty answers, missing key and bad images', async () => {
  for (const r of [ok('x', 'refusal'), ok('x', 'max_tokens'), ok(''), new Response('not json')]) {
    await assert.rejects(askClaude(['x'], 'p', fake([r]).deps), UpstreamError);
  }
  const none = fake([]);
  await assert.rejects(askClaude(['x'], 'p', { ...none.deps, apiKey: '' }), UpstreamError);
  await assert.rejects(askClaude([], 'p', none.deps), UpstreamError);
  await assert.rejects(askClaude(['a', 'b', 'c'], 'p', none.deps), UpstreamError);
  await assert.rejects(askClaude(['a'.repeat(2_000_001)], 'p', none.deps), UpstreamError);
  assert.equal(none.calls.length, 0);
});

Deno.test('parseJsonObject reads fenced JSON; toBase64 round-trips large inputs', () => {
  assert.deepEqual(parseJsonObject('```json\n{"x":"0,3"}\n```'), { x: '0,3' });
  assert.throws(() => parseJsonObject('null'), UpstreamError);
  const bytes = new Uint8Array(100_000).map((_, i) => i % 256);
  assert.deepEqual(Uint8Array.from(atob(toBase64(bytes)), (c) => c.charCodeAt(0)), bytes);
});
