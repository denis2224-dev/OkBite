import { identifyCandidates, identifyNotFound, lookupNotFound } from '../capture/__fixtures__/responses';
import { LookupResponse, IdentifyResponse } from '@okbite/shared';
import { DatabaseSync as mockDatabaseSync } from 'node:sqlite';
import { randomUUID as mockRandomUUID } from 'node:crypto';
import * as mockFs from 'node:fs/promises';
import { mkdtempSync as mockMkdtempSync } from 'node:fs';
import { tmpdir as mockTmpdir } from 'node:os';
import { join as mockJoin } from 'node:path';
import * as FileSystem from 'expo-file-system/legacy';
import { enqueue, flushQueue, listNeedsReview, resolveQueued, subscribeQueueResults, resumeQueuedItem, listUnresolvedQueued, listQueue, retryQueued, completeQueued, openQueuedPhoto, type NeedsReviewItem } from './queue';
import { listQueued, deleteQueued, markNeedsReview, putQueued, setQueuedReview } from '../history/db';
import { getFromHistory, clearHistory } from '../history/store';
import { api, ApiError } from '../../lib/api';
import { foundYogurt } from '../../test/fixtures';
import * as queueLocks from './queueLock';
import * as queueDb from '../history/db';

jest.mock('expo-sqlite', () => {
  const sqlite = new mockDatabaseSync(':memory:');
  const connection = {
    execAsync: async (sql: string) => sqlite.exec(sql),
    runAsync: async (sql: string, ...values: (string | number)[]) => sqlite.prepare(sql).run(...values),
    getAllAsync: async (sql: string) => sqlite.prepare(sql).all(),
    withExclusiveTransactionAsync: async (fn: (db: unknown) => Promise<void>) => {
      sqlite.exec('BEGIN');
      try { await fn(connection); sqlite.exec('COMMIT'); } catch (e) { sqlite.exec('ROLLBACK'); throw e; }
    },
  };
  return { openDatabaseAsync: async () => connection };
});
jest.mock('expo-crypto', () => ({ randomUUID: mockRandomUUID }));
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: mockMkdtempSync(mockJoin(mockTmpdir(), 'okbite-queue-')) + '/',
  EncodingType: { Base64: 'base64' },
  makeDirectoryAsync: async (path: string) => mockFs.mkdir(path, { recursive: true }),
  copyAsync: async ({ from, to }: { from: string; to: string }) => mockFs.copyFile(from, to),
  readAsStringAsync: async (path: string) => (await mockFs.readFile(path)).toString('base64'),
  getInfoAsync: async (path: string) => ({ exists: await mockFs.stat(path).then(() => true, () => false) }),
  deleteAsync: jest.fn(async (path: string) => mockFs.rm(path, { force: true })),
}));
jest.mock('../../lib/api', () => ({ ...jest.requireActual('../../lib/api'), api: { lookup: jest.fn(), identify: jest.fn() } }));
beforeEach(async () => {
  jest.clearAllMocks();
  jest.mocked(api.lookup).mockReset();
  jest.mocked(api.identify).mockReset();
  for (const item of await listQueued()) await deleteQueued(item.id);
  await clearHistory();
});
afterAll(async () => { await mockFs.rm(FileSystem.documentDirectory!, { recursive: true, force: true }); });
it('does not reopen a cancelled item when cleanup fails during an active lookup', async () => {
  await enqueue({ kind: 'code', code: '12345670' });
  const item = (await listQueued())[0]!;
  let finish!: (result: { status: 'not_found' }) => void;
  let started!: () => void;
  const entered = new Promise<void>(resolve => { started = resolve; });
  jest.mocked(api.lookup).mockImplementationOnce(() => {
    started(); return new Promise(resolve => { finish = resolve; });
  });
  const handoff = jest.fn(() => false);
  const unsubscribe = subscribeQueueResults(handoff);
  const draining = flushQueue();
  await entered;
  const cleanup = jest.spyOn(queueDb, 'deleteQueued').mockRejectedValueOnce(new Error('row busy'));
  try {
    await completeQueued(item.id);
    finish({ status: 'not_found' });
    await draining;
    expect((await listQueued())[0]?.status).toBe('completed');
    expect(handoff).not.toHaveBeenCalled();
    await markNeedsReview(item.id, JSON.stringify({ status: 'not_found' }));
    expect((await listQueued())[0]?.status).toBe('completed');
    await flushQueue();
    expect(await listQueued()).toEqual([]);
    expect(api.lookup).toHaveBeenCalledTimes(1);
  } finally { cleanup.mockRestore(); unsubscribe(); }
});
it('keeps a durable photo copy after the source disappears and deletes it after success', async () => {
  const source = FileSystem.documentDirectory! + 'source.jpg';
  await mockFs.writeFile(source, 'test image');
  await enqueue({ kind: 'photo', uri: source });
  await mockFs.unlink(source);
  const kept = (await listQueued())[0]!;
  expect(await mockFs.readFile(kept.payload, 'utf8')).toBe('test image');
  jest.mocked(api.identify).mockResolvedValueOnce({ ...foundYogurt, photoPath: 'test/photo.jpg' });
  expect(await flushQueue()).toEqual({ resolved: 1 });
  expect(api.identify).toHaveBeenCalledWith('dGVzdCBpbWFnZQ==');
  expect(await listQueued()).toEqual([]);
  expect((await getFromHistory(foundYogurt.product.id))?.product.id).toBe(foundYogurt.product.id);
  await expect(mockFs.stat(kept.payload)).rejects.toThrow();
});
it('keeps unknown items and resolves later items in queue order', async () => {
  await enqueue({ kind: 'code', code: '12345670' });
  await enqueue({ kind: 'code', code: '4840001000014' });
  jest.mocked(api.lookup).mockResolvedValueOnce({ status: 'not_found' }).mockResolvedValueOnce(foundYogurt);
  expect(await flushQueue()).toEqual({ resolved: 1 });
  expect((await listQueued()).map(row => row.payload)).toEqual(['12345670']);
  expect(jest.mocked(api.lookup).mock.calls.map(([by]) => by)).toEqual([{ code: '12345670' }, { code: '4840001000014' }]);
});
it('deduplicates simultaneous flushes and retains failures for retry', async () => {
  await enqueue({ kind: 'code', code: '4840001000014' });
  jest.mocked(api.lookup).mockRejectedValueOnce(new ApiError('offline'));
  const first = flushQueue();
  expect(flushQueue()).toBe(first);
  expect(await first).toEqual({ resolved: 0 });
  expect(await listQueued()).toHaveLength(1);
  jest.mocked(api.lookup).mockResolvedValueOnce(foundYogurt);
  expect(await flushQueue()).toEqual({ resolved: 1 });
});
it('rejects an invalid code before storing queue work', async () => {
  await expect(enqueue({ kind: 'code', code: 'invalid' })).rejects.toThrow();
  expect(await listQueued()).toEqual([]);
});
it('drops a queued photo whose stored file is gone and keeps processing later items', async () => {
  const source = FileSystem.documentDirectory! + 'lost.jpg';
  await mockFs.writeFile(source, 'lost image');
  await enqueue({ kind: 'photo', uri: source });
  await mockFs.rm((await listQueued())[0]!.payload);
  await enqueue({ kind: 'code', code: '4840001000014' });
  jest.mocked(api.lookup).mockResolvedValueOnce(foundYogurt);
  expect(await flushQueue()).toEqual({ resolved: 1 });
  expect(api.identify).not.toHaveBeenCalled();
  expect(await listQueued()).toEqual([]);
});

