import { DatabaseSync as mockDatabaseSync } from 'node:sqlite';
import { listQueued, setQueuedReview } from './db';

jest.mock('expo-sqlite', () => {
  const sqlite = new mockDatabaseSync(':memory:');
  // The queue table as installed before status/result existed.
  sqlite.exec("CREATE TABLE queue (id TEXT PRIMARY KEY, kind TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL); INSERT INTO queue VALUES ('old','code','12345670','2026-11-05T00:00:00.000Z');");
  const connection = {
    execAsync: async (sql: string) => sqlite.exec(sql),
    runAsync: async (sql: string, ...values: (string | number)[]) => sqlite.prepare(sql).run(...values),
    getAllAsync: async (sql: string) => sqlite.prepare(sql).all(),
  };
  return { openDatabaseAsync: async () => connection };
});
it('keeps rows from an old queue table as pending and can mark them for review', async () => {
  expect(await listQueued()).toEqual([{ id: 'old', kind: 'code', payload: '12345670', createdAt: '2026-11-05T00:00:00.000Z', status: 'pending', result: null }]);
  await setQueuedReview('old', '{"status":"not_found"}');
  expect((await listQueued())[0]).toMatchObject({ status: 'needs_review', result: '{"status":"not_found"}' });
});
