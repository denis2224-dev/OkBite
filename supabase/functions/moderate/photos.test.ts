import { strict as assert } from 'node:assert';
import { removeHiddenPhotos } from './photos.ts';

Deno.test('hide removes every pending bucket/path and acknowledges only successful Storage calls', async () => {
  const calls: string[] = [];
  let pending = [
    { bucket_id: 'products', path: 'shared/front.jpg' },
    { bucket_id: 'uploads', path: 'device/ingredients.jpg' },
    { bucket_id: 'uploads', path: 'device/nutrition.jpg' },
  ];
  let fail = true;
  let failAcknowledgement = false;
  const db = {
    from: () => ({
      select: () => ({
        eq: () => ({
          is: () =>
            Object.assign(Promise.resolve({ data: pending.slice(0, 1000), error: null }), {
              limit: (size: number) =>
                Promise.resolve({ data: pending.slice(0, size), error: null }),
            }),
        }),
      }),
      update: () => ({
        eq: (_: string, product: string) => ({
          eq: (_: string, bucket: string) => ({
            eq: (_: string, path: string) => {
              calls.push(`ack:${product}:${bucket}:${path}`);
              if (failAcknowledgement) return Promise.resolve({ error: new Error('lost ack') });
              pending = pending.filter((item) => item.bucket_id !== bucket || item.path !== path);
              return Promise.resolve({ error: null });
            },
          }),
        }),
      }),
    }),
    storage: {
      from: (bucket: string) => ({
        remove: (paths: string[]) => {
          calls.push(`remove:${bucket}:${paths.join(',')}`);
          return Promise.resolve({
            error: fail && paths[0].endsWith('ingredients.jpg') ? new Error('outage') : null,
          });
        },
      }),
    },
  };
  await assert.rejects(() => removeHiddenPhotos('product', db as never), /Photo removal failed/);
  assert.deepEqual(pending.map((item) => item.path), [
    'device/ingredients.jpg',
    'device/nutrition.jpg',
  ]);
  fail = false;
  await removeHiddenPhotos('product', db as never);
  assert.deepEqual(pending, []);
  pending = Array.from(
    { length: 1001 },
    (_, i) => ({ bucket_id: 'uploads', path: `device/${i}.jpg` }),
  );
  await removeHiddenPhotos('product', db as never);
  assert.deepEqual(pending, [], 'must drain beyond the API page limit before success');
  pending = [{ bucket_id: 'products', path: 'device/lost-ack.jpg' }];
  failAcknowledgement = true;
  await assert.rejects(() => removeHiddenPhotos('product', db as never), /acknowledgement failed/);
  assert.equal(pending.length, 1, 'failed acknowledgement remains retryable');
  failAcknowledgement = false;
  await removeHiddenPhotos('product', db as never);
  assert.equal(calls.filter((call) => call === 'remove:products:device/lost-ack.jpg').length, 2);
  assert.equal(calls.filter((call) => call === 'remove:products:shared/front.jpg').length, 1);
});