it('does not retry a not_found code and exposes its saved result for review', async () => {
  await enqueue({ kind: 'code', code: '12345670' });
  const item = (await listQueued())[0]!;
  jest.mocked(api.lookup).mockResolvedValue({ status: 'not_found' });
  expect(await flushQueue()).toEqual({ resolved: 0 });
  expect(await flushQueue()).toEqual({ resolved: 0 });
  expect(api.lookup).toHaveBeenCalledTimes(1);
  expect(await listNeedsReview()).toEqual([{ id: item.id, kind: 'code', payload: item.payload, result: { status: 'not_found' } }]);
  await resolveQueued(item.id);
  expect(await listQueued()).toEqual([]);
});

it('retains candidate photos until review finishes, without another identify call', async () => {
  const source = FileSystem.documentDirectory! + 'review.jpg';
  await mockFs.writeFile(source, 'review image');
  await enqueue({ kind: 'photo', uri: source });
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
  expect(await mockFs.readFile(item.payload, 'utf8')).toBe('review image');
  expect(await listNeedsReview()).toEqual([{ id: item.id, kind: 'photo', payload: item.payload, result }]);
  await resolveQueued(item.id);
  expect(await listQueued()).toEqual([]);
  await expect(mockFs.stat(item.payload)).rejects.toThrow();
});

