import { strict as assert } from 'node:assert';
import { photoUrl } from './photoUrl.ts';

const db = { storage: { from: (b: string) => ({ getPublicUrl: (p: string) => ({ data: { publicUrl: `https://s.test/${b}/${p}` } }) }) } };
const id = '0b6f3c1e-2d4a-4c8e-9f10-1a2b3c4d5e6f';
const off = 'https://images.openfoodfacts.org/images/products/301/762/042/2003/front_en.879.400.jpg';

Deno.test('photoUrl serves bucket photos and OFF front photos, nothing else', () => {
  assert.equal(photoUrl(db, id, `${id}/front.jpg`), `https://s.test/products/${id}/front.jpg`);
  assert.equal(photoUrl(db, id, off), off);
  for (const path of [null, 'https://evil.test/a.jpg', `${crypto.randomUUID()}/front.jpg`, `${id}/../x.jpg`, `${off}?x`]) {
    assert.equal(photoUrl(db, id, path), null);
  }
});
