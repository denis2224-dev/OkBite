import 'fake-indexeddb/auto';
import { deserialize, serialize } from 'node:v8';
import { clear, createStore, get, set } from 'idb-keyval';
import { waitFor } from '@testing-library/react-native';

jest.mock('../../lib/storagePersistence', () => jest.requireActual('../../lib/storagePersistence.web'));
const history = createStore('okbite-history', 'history');
const savedAt = '2026-11-08T10:00:00.000Z';
let persist: jest.Mock;
function database() {
  return jest.requireActual<typeof import('./db.web')>('./db.web');
}
function persistence() {
  return jest.requireActual<typeof import('../../lib/storagePersistence.web')>('../../lib/storagePersistence.web');
}
beforeEach(async () => {
  jest.resetModules();
  global.structuredClone = value => deserialize(serialize(value));
  await clear(history);
  persist = jest.fn().mockResolvedValue(true);
  Object.defineProperty(navigator, 'storage', { configurable: true, value: { persist } });
});

it('requests persistence after a successful save, never on reads or queue writes', async () => {
  const db = database();
  await db.readHistory();
  await db.putQueued({ id: 'queued', kind: 'code', payload: '12345670', createdAt: savedAt });
  expect(persist).not.toHaveBeenCalled();
  let savedWhenRequested: { json: string }[] | undefined;
  persist.mockImplementation(async () => {
    savedWhenRequested = await db.readHistory();
    return true;
  });
  await db.writeHistory('a', 'saved', savedAt);
  await waitFor(() => expect(persist).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(savedWhenRequested).toEqual([{ json: 'saved' }]));
});

it('does not consume the attempt when a history transaction fails', async () => {
  const db = database();
  await set('entries', 'corrupt', history);
  await expect(db.writeHistory('a', 'saved', savedAt)).rejects.toThrow();
  expect(persist).not.toHaveBeenCalled();
  await clear(history);
  await db.writeHistory('a', 'saved', savedAt);
  await waitFor(() => expect(persist).toHaveBeenCalledTimes(1));
});

it('claims one attempt across concurrent saves, separate tabs and reloads', async () => {
  const firstTab = database();
  jest.resetModules();
  const secondTab = database();
  await Promise.all([
    firstTab.writeHistory('a', 'first', savedAt),
    firstTab.writeHistory('b', 'second', savedAt),
    secondTab.writeHistory('c', 'third', savedAt),
  ]);
  await waitFor(() => expect(persist).toHaveBeenCalledTimes(1));
  expect(await firstTab.readHistory()).toHaveLength(3);
  jest.resetModules();
  await persistence().requestPersistentStorage();
  await database().deleteHistory();
  await database().writeHistory('d', 'after clearing', savedAt);
  await persistence().requestPersistentStorage();
  expect(persist).toHaveBeenCalledTimes(1);
});

it.each(['denied', 'rejected', 'throws', 'unsupported'])(
  'keeps saved history and does not retry when persistence is %s', async outcome => {
    if (outcome === 'denied') persist.mockResolvedValue(false);
    if (outcome === 'rejected') persist.mockRejectedValue(new Error('blocked'));
    if (outcome === 'throws') persist.mockImplementation(() => { throw new Error('blocked'); });
    if (outcome === 'unsupported') Object.defineProperty(navigator, 'storage', { value: undefined });
    const db = database();
    await db.writeHistory('a', 'saved', savedAt);
    // Wait for the real background claim transaction, without waiting for browser permission.
    await get('entries', history);
    await get('entries', history);
    await db.writeHistory('b', 'also saved', savedAt);
    expect(await db.readHistory()).toHaveLength(2);
    expect(persist).toHaveBeenCalledTimes(outcome === 'unsupported' ? 0 : 1);
    jest.resetModules();
    await persistence().requestPersistentStorage();
    expect(persist).toHaveBeenCalledTimes(outcome === 'unsupported' ? 0 : 1);
  },
);

it('never blocks a saved result on an unresolved browser permission', async () => {
  persist.mockReturnValue(new Promise(() => {}));
  const db = database();
  await db.writeHistory('a', 'saved', savedAt);
  await waitFor(() => expect(persist).toHaveBeenCalledTimes(1));
  await db.writeHistory('b', 'saved again', savedAt);
  expect(await db.readHistory()).toHaveLength(2);
});

it('still attempts once per document if the durable marker cannot be saved', async () => {
  const idb = jest.requireActual<typeof import('idb-keyval')>('idb-keyval');
  const markerWrite = jest.spyOn(idb, 'update').mockRejectedValueOnce(new Error('quota'));
  await persistence().requestPersistentStorage();
  await persistence().requestPersistentStorage();
  expect(persist).toHaveBeenCalledTimes(1);
  markerWrite.mockRestore();
});

it('honors a prior claim after a browser shutdown before the permission call', async () => {
  await set('storage-persistence-attempted', true, history);
  await persistence().requestPersistentStorage();
  expect(persist).not.toHaveBeenCalled();
});
