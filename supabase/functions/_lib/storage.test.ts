import { strict as assert } from 'node:assert';
import jpeg from 'npm:jpeg-js@0.4.4';
import { cleanJpeg } from './jpeg.ts';
import { publishPhoto, saveJpeg } from './storage.ts';
import { HttpError } from './http.ts';

Deno.test('storage rejects invalid UUIDs, suffixes and non-owned path shapes before I/O', async () => {
  for (const id of ['', 'invalid', '../escape']) {
    await assert.rejects(() => saveJpeg('anything', id, 'front'));
  }
  for (
    const path of [
      '../x.jpg',
      'https://evil.test/a.jpg',
      '/a.jpg',
      `${crypto.randomUUID()}/../front.jpg`,
      `${crypto.randomUUID()}/x.jpg`,
    ]
  ) {
    await assert.rejects(() => publishPhoto(path, crypto.randomUUID(), 'front'), HttpError);
  }
});
Deno.test('JPEG validation rejects malformed base64, non-JPEG and excessive input', () => {
  for (const input of ['', '???', btoa('not a jpeg'), '/9j/2Q==', 'a'.repeat(2_000_004)]) {
    assert.throws(() => cleanJpeg(input), HttpError);
  }
});

Deno.test('JPEG decoder rejects excessive declared dimensions before allocation', () => {
  const bytes = jpeg.encode({ width: 1, height: 1, data: new Uint8Array(4) }, 90).data;
  const sof = bytes.findIndex((b, i) => b === 255 && bytes[i + 1] === 192);
  assert.ok(sof > 0);
  bytes.set([255, 255, 255, 255], sof + 5);
  assert.throws(() => cleanJpeg(btoa(String.fromCharCode(...bytes))), HttpError);
});
