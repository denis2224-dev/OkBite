import 'fake-indexeddb/auto';
import { serialize, deserialize } from 'node:v8';
import { Blob as mockBlob } from 'node:buffer';
import { randomUUID as mockRandomUUID } from 'node:crypto';
import { createStore, get, set } from 'idb-keyval';
import { writeHistory, readHistory, deleteHistory, putQueued, listQueued, deleteQueued, markNeedsReview, setQueuedReview, resetQueued, markQueuedComplete } from './db.web';
import { enqueue, flushQueue, listNeedsReview, resolveQueued, listQueue, retryQueued } from '../offline/queue';
import { api, ApiError } from '../../lib/api';
import { foundYogurt } from '../../test/fixtures';

jest.mock('./db', () => jest.requireActual('./db.web'));
it('never overwrites a completed browser receipt with a late review response', async () => {
  await putQueued({ id: 'late', kind: 'code', payload: '12345670', createdAt: '2026-11-05T00:00:00.000Z' });
  await markQueuedComplete('late');
  await markNeedsReview('late', '{"status":"not_found"}');
  expect((await listQueued()).find(row => row.id === 'late')?.status).toBe('completed');
});
jest.mock('../offline/photos', () => jest.requireActual('../offline/photos.web'));
jest.mock('expo-crypto', () => ({ randomUUID: mockRandomUUID }));
jest.mock('../../lib/api', () => ({ ...jest.requireActual('../../lib/api'), api: { lookup: jest.fn(), identify: jest.fn() } }));

beforeAll(() => {
  Object.defineProperty(global, 'Blob', { value: mockBlob, configurable: true });
  Object.defineProperty(global, 'crypto', { value: { randomUUID: mockRandomUUID }, configurable: true });
  global.structuredClone = value => value instanceof mockBlob ? value.slice() : deserialize(serialize(value));
  global.FileReader = class {
    result: string | null = null;
    onload?: () => void;
    readAsDataURL(blob: Blob) {
      void blob.arrayBuffer().then(bytes => { this.result = 'data:image/jpeg;base64,' + Buffer.from(bytes).toString('base64'); this.onload?.(); });
    }
  } as unknown as typeof FileReader;
});
beforeEach(async () => {
  jest.clearAllMocks();
  await deleteHistory();
  for (const item of await listQueued()) await deleteQueued(item.id);
});
it('does not reset a valid review committed by another browser tab', async () => {
  await putQueued({ id: 'concurrent', kind: 'code', payload: '12345670', createdAt: '2026-11-05T00:00:00.000Z' });
  await markNeedsReview('concurrent', '{"status":"not_found"}');
  await resetQueued('concurrent');
  expect((await listQueued())[0]).toMatchObject({ status: 'needs_review', result: '{"status":"not_found"}' });
});
it('preserves concurrent saves, updates duplicates and keeps recent entries first', async () => {
  await Promise.all([writeHistory('a', '{"name":"a"}', '2026-11-05T00:00:01.000Z'), writeHistory('b', '{"name":"b"}', '2026-11-05T00:00:02.000Z')]);
  await writeHistory('a', '{"name":"updated"}', '2026-11-05T00:00:03.000Z');
  expect(await readHistory()).toEqual([{ json: '{"name":"updated"}' }, { json: '{"name":"b"}' }]);
});
it('bounds the browser database and clears it', async () => {
  for (let i = 0; i < 201; i++) await writeHistory(String(i), String(i), '2026-11-05T00:00:00.000Z');
  expect(await readHistory()).toHaveLength(200);
  await deleteHistory();
  expect(await readHistory()).toEqual([]);
});
it('retains FIFO order for queue items saved in the same millisecond', async () => {
  const createdAt = '2026-11-05T00:00:00.000Z';
  await putQueued({ id: 'z', kind: 'code', payload: '12345670', createdAt });
  await putQueued({ id: 'a', kind: 'code', payload: '4840001000014', createdAt });
  expect((await listQueued()).map(row => row.id)).toEqual(['z', 'a']);
  await deleteQueued('z');
  expect((await listQueued()).map(row => row.id)).toEqual(['a']);
  await deleteQueued('a');
});

