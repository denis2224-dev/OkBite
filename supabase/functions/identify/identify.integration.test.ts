import { strict as assert } from 'node:assert';
import jpeg from 'npm:jpeg-js@0.4.4';
import { IdentifyResponse } from '../_shared/contract.ts';
import { UpstreamError } from '../_lib/claude.ts';
import { loadProduct } from '../_lib/db.ts';
import { adminClient, logEvent } from '../_lib/http.ts';
import { integrationTest } from '../_lib/integration.ts';
import { saveJpeg } from '../_lib/storage.ts';
import { createHandler } from './index.ts';
import { createService } from './service.ts';

// Real local database, storage and quota; only Claude is replaced.
const pixel = jpeg.encode({ width: 1, height: 1, data: new Uint8Array([255, 0, 0, 255]) }, 80).data;
const photo = btoa(String.fromCharCode(...pixel));
const handlerAnswering = (answer: () => Promise<string>) =>
  createHandler(createService({ adminClient, loadProduct, saveJpeg, logEvent, askClaude: answer }));
const post = (
  handler: (r: Request) => Promise<Response>,
  device: string,
  body: unknown = { photo },
) =>
  handler(
    new Request('http://local/identify', {
      method: 'POST',
      headers: { 'x-device-id': device },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );
const front = (brand: string, name: string, barcodeDigits = '') => () =>
  Promise.resolve(JSON.stringify({ brand, name, quantity: '', barcodeDigits }));
const identify = async (answer: () => Promise<string>, device: string) =>
  IdentifyResponse.parse(await (await post(handlerAnswering(answer), device)).json());

async function cleanup(device: string) {
  const db = adminClient();
  const files = await db.storage.from('uploads').list(device);
  if (files.data?.length) {
    await db.storage.from('uploads').remove(files.data.map((f) => `${device}/${f.name}`));
  }
  assert.equal((await db.from('usage_events').delete().eq('device_id', device)).error, null);
}
const events = async (device: string, kind: string) =>
  (await adminClient().from('usage_events').select('id', { count: 'exact', head: true })
    .eq('device_id', device).eq('kind', kind)).count;

integrationTest(
  'identify: barcode → found, brand and name → candidates, unknown → not_found',
  async () => {
    const device = crypto.randomUUID();
    try {
      const found = await identify(front('', '', '4840001000014'), device);
      assert.equal(found.status, 'found');
      assert.ok(found.photoPath.startsWith(`${device}/`) && found.photoPath.endsWith('-front.jpg'));
      if (found.status === 'found') assert.equal(found.product.name, 'Iaurt natural 2,5%');

      const cand = await identify(front('Zorel', 'Iaurt cu căpșuni'), device);
      assert.equal(cand.status, 'candidates');
      if (cand.status === 'candidates') {
        assert.equal(cand.candidates[0].name, 'Iaurt cu căpșuni 2%');
        assert.deepEqual(cand.read, {
          brand: 'Zorel',
          name: 'Iaurt cu căpșuni',
          quantity: null,
          code: null,
        });
      }
      // A misread checksum must not match a product by code.
      const none = await identify(front('Xyzw', 'Qwerty', '4840001000017'), device);
      assert.equal(none.status, 'not_found');
      if (none.status === 'not_found') {
        assert.deepEqual(none.read, { brand: 'Xyzw', name: 'Qwerty', quantity: null, code: null });
      }
      assert.equal(await events(device, 'photo'), 3);
      assert.equal(await events(device, 'identified'), 1);
      assert.equal(await events(device, 'not_found'), 1);
    } finally {
      await cleanup(device);
    }
  },
);

integrationTest(
  'identify: bad photos fail before Claude without quota; Claude failure → 502',
  async () => {
    const device = crypto.randomUUID();
    let asked = 0;
    const counting = handlerAnswering(() => (asked++, Promise.resolve('{}')));
    try {
      const big = JSON.stringify({ photo: 'A'.repeat(2_000_100) });
      assert.equal((await post(counting, device, big)).status, 400);
      assert.equal((await post(counting, device, { photo: btoa('not a jpeg!!') })).status, 400);
      assert.equal(asked, 0);
      assert.equal(await events(device, 'photo'), 0);

      const down = handlerAnswering(() => Promise.reject(new UpstreamError('down')));
      const failed = await post(down, device);
      assert.equal(failed.status, 502);
      assert.equal((await failed.json()).error, 'upstream_failed');
      assert.equal(await events(device, 'photo'), 1); // the provider may have billed the attempt
    } finally {
      await cleanup(device);
    }
  },
);

integrationTest('identify: the 41st photo in 24 hours is rate limited before upload', async () => {
  const device = crypto.randomUUID();
  const db = adminClient();
  try {
    const rows = Array.from({ length: 40 }, () => ({ kind: 'photo', device_id: device }));
    assert.equal((await db.from('usage_events').insert(rows)).error, null);
    let asked = 0;
    const res = await post(handlerAnswering(() => (asked++, Promise.resolve('{}'))), device);
    assert.equal(res.status, 429);
    assert.equal((await res.json()).error, 'rate_limited');
    assert.equal(asked, 0);
    assert.equal((await db.storage.from('uploads').list(device)).data?.length ?? 0, 0);
  } finally {
    await cleanup(device);
  }
});
