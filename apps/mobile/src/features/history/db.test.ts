import { DatabaseSync as mockDatabaseSync } from 'node:sqlite';
import { listQueued, putQueued } from './db';

jest.mock('expo-sqlite', () => {
  const sqlite = new mockDatabaseSync(':memory:');
  sqlite.exec("CREATE TABLE queue (id TEXT PRIMARY KEY, kind TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL); INSERT INTO queue VALUES ('legacy','code','12345670','2026-11-05T00:00:00.000Z');");
  return { openDatabaseAsync: async () => ({
    execAsync: async (sql: string) => sqlite.exec(sql),
    getAllAsync: async (sql: string) => sqlite.prepare(sql).all(),
    runAsync: async (sql: string, ...values: string[]) => sqlite.prepare(sql).run(...values),
  }) };
});

it('adds review columns to an existing queue without losing its pending row', async () => {
  const expected = { id: 'legacy', kind: 'code', payload: '12345670', createdAt: '2026-11-05T00:00:00.000Z', status: 'pending', result: null };
  expect(await listQueued()).toEqual([expected]);
  expect(await listQueued()).toEqual([expected]);
  await putQueued({ id: 'new', kind: 'code', payload: '4840001000014', createdAt: expected.createdAt });
  expect((await listQueued())[1]).toMatchObject({ id: 'new', status: 'pending', result: null });
});