it.each(['offline', 'rate_limited', 'configuration'] as const)('stops at %s without marking work as reviewed', async code => {
  await enqueue({ kind: 'code', code: '12345670' });
  await enqueue({ kind: 'code', code: '4840001000014' });
  jest.mocked(api.lookup).mockRejectedValueOnce(new ApiError(code));
  await flushQueue();
  expect(api.lookup).toHaveBeenCalledTimes(1);
  expect(await listNeedsReview()).toEqual([]);
  expect(await listQueued()).toHaveLength(2);
});

it.each(['{', '{"status":"found"}'])('does not expose invalid saved API results: %s', async result => {
  await enqueue({ kind: 'code', code: '12345670' });
  await markNeedsReview((await listQueued())[0]!.id, result);
  expect(await listNeedsReview()).toEqual([]);
  expect(await listQueued()).toHaveLength(1);
});
it.each([identifyCandidates, identifyNotFound])('retains $status through interrupted review until an explicit decision', async (response) => {
  const source = FileSystem.documentDirectory! + 'unknown.jpg';
  await mockFs.writeFile(source, 'unknown photo');
  await enqueue({ kind: 'photo', uri: source });
  jest.mocked(api.identify).mockResolvedValue(response);
  await flushQueue();
  const kept = (await listQueued())[0]!;
  expect(await mockFs.readFile(kept.payload, 'utf8')).toBe('unknown photo');
  const handled = jest.fn(() => true);
  const unsubscribe = subscribeQueueResults(handled);
  try {
    await flushQueue();
    expect(handled).toHaveBeenCalledWith({ item: kept, result: response });
    expect(api.identify).toHaveBeenCalledTimes(1);
    expect(await listQueued()).toHaveLength(1);
    expect(await mockFs.readFile(kept.payload, 'utf8')).toBe('unknown photo');
    await resolveQueued(kept.id);
    expect(await listQueued()).toEqual([]);
    await expect(mockFs.stat(kept.payload)).rejects.toThrow();
  } finally { unsubscribe(); }
});
it('retains an unknown code after listeners unsubscribe', async () => {
  await enqueue({ kind: 'code', code: '12345670' });
  const handled = jest.fn(() => true);
  const unsubscribe = subscribeQueueResults(handled);
  unsubscribe();
  jest.mocked(api.lookup).mockResolvedValue({ status: 'not_found' });
  await flushQueue();
  expect(handled).not.toHaveBeenCalled();
  expect(await listQueued()).toHaveLength(1);
});
it('processes every pending product after the first screen handoff', async () => {
  await enqueue({ kind: 'code', code: '12345670' });
  await enqueue({ kind: 'code', code: '4840001000014' });
  jest.mocked(api.lookup).mockResolvedValue(foundYogurt);
  const stop = subscribeQueueResults(() => true);
  try {
    expect(await flushQueue()).toEqual({ resolved: 2 });
    expect(await listQueued()).toEqual([]);
  } finally { stop(); }
});
it('replays a saved review before an older pending request fails offline', async () => {
  await enqueue({ kind: 'code', code: '12345670' });
  await enqueue({ kind: 'code', code: '4840001000014' });
  const saved = (await listQueued())[1]!;
  await markNeedsReview(saved.id, JSON.stringify({ status: 'not_found' }));
  const order: string[] = [];
  jest.mocked(api.lookup).mockImplementation(async () => { order.push('request'); throw new ApiError('offline'); });
  const stop = subscribeQueueResults(({ item }) => { order.push(item.id); return true; });
  try {
    await flushQueue();
    expect(order).toEqual([saved.id, 'request']);
    expect(await listNeedsReview()).toHaveLength(1);
  } finally { stop(); }
});
it('retains a valid photo after a transient read failure and resolves it on retry', async () => {
  const source = FileSystem.documentDirectory! + 'busy.jpg';
  await mockFs.writeFile(source, 'valid photo');
  await enqueue({ kind: 'photo', uri: source });
  const read = jest.spyOn(FileSystem, 'readAsStringAsync').mockRejectedValueOnce(new Error('temporarily busy'));
  try {
    await flushQueue();
    expect(await listQueued()).toHaveLength(1);
    jest.mocked(api.identify).mockResolvedValue(identifyCandidates);
    await retryQueued((await listQueued())[0]!.id);
    expect(await listNeedsReview()).toHaveLength(1);
  } finally { read.mockRestore(); }
});
it('resumes an unresolved code item when it is found', async () => {
  await enqueue({ kind: 'code', code: '4840001000014' });
  const item = (await listQueued())[0]!;
  jest.mocked(api.lookup).mockResolvedValueOnce(foundYogurt);
  const res = await resumeQueuedItem(item);
  expect(res).toEqual({ kind: 'found', productId: foundYogurt.product.id });
  expect(await listQueued()).toEqual([]);
  expect((await getFromHistory(foundYogurt.product.id))?.product.id).toBe(foundYogurt.product.id);
});

