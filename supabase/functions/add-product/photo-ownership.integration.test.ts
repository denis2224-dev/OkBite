import { strict as assert } from 'node:assert';
import jpeg from 'npm:jpeg-js@0.4.4';
import { integrationTest } from '../_lib/integration.ts';
import { saveJpeg } from '../_lib/storage.ts';
import { fixture, found } from '../add-product/retry-fixture.ts';

integrationTest(
  'an original photo cannot create public copies on different products; rejection compensates and receipt replay remains stable',
  async () => {
    const f = await fixture();
    const extras: string[] = [];
    try {
      const encoded = jpeg.encode({ width: 1, height: 1, data: new Uint8Array(4) }, 80).data;
      const bytes = btoa(String.fromCharCode(...encoded));
      const originalLabel = f.input.ingredientsPhotoPath;
      const front = await saveJpeg(bytes, f.device, 'front');
      extras.push(front);
      f.input.photoPath = front;
      const first = await found(await f.submit());
      const newLabel = await saveJpeg(bytes, f.device, 'ingredients');
      extras.push(newLabel);
      f.input.ingredientsPhotoPath = newLabel;
      const rejected = await f.submit();
      assert.equal(
        rejected.status,
        400,
        'same original front plus a new label must not create a second product',
      );
      assert.equal((await rejected.json()).error, 'bad_request');
      const rows = await f.products();
      assert.equal(rows.error, null);
      assert.deepEqual(
        rows.data,
        [{ id: first.id }],
        'rejected commit rolls back the second product',
      );
      const events = await f.db.from('usage_events').select('product_id').eq('device_id', f.device)
        .eq('kind', 'added');
      assert.equal(events.error, null);
      assert.deepEqual(
        events.data,
        [{ product_id: first.id }],
        'rejected submission releases its quota reservation',
      );
      const loser = f.attemptedIds.find((id) => id !== first.id)!;
      assert.ok(loser);
      const files = await f.db.storage.from('products').list(loser);
      assert.equal(files.error, null);
      assert.deepEqual(files.data, [], 'compensation deletes every loser public copy');
      const source = await f.db.from('contribution_photo_sources').select('product_id').eq(
        'upload_path',
        front,
      );
      assert.equal(source.error, null);
      assert.deepEqual(source.data, [{ product_id: first.id }], 'one durable owner per original');
      f.input.ingredientsPhotoPath = originalLabel;
      const replay = await found(await f.submit());
      assert.equal(replay.id, first.id, 'original same-product receipt replay is unchanged');
      assert.equal(f.attemptedIds.length, 2, 'replay publishes no new public copy');
    } finally {
      await f.cleanup();
      if (extras.length) {
        assert.equal((await f.db.storage.from('uploads').remove(extras)).error, null);
      }
    }
  },
);

integrationTest(
  'concurrent different-product submissions cannot acquire the same original photo',
  async () => {
    const f = await fixture();
    const extras: string[] = [];
    try {
      const encoded = jpeg.encode({ width: 1, height: 1, data: new Uint8Array(4) }, 80).data;
      const bytes = btoa(String.fromCharCode(...encoded));
      f.input.photoPath = await saveJpeg(bytes, f.device, 'front');
      extras.push(f.input.photoPath);
      const first = f.submit();
      f.input.ingredientsPhotoPath = await saveJpeg(bytes, f.device, 'ingredients');
      extras.push(f.input.ingredientsPhotoPath);
      const responses = await Promise.all([first, f.submit()]);
      assert.deepEqual(responses.map((response) => response.status).sort(), [200, 400]);
      const rows = await f.products();
      assert.equal(rows.error, null);
      assert.equal(rows.data?.length, 1);
      const winner = rows.data![0].id;
      const events = await f.db.from('usage_events').select('product_id').eq('device_id', f.device)
        .eq('kind', 'added');
      assert.equal(events.error, null);
      assert.deepEqual(events.data, [{ product_id: winner }]);
      for (const loser of f.attemptedIds.filter((id) => id !== winner)) {
        const files = await f.db.storage.from('products').list(loser);
        assert.equal(files.error, null);
        assert.deepEqual(files.data, []);
      }
    } finally {
      await f.cleanup();
      if (extras.length) {
        assert.equal(
          (await f.db.storage.from('uploads').remove(extras)).error,
          null,
        );
      }
    }
  },
);
