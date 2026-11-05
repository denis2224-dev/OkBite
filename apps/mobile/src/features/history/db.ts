import { openDatabaseAsync } from 'expo-sqlite';

let connection: ReturnType<typeof openDatabaseAsync> | undefined;
function getDatabase() {
  connection ??= (async () => {
    const db = await openDatabaseAsync('okbite.db');
    await db.execAsync('CREATE TABLE IF NOT EXISTS history (id TEXT PRIMARY KEY, json TEXT NOT NULL, saved_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS queue (id TEXT PRIMARY KEY, kind TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL);');
    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(queue)');
    if (!columns.some(column => column.name === 'state')) await db.execAsync('ALTER TABLE queue ADD COLUMN state TEXT');
    return db;
  })().catch(error => { connection = undefined; throw error; });
  return connection;
}
export async function readHistory(): Promise<{ json: string }[]> {
  return (await getDatabase()).getAllAsync('SELECT json FROM history ORDER BY saved_at DESC, rowid DESC LIMIT 200');
}
export async function writeHistory(id: string, json: string, savedAt: string): Promise<void> {
  await (await getDatabase()).withExclusiveTransactionAsync(async tx => {
    await tx.runAsync('INSERT OR REPLACE INTO history (id,json,saved_at) VALUES (?,?,?)', id, json, savedAt);
    await tx.runAsync('DELETE FROM history WHERE id NOT IN (SELECT id FROM history ORDER BY saved_at DESC,rowid DESC LIMIT 200)');
  });
}
export async function deleteHistory(): Promise<void> {
  await (await getDatabase()).runAsync('DELETE FROM history');
}
export type QueuedItem = { id: string; kind: 'photo' | 'code'; payload: string; createdAt: string; state?: string | null };
export async function putQueued(item: QueuedItem): Promise<void> {
  await (await getDatabase()).runAsync('INSERT INTO queue (id,kind,payload,created_at) VALUES (?,?,?,?)', item.id, item.kind, item.payload, item.createdAt);
}
export async function listQueued(): Promise<QueuedItem[]> {
  return (await getDatabase()).getAllAsync('SELECT id,kind,payload,created_at AS createdAt,state FROM queue ORDER BY created_at ASC,rowid ASC');
}
export async function deleteQueued(id: string): Promise<void> {
  await (await getDatabase()).runAsync('DELETE FROM queue WHERE id=?', id);
}

export async function saveQueuedState(id: string, state: string | null): Promise<void> {
  await (await getDatabase()).runAsync('UPDATE queue SET state=? WHERE id=?', state, id);
}