it('resumes an unresolved code item when it is not_found and routes to identify', async () => {
  await enqueue({ kind: 'code', code: '12345670' });
  const item = (await listQueued())[0]!;
  jest.mocked(api.lookup).mockResolvedValueOnce({ status: 'not_found' });
  const res = await resumeQueuedItem(item);
  expect(res).toEqual({
    kind: 'identify',
    pathname: '/identify',
    params: { source: 'code', code: '12345670', queueId: item.id },
  });
  expect(await listNeedsReview()).toHaveLength(1);
  await resolveQueued(item.id);
  expect(await listQueued()).toEqual([]);
});

it('resumes an unresolved photo item when it has candidates and routes to identify', async () => {
  const source = FileSystem.documentDirectory! + 'candidate.jpg';
  await mockFs.writeFile(source, 'photo content');
  await enqueue({ kind: 'photo', uri: source });
  const item = (await listQueued())[0]!;
  const candidatesResponse = {
    status: 'candidates' as const,
    candidates: [
      {
        id: foundYogurt.product.id,
        name: foundYogurt.product.name,
        brand: foundYogurt.product.brand,
        quantity: foundYogurt.product.quantity,
        imageUrl: null,
        similarity: 0.8,
      },
    ],
    read: { brand: 'Danone', name: 'Yogurt', quantity: '150g', code: null },
    photoPath: 'stored/path.jpg',
  };
  jest.mocked(api.identify).mockResolvedValue(candidatesResponse);
  const res = await resumeQueuedItem(item);
  expect(res).toEqual({
    kind: 'identify',
    pathname: '/identify',
    params: { source: 'photo', payload: JSON.stringify(candidatesResponse), queueId: item.id },
  });
  expect(await listNeedsReview()).toHaveLength(1);
  expect(await mockFs.readFile(item.payload, 'utf8')).toBe('photo content');
  const reopened = await resumeQueuedItem(item);
  if (reopened.kind !== 'identify') throw new Error('Expected a persisted review');
  expect(JSON.parse(reopened.params.payload!)).toEqual(candidatesResponse);
  expect(api.identify).toHaveBeenCalledTimes(1);
  await resolveQueued(item.id);
  expect(await listQueued()).toEqual([]);
  expect(await listUnresolvedQueued()).toEqual([]);
});
it('enters the shared platform lock before draining persisted work', async () => {
  const lock = jest.spyOn(queueLocks, 'withQueueLock');
  try {
    await enqueue({ kind: 'code', code: '12345670' });
    jest.mocked(api.lookup).mockResolvedValueOnce(foundYogurt);
    expect(await flushQueue()).toEqual({ resolved: 1 });
    expect(lock).toHaveBeenCalledWith(expect.any(Function));
  } finally { lock.mockRestore(); }
});
it('sends a not_found code once, then keeps it for review with its result', async () => {
  await enqueue({ kind: 'code', code: '12345670' });
  jest.mocked(api.lookup).mockResolvedValue({ status: 'not_found' });
  await flushQueue();
  await flushQueue();
  expect(api.lookup).toHaveBeenCalledTimes(1);
  expect(await listNeedsReview()).toEqual([expect.objectContaining({ kind: 'code', payload: '12345670', result: { status: 'not_found' } })]);
});
it('sends a candidates photo once and keeps its photo file for review', async () => {
  const source = FileSystem.documentDirectory! + 'cand.jpg';
  await mockFs.writeFile(source, 'cand image');
  await enqueue({ kind: 'photo', uri: source });
  jest.mocked(api.identify).mockResolvedValue(identifyCandidates);
  await flushQueue();
  await flushQueue();
  expect(api.identify).toHaveBeenCalledTimes(1);
  const [item] = await listNeedsReview();
  expect(item).toMatchObject({ kind: 'photo', result: identifyCandidates });
  expect(await mockFs.readFile(item!.payload, 'utf8')).toBe('cand image');
});
it('resolveQueued removes the row and the photo file', async () => {
  const source = FileSystem.documentDirectory! + 'done.jpg';
  await mockFs.writeFile(source, 'done image');
  await enqueue({ kind: 'photo', uri: source });
  jest.mocked(api.identify).mockResolvedValue(identifyCandidates);
  await flushQueue();
  const [item] = await listNeedsReview();
  await resolveQueued(item!.id);
  expect(await listQueued()).toEqual([]);
  await expect(mockFs.stat(item!.payload)).rejects.toThrow();
});