it('treats a legacy browser row with missing review fields as pending', async () => {
  const row = { id: 'legacy', kind: 'code', payload: '12345670', createdAt: '2026-11-05T00:00:00.000Z' };
  await set('entries', [row], createStore('okbite-queue', 'queue'));
  expect(await listQueued()).toEqual([{ ...row, status: 'pending', result: null }]);
});

it('does not resend a not_found browser code after a second flush', async () => {
  await enqueue({ kind: 'code', code: '12345670' });
  const item = (await listQueued())[0]!;
  jest.mocked(api.lookup).mockResolvedValue({ status: 'not_found' });
  await flushQueue();
  await flushQueue();
  expect(api.lookup).toHaveBeenCalledTimes(1);
  expect(await listNeedsReview()).toEqual([{ id: item.id, kind: 'code', payload: item.payload, result: { status: 'not_found' } }]);
  await resolveQueued(item.id);
  expect(await listQueued()).toEqual([]);
});

it('keeps a candidate browser photo for review and deletes its blob only on resolution', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, blob: async () => new mockBlob(['review image']) });
  await enqueue({ kind: 'photo', uri: 'blob:test-photo' });
  const item = (await listQueued())[0]!;
  const result = {
    status: 'candidates' as const, photoPath: 'test/front.jpg',
    read: { brand: null, name: null, quantity: null, code: null },
    candidates: [{ id: foundYogurt.product.id, name: foundYogurt.product.name, brand: foundYogurt.product.brand, quantity: '400 g', imageUrl: null, similarity: 0.7 }],
  };
  jest.mocked(api.identify).mockResolvedValue(result);
  await flushQueue();
  await flushQueue();
  expect(api.identify).toHaveBeenCalledTimes(1);
  const photos = createStore('okbite-photos', 'photos');
  expect(await (await get<mockBlob>(item.payload, photos))?.text()).toBe('review image');
  expect(await listNeedsReview()).toEqual([{ id: item.id, kind: 'photo', payload: item.payload, result }]);
  await resolveQueued(item.id);
  expect(await listQueued()).toEqual([]);
  expect(await get(item.payload, photos)).toBeUndefined();
});

it.each(['{', '{"status":"found"}'])('validates saved browser results against the shared schema: %s', async result => {
  await enqueue({ kind: 'code', code: '12345670' });
  await markNeedsReview((await listQueued())[0]!.id, result);
  expect(await listNeedsReview()).toEqual([]);
  expect(await listQueued()).toHaveLength(1);
});
it('treats a row without status as pending and stores a review result', async () => {
  await putQueued({ id: 'r', kind: 'code', payload: '12345670', createdAt: '2026-11-05T00:00:00.000Z' });
  expect((await listQueued())[0]).toMatchObject({ id: 'r', status: 'pending', result: null });
  await setQueuedReview('r', '{"status":"not_found"}');
  expect((await listQueued())[0]).toMatchObject({ status: 'needs_review', result: '{"status":"not_found"}' });
  await deleteQueued('r');
});

it('persists browser service errors and resolves them only after explicit retry', async () => {
  await enqueue({ kind: 'code', code: '4840001000014' });
  jest.mocked(api.lookup).mockRejectedValueOnce(new ApiError('rate_limited'));
  await flushQueue();
  const entry = (await listQueue())[0]!;
  expect(entry.error).toBe('rate_limited');
  expect((await listQueued())[0]!.status).toBe('pending');
  await flushQueue();
  expect(api.lookup).toHaveBeenCalledTimes(1);
  jest.mocked(api.lookup).mockResolvedValueOnce(foundYogurt);
  expect(await retryQueued(entry.id)).toEqual({ resolved: 1 });
  expect(await listQueue()).toEqual([]);
});

