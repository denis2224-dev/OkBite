import 'fake-indexeddb/auto';
import { deserialize, serialize } from 'node:v8';
import { Blob } from 'node:buffer';
import { createStore, get, set } from 'idb-keyval';
import { listQueued, putQueued, setQueuedReview } from '../history/db.web';
import { flushQueue, listNeedsReview, resolveQueued } from './queue';
import { api } from '../../lib/api';

jest.mock('../history/db', () => jest.requireActual('../history/db.web'));
jest.mock('./photos', () => jest.requireActual('./photos.web'));
jest.mock('../../lib/api', () => ({ api: { identify: jest.fn() } }));

it('keeps a saved review retryable when deleting its IndexedDB photo fails', async () => {
  const clone = global.structuredClone;
  global.structuredClone = value => value instanceof Blob ? value.slice() : deserialize(serialize(value));
  const photos = createStore('okbite-photos', 'photos');
  const item = { id: 'review', kind: 'photo' as const, payload: 'front', createdAt: '2026-11-05T00:00:00Z' };
  const result = {
    status: 'not_found',
    read: { brand: null, name: null, quantity: null, code: null },
    photoPath: 'front.jpg',
  };
  try {
    await set(item.payload, new Blob(['photo']), photos);
    await putQueued(item);
    await setQueuedReview(item.id, JSON.stringify(result));
    const deletePhoto = jest.spyOn(IDBObjectStore.prototype, 'delete')
      .mockImplementationOnce(() => { throw new Error('IndexedDB deletion failed'); });
    try {
      await expect(resolveQueued(item.id)).rejects.toThrow('IndexedDB deletion failed');
      expect(await listNeedsReview()).toEqual([{ id: item.id, kind: item.kind, payload: item.payload, result }]);
      expect(await (await get<Blob>(item.payload, photos))?.text()).toBe('photo');
      await flushQueue();
      expect(api.identify).not.toHaveBeenCalled();
      await resolveQueued(item.id);
      expect(await listQueued()).toEqual([]);
      expect(await get(item.payload, photos)).toBeUndefined();
    } finally {
      deletePhoto.mockRestore();
    }
  } finally {
    global.structuredClone = clone;
  }
});