it('keeps a photo review retryable when deleting the retained file fails', async () => {
  const source = FileSystem.documentDirectory! + 'retry-cleanup.jpg';
  await mockFs.writeFile(source, 'retained image');
  await enqueue({ kind: 'photo', uri: source });
  jest.mocked(api.identify).mockResolvedValue(identifyCandidates);
  await flushQueue();
  const [item] = await listNeedsReview();
  jest.mocked(FileSystem.deleteAsync).mockRejectedValueOnce(new Error('file locked'));

  await expect(resolveQueued(item!.id)).rejects.toThrow('file locked');
  expect(await listNeedsReview()).toEqual([item]);
  expect(await mockFs.readFile(item!.payload, 'utf8')).toBe('retained image');
  await flushQueue();
  expect(api.identify).toHaveBeenCalledTimes(1);

  await resolveQueued(item!.id);
  expect(await listQueued()).toEqual([]);
  await expect(mockFs.stat(item!.payload)).rejects.toThrow();
});

it('keeps a not_found photo for review with read and photoPath intact', async () => {
  const source = FileSystem.documentDirectory! + 'not_found.jpg';
  await mockFs.writeFile(source, 'unrecognized image');
  await enqueue({ kind: 'photo', uri: source });
  const identifyNotFound = {
    status: 'not_found' as const,
    read: { brand: 'BrandX', name: 'ProductY', quantity: '100g', code: null },
    photoPath: 'test/not_found_photo.jpg',
  };
  jest.mocked(api.identify).mockResolvedValue(identifyNotFound);
  await flushQueue();
  const [item] = await listNeedsReview();
  expect(item).toEqual({
    id: expect.any(String),
    kind: 'photo',
    payload: expect.any(String),
    result: identifyNotFound,
  });
});

it('skips corrupt review items without throwing', async () => {
  await putQueued({
    id: 'corrupt',
    kind: 'photo',
    payload: 'some/path.jpg',
    createdAt: new Date().toISOString(),
  });
  await setQueuedReview('corrupt', '{invalid json');
  expect(await listNeedsReview()).toEqual([]);
});

it('keeps a photo review retryable when deleting the retained file fails', async () => {
  const source = FileSystem.documentDirectory! + 'retry-cleanup.jpg';
  await mockFs.writeFile(source, 'retained image');
  await enqueue({ kind: 'photo', uri: source });
  jest.mocked(api.identify).mockResolvedValue(identifyCandidates);
  await flushQueue();
  const [item] = await listNeedsReview();
  jest.mocked(FileSystem.deleteAsync).mockRejectedValueOnce(new Error('file locked'));

  await expect(resolveQueued(item!.id)).rejects.toThrow('file locked');
  expect(await listNeedsReview()).toEqual([item]);
  expect(await mockFs.readFile(item!.payload, 'utf8')).toBe('retained image');
  await flushQueue();
  expect(api.identify).toHaveBeenCalledTimes(1);

  await resolveQueued(item!.id);
  expect(await listQueued()).toEqual([]);
  await expect(mockFs.stat(item!.payload)).rejects.toThrow();
});

