import { strict as assert } from 'node:assert';
import jpeg from 'npm:jpeg-js@0.4.4';
import { ReadLabelResponse } from '../_shared/contract.ts';
import { UpstreamError } from '../_lib/claude.ts';
import { adminClient } from '../_lib/http.ts';
import { integrationTest } from '../_lib/integration.ts';
import { saveJpeg } from '../_lib/storage.ts';
import { createHandler } from './index.ts';
import { createService } from './service.ts';

// Real local database, storage and quota; only Claude is replaced.
const pixel = jpeg.encode({ width: 1, height: 1, data: new Uint8Array([255, 0, 0, 255]) }, 80).data;
const photo = btoa(String.fromCharCode(...pixel));
const answer = JSON.stringify({
  ingredientsText: 'lapte, zahăr',
  unit: 'g',
  kcal: '98',
  fat: '2',
  sat: '1,3',
  sugar: '13,2',
  salt: '0,12',
  protein: '2,9',
  fiber: '',
  fruitVegPct: '',
});
const handlerWith = (ask: (images: string[]) => Promise<string>) =>
  createHandler(createService({ adminClient, saveJpeg, askClaude: ask }));
const post = (handler: (r: Request) => Promise<Response>, device: string, body: unknown) =>
  handler(
    new Request('http://local/read-label', {
      method: 'POST',
      headers: { 'x-device-id': device },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );
async function cleanup(device: string) {
  const db = adminClient();
  const files = await db.storage.from('uploads').list(device);
  if (files.data?.length) {
    await db.storage.from('uploads').remove(files.data.map((f) => `${device}/${f.name}`));
  }
  assert.equal((await db.from('usage_events').delete().eq('device_id', device)).error, null);
}
const uploads = async (device: string) =>
  (await adminClient().storage.from('uploads').list(device)).data?.length ?? 0;
const events = async (device: string) =>
  (await adminClient().from('usage_events').select('id', { count: 'exact', head: true })
    .eq('device_id', device).eq('kind', 'read_label')).count;

integrationTest('read-label: one or two photos are stored privately and read once', async () => {
  const device = crypto.randomUUID();
  const sent: number[] = [];
  const handler = handlerWith((images) => (sent.push(images.length), Promise.resolve(answer)));
  try {
    const one = ReadLabelResponse.parse(
      await (await post(handler, device, { ingredientsImage: photo, nutritionImage: null })).json(),
    );
    assert.equal(one.nutritionPhotoPath, null);
    assert.ok(one.ingredientsPhotoPath.startsWith(`${device}/`));
    assert.deepEqual(one.unclear, ['fiber', 'fruitVegPct']);
    assert.equal(one.nutrients.sat, 1.3);

    const two = ReadLabelResponse.parse(
      await (await post(handler, device, { ingredientsImage: photo, nutritionImage: photo }))
        .json(),
    );
    assert.ok(two.ingredientsPhotoPath.endsWith('-ingredients.jpg'));
    assert.ok(two.nutritionPhotoPath?.startsWith(`${device}/`));
    assert.ok(two.nutritionPhotoPath?.endsWith('-nutrition.jpg'));
    assert.deepEqual(sent, [1, 2]);
    assert.equal(await events(device), 2);
  } finally {
    await cleanup(device);
  }
});

integrationTest(
  'read-label: bad input fails before Claude and leaves nothing; AI failure opens a blank draft and keeps the uploads',
  async () => {
    const device = crypto.randomUUID();
    let asked = 0;
    const counting = handlerWith(() => (asked++, Promise.resolve(answer)));
    try {
      const big = JSON.stringify({ ingredientsImage: 'A'.repeat(2_000_100), nutritionImage: null });
      assert.equal((await post(counting, device, big)).status, 400);
      // A good first photo and a broken second one: the first upload is removed again.
      const broken = { ingredientsImage: photo, nutritionImage: btoa('not a jpeg!!') };
      assert.equal((await post(counting, device, broken)).status, 400);
      assert.equal(asked, 0);
      assert.equal(await uploads(device), 0);
      assert.equal(await events(device), 0);

      const down = handlerWith(() => Promise.reject(new UpstreamError('down')));
      const response = await post(down, device, { ingredientsImage: photo, nutritionImage: photo });
      assert.equal(response.status, 200);
      const draft = ReadLabelResponse.parse(await response.json());
      assert.equal(draft.ingredientsText, null);
      assert.equal(draft.unit, null);
      assert.deepEqual(draft.nutrients, {
        kcal: null,
        fat: null,
        sat: null,
        sugar: null,
        salt: null,
        protein: null,
        fiber: null,
        fruitVegPct: null,
      });
      assert.deepEqual(draft.unclear, [
        'kcal',
        'fat',
        'sat',
        'sugar',
        'salt',
        'protein',
        'fiber',
        'fruitVegPct',
        'ingredientsText',
      ]);
      assert.equal(await uploads(device), 2);
      assert.equal(await events(device), 1);
      const db = adminClient();
      for (
        const [path, suffix] of [
          [draft.ingredientsPhotoPath, '-ingredients.jpg'],
          [draft.nutritionPhotoPath, '-nutrition.jpg'],
        ] as const
      ) {
        assert.ok(path);
        assert.ok(path.startsWith(`${device}/`) && path.endsWith(suffix));
        const { error } = await db.storage.from('uploads').download(path);
        assert.equal(error, null);
      }
    } finally {
      await cleanup(device);
    }
  },
);

integrationTest(
  'read-label: the 21st label in 24 hours is rate limited before upload',
  async () => {
    const device = crypto.randomUUID();
    const db = adminClient();
    try {
      const rows = Array.from({ length: 20 }, () => ({ kind: 'read_label', device_id: device }));
      assert.equal((await db.from('usage_events').insert(rows)).error, null);
      let asked = 0;
      const handler = handlerWith(() => (asked++, Promise.resolve(answer)));
      const res = await post(handler, device, { ingredientsImage: photo, nutritionImage: null });
      assert.equal(res.status, 429);
      assert.equal(asked, 0);
      assert.equal(await uploads(device), 0);
    } finally {
      await cleanup(device);
    }
  },
);
