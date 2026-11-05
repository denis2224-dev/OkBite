import { DatabaseSync as mockDatabaseSync } from 'node:sqlite';
import { randomUUID as mockRandomUUID } from 'node:crypto';
import * as mockFs from 'node:fs/promises';
import { mkdtempSync as mockMkdtempSync } from 'node:fs';
import { tmpdir as mockTmpdir } from 'node:os';
import { join as mockJoin } from 'node:path';
import * as FileSystem from 'expo-file-system/legacy';
import { enqueue, flushQueue } from './queue';
import { listQueued, deleteQueued } from '../history/db';
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
