import { strict as assert } from 'node:assert';
import { adminClient } from '../_lib/client.ts';
import { integrationTest } from '../_lib/integration.ts';

integrationTest('gateway diagnostics redact secrets before persistent storage', async () => {
  const db = adminClient();
  const device = crypto.randomUUID();
  try {
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/client-error`, {
      method: 'POST', headers: {
        apikey: Deno.env.get('SUPABASE_ANON_KEY')!,
        'x-device-id': device, 'content-type': 'application/json', origin: 'https://okbite.md',
      },
      body: JSON.stringify({ message: 'Failure https://okbite.md/admin#access_token=private-callback',
        stack: 'at capture https://okbite.md/capture?token=private-stack\nBearer private-key',
        screen: '/capture', appVersion: '1', platform: 'web' }),
    });
    assert.equal(response.status, 200, await response.text());
    const { data, error } = await db.from('client_errors').select('message,stack').eq('device_id', device).single();
    assert.equal(error, null);
    assert.deepEqual(data, { message: 'Failure https://okbite.md/admin',
      stack: 'at capture https://okbite.md/capture\nBearer [redacted]' });
  } finally {
    assert.equal((await db.from('client_errors').delete().eq('device_id', device)).error, null);
  }
});