it('persists unresolved results and does not submit them automatically again', async () => {
  await enqueue({ kind: 'code', code: '12345670' });
  jest.mocked(api.lookup).mockResolvedValue({ status: 'not_found' });
  await flushQueue();
  expect((await listQueue())[0]?.outcome).toEqual({ status: 'not_found' });
  await flushQueue();
  expect(api.lookup).toHaveBeenCalledTimes(1);
});
it('allows an explicit retry and exposes service failures instead of silently retrying forever', async () => {
  await enqueue({ kind: 'code', code: '4840001000014' });
  jest.mocked(api.lookup).mockRejectedValueOnce(new ApiError('rate_limited'));
  await flushQueue();
  const pending = (await listQueue())[0]!;
  expect(pending.error).toBe('rate_limited');
  jest.mocked(api.lookup).mockResolvedValueOnce(foundYogurt);
  expect(await retryQueued(pending.id)).toEqual({ resolved: 1 });
  expect(await listQueue()).toEqual([]);
});
it('keeps review photo ownership until acknowledged by its consumer', async () => {
  const source = FileSystem.documentDirectory! + 'review.jpg';
  await mockFs.writeFile(source, 'review image');
  await enqueue({ kind: 'photo', uri: source });
  const read = { brand: null, name: null, quantity: null, code: null };
  jest.mocked(api.identify).mockResolvedValueOnce({ status: 'not_found', read, photoPath: 'device/review.jpg' });
  await flushQueue();
  const item = (await listQueue())[0]!;
  const owned = await openQueuedPhoto(item.id);
  expect(await mockFs.readFile(owned.uri, 'utf8')).toBe('review image');
  owned.release();
  expect(await mockFs.stat(owned.uri)).toBeDefined();
  await completeQueued(item.id);
  await expect(mockFs.stat(owned.uri)).rejects.toThrow();
  expect(await listQueue()).toEqual([]);
});
it('retains a readable capture when a transient storage read fails', async () => {
  const source = FileSystem.documentDirectory! + 'busy.jpg';
  await mockFs.writeFile(source, 'retained image');
  await enqueue({ kind: 'photo', uri: source });
  const read = jest.spyOn(FileSystem, 'readAsStringAsync').mockRejectedValueOnce(new Error('storage busy'));
  await flushQueue();
  const item = (await listQueue())[0]!;
  expect(item.error).toBe('storage');
  expect(await mockFs.readFile(item.payload, 'utf8')).toBe('retained image');
  read.mockRestore();
  jest.mocked(api.identify).mockResolvedValueOnce({ ...foundYogurt, photoPath: 'test/restored.jpg' });
  expect(await retryQueued(item.id)).toEqual({ resolved: 1 });
  expect(await listQueue()).toEqual([]);
});
it('preserves a review committed by an in-flight drain when Retry was already clicked', async () => {
  const source = FileSystem.documentDirectory! + 'in-flight.jpg';
  await mockFs.writeFile(source, 'pending photo');
  await enqueue({ kind: 'photo', uri: source });
  const item = (await listQueued())[0]!;
  let started!: () => void, finish!: (value: typeof identifyCandidates) => void;
  const requested = new Promise<void>(resolve => { started = resolve; });
  const response = new Promise<typeof identifyCandidates>(resolve => { finish = resolve; });
  jest.mocked(api.identify).mockImplementation(() => { started(); return response; });
  const flushing = flushQueue();
  await requested;
  const retrying = retryQueued(item.id);
  finish(identifyCandidates);
  await Promise.all([flushing, retrying]);
  expect(api.identify).toHaveBeenCalledTimes(1);
  expect(await listNeedsReview()).toHaveLength(1);
});
it('continues with a healthy code after retaining an unreadable photo', async () => {
  const source = FileSystem.documentDirectory! + 'one-busy.jpg';
  await mockFs.writeFile(source, 'valid capture');
  await enqueue({ kind: 'photo', uri: source });
  await enqueue({ kind: 'code', code: '12345670' });
  const read = jest.spyOn(FileSystem, 'readAsStringAsync').mockRejectedValueOnce(new Error('busy'));
  try {
    jest.mocked(api.lookup).mockResolvedValueOnce(foundYogurt);
    expect(await flushQueue()).toEqual({ resolved: 1 });
    expect((await listQueue()).map(row => row.kind)).toEqual(['photo']);
  } finally { read.mockRestore(); }
});
it.each(['photo', 'row'])('keeps a %s cleanup failure retryable without reopening review', async boundary => {
  const source = FileSystem.documentDirectory! + `cleanup-${boundary}.jpg`;
  await mockFs.writeFile(source, 'completed capture');
  await enqueue({ kind: 'photo', uri: source });
  jest.mocked(api.identify).mockResolvedValueOnce(identifyCandidates);
  await flushQueue();
  const item = (await listQueued())[0]!;
  const failed = boundary === 'photo'
    ? jest.spyOn(FileSystem, 'deleteAsync').mockRejectedValueOnce(new Error('photo busy'))
    : jest.spyOn(queueDb, 'deleteQueued').mockRejectedValueOnce(new Error('row busy'));
  try {
    await expect(resolveQueued(item.id)).rejects.toThrow();
    expect((await listQueued())[0]?.status).toBe('needs_review');
    expect(await listNeedsReview()).toHaveLength(1);
    await flushQueue();
    expect(api.identify).toHaveBeenCalledTimes(1);
    await resolveQueued(item.id);
    expect(await listQueued()).toEqual([]);
  } finally { failed.mockRestore(); }
});

