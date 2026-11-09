import 'fake-indexeddb/auto';
import { deserialize, serialize } from 'node:v8';
import { Blob } from 'node:buffer';
import { createStore, get, set } from 'idb-keyval';
import { keepPhoto, openPhoto } from './photos.web';

const photos = createStore('okbite-photos', 'photos');

async function opened(id: string) {
  let blob: Blob | undefined;
  const create = jest.spyOn(URL, 'createObjectURL').mockImplementation(value => { blob = value as Blob; return 'blob:test'; });
  jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  try {
    (await openPhoto(id)).release();
    return { type: blob!.type, text: await blob!.text() };
  } finally { create.mockRestore(); }
}

it('keeps new photos as bytes so WebKit can store them', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, blob: async () => new Blob(['front'], { type: 'image/jpeg' }) })) as never;
  const id = await keepPhoto('blob:camera');
  expect(await get(id, photos)).not.toBeInstanceOf(Blob);
  expect(await opened(id)).toEqual({ type: 'image/jpeg', text: 'front' });
});

it('still opens photos queued earlier as Blob records', async () => {
  const clone = global.structuredClone;
  global.structuredClone = value => value instanceof Blob ? value.slice(0, value.size, value.type) : deserialize(serialize(value));
  try {
    await set('old-photo', new Blob(['queued'], { type: 'image/jpeg' }), photos);
    expect(await opened('old-photo')).toEqual({ type: 'image/jpeg', text: 'queued' });
  } finally { global.structuredClone = clone; }
});
