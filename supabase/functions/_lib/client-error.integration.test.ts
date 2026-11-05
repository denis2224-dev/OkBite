import { strict as assert } from 'node:assert';
import { createClient } from '@supabase/supabase-js';
import { adminClient } from './client.ts';
import { integrationTest } from './integration.ts';
import { ClientErrorRequest, ClientErrorResponse, ErrorBody } from '../_shared/contract.ts';

integrationTest(
  'diagnostics admission is atomic, rolls over, stays private and works through the gateway',
  async () => {
    const db = adminClient();
    const device = crypto.randomUUID();
    const report = ClientErrorRequest.parse({
      message: 'Test D7',
      stack: null,
      screen: '/capture',
      appVersion: '1.0',
      platform: 'web',
    });
    const args = {
      p_device: device.toUpperCase(),
      p_message: report.message,
      p_stack: report.stack,
      p_screen: report.screen,
      p_app_version: report.appVersion,
      p_platform: report.platform,
    };
    const endpoint = `${Deno.env.get('SUPABASE_URL')}/functions/v1/client-error`;
    const post = (body: unknown) =>
      fetch(endpoint, {
        method: 'POST',
        headers: {
          apikey: Deno.env.get('SUPABASE_ANON_KEY')!,
          'content-type': 'application/json',
          'x-device-id': device,
          origin: 'https://okbite.md',
        },
        body: JSON.stringify(body),
      });
    try {
      assert.equal(
        (await db.from('client_errors').insert(Array.from({ length: 49 }, () => ({
          device_id: device,
          message: 'Test D7',
          screen: '/capture',
          app_version: '1.0',
          platform: 'web',
        })))).error,
        null,
      );
      const admissions = await Promise.all(
        Array.from({ length: 6 }, () => db.rpc('record_client_error', args)),
      );
      for (const result of admissions) assert.equal(result.error, null);
      assert.equal(admissions.filter((r) => r.data === true).length, 1);
      assert.equal(admissions.filter((r) => r.data === false).length, 5);
      const rows = await db.from('client_errors').select('id').eq('device_id', device);
      assert.equal(rows.error, null);
      assert.equal(rows.data?.length, 50);
      const limited = await post(report);
      assert.equal(limited.status, 429);
      assert.equal(ErrorBody.parse(await limited.json()).error, 'rate_limited');
      assert.equal(
        (await db.from('client_errors').update({
          created_at: new Date(Date.now() - 25 * 3_600_000).toISOString(),
        }).eq('device_id', device)).error,
        null,
      );
      const accepted = await post(report);
      assert.equal(accepted.status, 200, await accepted.clone().text());
      assert.deepEqual(ClientErrorResponse.parse(await accepted.json()), { status: 'ok' });
      assert.equal(accepted.headers.get('access-control-allow-origin'), 'https://okbite.md');
      const invalid = await post({ ...report, screen: '/admin#token=private' });
      assert.equal(invalid.status, 400);
      assert.equal(ErrorBody.parse(await invalid.json()).error, 'bad_request');
      const recent = await db.from('client_errors').select('id', { count: 'exact' })
        .eq('device_id', device).gte('created_at', new Date(Date.now() - 86_400_000).toISOString());
      assert.equal(recent.error, null);
      assert.equal(recent.count, 1);
      const anon = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      assert.equal((await anon.rpc('record_client_error', args)).error?.code, '42501');
      assert.equal((await anon.from('client_errors').select('id')).error?.code, '42501');
    } finally {
      assert.equal((await db.from('client_errors').delete().eq('device_id', device)).error, null);
    }
  },
);