it('prevents upload of an unstarted photo cancelled while an earlier item was in flight', async () => {
  const sourceB = FileSystem.documentDirectory! + 'photo-cancelled-while-in-flight.jpg';
  await mockFs.writeFile(sourceB, 'capture b');
  await enqueue({ kind: 'code', code: '12345670' });
  await enqueue({ kind: 'photo', uri: sourceB });
  const [, itemB] = await listQueue();

  let finishLookup!: () => void;
  const lookupPromise = new Promise<LookupResponse>(resolve => { finishLookup = () => resolve(foundYogurt); });
  jest.mocked(api.lookup).mockReturnValueOnce(lookupPromise);

  const flushing = flushQueue();

  const deleteSpy = jest.spyOn(FileSystem, 'deleteAsync').mockRejectedValueOnce(new Error('photo delete failed'));
  try {
    await completeQueued(itemB!.id);
    expect((await listQueued()).find(row => row.id === itemB!.id)?.status).toBe('completed');

    finishLookup();
    await flushing;

    expect(api.identify).not.toHaveBeenCalled();
  } finally {
    deleteSpy.mockRestore();
  }
});

it('discards late direct resumption when another tab commits cancellation during the request', async () => {
  const source = FileSystem.documentDirectory! + 'photo-resume-cancel.jpg';
  await mockFs.writeFile(source, 'capture cancel');
  await enqueue({ kind: 'photo', uri: source });
  const [item] = await listQueue();

  let finishIdentify!: () => void;
  const identifyPromise = new Promise<IdentifyResponse>(resolve => {
    finishIdentify = () => resolve(identifyCandidates);
  });
  jest.mocked(api.identify).mockReturnValueOnce(identifyPromise);

  const resuming = resumeQueuedItem(item!);

  const deleteSpy = jest.spyOn(FileSystem, 'deleteAsync').mockRejectedValueOnce(new Error('delete failed'));
  try {
    await completeQueued(item!.id);
    expect((await listQueued()).find(row => row.id === item!.id)?.status).toBe('completed');

    finishIdentify();
    await expect(resuming).rejects.toThrow();

    expect(await listNeedsReview()).toEqual([]);
  } finally {
    deleteSpy.mockRestore();
  }
});

