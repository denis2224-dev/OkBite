import { identifyCandidates, identifyNotFound } from '../capture/__fixtures__/responses';
import { DatabaseSync as mockDatabaseSync } from 'node:sqlite';
import { randomUUID as mockRandomUUID } from 'node:crypto';
import * as mockFs from 'node:fs/promises';
import { mkdtempSync as mockMkdtempSync } from 'node:fs';
import { tmpdir as mockTmpdir } from 'node:os';
import { join as mockJoin } from 'node:path';
import * as FileSystem from 'expo-file-system/legacy';
import { enqueue, flushQueue, listNeedsReview, resolveQueued, subscribeQueueResults } from './queue';
import { listQueued, deleteQueued, markNeedsReview } from '../history/db';
import { getFromHistory, clearHistory } from '../history/store';
import { api, ApiError } from '../../lib/api';
import { foundYogurt } from '../../test/fixtures';

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
  deleteAsync: async (path: string) => mockFs.rm(path, { force: true }),
}));
jest.mock('../../lib/api', () => ({ ...jest.requireActual('../../lib/api'), api: { lookup: jest.fn(), identify: jest.fn() } }));
beforeEach(async () => {
  jest.clearAllMocks();
  for (const item of await listQueued()) await deleteQueued(item.id);
  await clearHistory();
});
afterAll(async () => { await mockFs.rm(FileSystem.documentDirectory!, { recursive: true, force: true }); });
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
    await flushQueue();
    expect(await listNeedsReview()).toHaveLength(1);
  } finally { read.mockRestore(); }
});
