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