it('opens a persisted outcome while an unrelated lookup is still pending', async () => {
  await enqueue({ kind: 'code', code: '12345670' });
  const source = FileSystem.documentDirectory! + 'saved-review.jpg';
  await mockFs.writeFile(source, 'saved review');
  await enqueue({ kind: 'photo', uri: source });

  const items = await listQueue();
  const photoItem = items.find(i => i.kind === 'photo')!;
  await queueDb.markNeedsReview(photoItem.id, JSON.stringify(identifyCandidates));

  let finishLookup!: (val: LookupResponse) => void;
  const lookupPromise = new Promise<LookupResponse>(resolve => { finishLookup = resolve; });
  jest.mocked(api.lookup).mockReturnValueOnce(lookupPromise);

  const flushing = flushQueue();

  const resumed = await resumeQueuedItem(photoItem);
  expect(resumed.kind).toBe('identify');

  finishLookup(foundYogurt);
  await flushing;
});

it('restores NeedsReviewItem discriminated union type and preserves kind-result relationship', async () => {
  await enqueue({ kind: 'code', code: '12345670' });
  const [codeItem] = await listQueue();
  await queueDb.markNeedsReview(codeItem!.id, JSON.stringify(lookupNotFound));

  const source = FileSystem.documentDirectory! + 'discriminated-photo.jpg';
  await mockFs.writeFile(source, 'photo');
  await enqueue({ kind: 'photo', uri: source });
  const photoItem = (await listQueue()).find(i => i.kind === 'photo')!;
  await queueDb.markNeedsReview(photoItem.id, JSON.stringify(identifyCandidates));

  const items: NeedsReviewItem[] = await listNeedsReview();
  expect(items).toHaveLength(2);

  const codeReview = items.find(i => i.kind === 'code');
  const photoReview = items.find(i => i.kind === 'photo');

  expect(codeReview?.result.status).toBe('not_found');
  expect(photoReview?.result.status).toBe('candidates');
  if (photoReview && photoReview.kind === 'photo' && photoReview.result.status === 'candidates') {
    expect(photoReview.result.candidates).toBeDefined();
  }
});

it('prevents identify request if cancellation commits while readPhoto is in flight during drain', async () => {
  const source = FileSystem.documentDirectory! + 'cancel-during-read-drain.jpg';
  await mockFs.writeFile(source, 'photo content');
  await enqueue({ kind: 'photo', uri: source });
  const [item] = await listQueue();

  const readSpy = jest.spyOn(FileSystem, 'readAsStringAsync').mockImplementationOnce(async (path: string) => {
    // Cancellation commits in database while photo read is in flight
    await queueDb.deleteQueued(item!.id);
    return (await mockFs.readFile(path)).toString('base64');
  });

  try {
    await flushQueue();
    expect(api.identify).not.toHaveBeenCalled();
  } finally {
    readSpy.mockRestore();
  }
});

it('rejects with not_found and prevents identify request if cancellation commits while readPhoto is in flight during resume', async () => {
  const source = FileSystem.documentDirectory! + 'cancel-during-read-resume.jpg';
  await mockFs.writeFile(source, 'photo content');
  await enqueue({ kind: 'photo', uri: source });
  const [item] = await listQueue();

  const readSpy = jest.spyOn(FileSystem, 'readAsStringAsync').mockImplementationOnce(async (path: string) => {
    // Cancellation commits in database while photo read is in flight
    await queueDb.deleteQueued(item!.id);
    return (await mockFs.readFile(path)).toString('base64');
  });

  try {
    await expect(resumeQueuedItem(item!)).rejects.toThrow();
    expect(api.identify).not.toHaveBeenCalled();
  } finally {
    readSpy.mockRestore();
  }
});

it('direct resumption rejects when cancellation commits right before markNeedsReview commits', async () => {
  const source = FileSystem.documentDirectory! + 'cancel-before-mark-review.jpg';
  await mockFs.writeFile(source, 'photo content');
  await enqueue({ kind: 'photo', uri: source });
  const [item] = await listQueue();

  jest.mocked(api.identify).mockResolvedValueOnce(identifyCandidates);

  const markSpy = jest.spyOn(queueDb, 'markNeedsReview').mockImplementationOnce(async (id: string) => {
    // Another client cancelled right before markNeedsReview commits
    await queueDb.deleteQueued(id);
  });

  try {
    await expect(resumeQueuedItem(item!)).rejects.toThrow();
    expect(await listNeedsReview()).toEqual([]);
  } finally {
    markSpy.mockRestore();
  }
});
