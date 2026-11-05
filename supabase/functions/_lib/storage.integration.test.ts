import { integrationTest } from './integration.ts';
import { strict as assert } from 'node:assert';
import jpeg from 'npm:jpeg-js@0.4.4';
import { adminClient } from './http.ts';
import { publishPhoto, saveJpeg } from './storage.ts';

integrationTest('private JPEG uploads publish to products without EXIF and are independently readable', async () => {
  const db = adminClient();
  const id = crypto.randomUUID();
  const device = crypto.randomUUID();
  const encoded =
    jpeg.encode({ width: 2, height: 1, data: new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255]) }, 90)
      .data;
  const exif = new Uint8Array([255, 225, 0, 12, 69, 120, 105, 102, 0, 0, 71, 80, 83, 0]);
  const image = new Uint8Array(encoded.length + exif.length);
  image.set(encoded.subarray(0, 2));
  image.set(exif, 2);
  image.set(encoded.subarray(2), 2 + exif.length);
  const input = btoa(String.fromCharCode(...image));
  let path: string | undefined;
  let published: string | undefined;
  try {
    path = await saveJpeg(input, device, 'front');
    assert.ok(path.startsWith(`${device}/`));
    const privateResult = await db.storage.from('uploads').download(path);
    assert.equal(privateResult.error, null);
    const bytes = new Uint8Array(await privateResult.data!.arrayBuffer());
    assert.equal(new TextDecoder().decode(bytes).includes('Exif'), false);
    assert.equal(jpeg.decode(bytes).width, 2);
    const denied = await fetch(db.storage.from('uploads').getPublicUrl(path).data.publicUrl);
    assert.notEqual(denied.status, 200);
    await denied.body?.cancel();
    published = await publishPhoto(path, id, 'front');
    assert.equal(published, `${id}/front.jpg`);
    const publicResult = await fetch(
      db.storage.from('products').getPublicUrl(published).data.publicUrl,
    );
    assert.equal(publicResult.status, 200);
    assert.equal(publicResult.headers.get('content-type'), 'image/jpeg');
    assert.deepEqual(new Uint8Array(await publicResult.arrayBuffer()), bytes);
    await assert.rejects(() => publishPhoto(path!, id, '../escape'));
    await assert.rejects(() => publishPhoto(path!, 'invalid', 'front'));
    await assert.rejects(() =>
      publishPhoto(`${device}/${crypto.randomUUID()}-front.jpg`, id, 'missing')
    );
  } finally {
    if (path) assert.equal((await db.storage.from('uploads').remove([path])).error, null);
    if (published) {
      assert.equal((await db.storage.from('products').remove([published])).error, null);
    }
  }
});
