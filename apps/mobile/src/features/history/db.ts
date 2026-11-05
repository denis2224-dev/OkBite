import { openDatabaseAsync } from 'expo-sqlite';

let connection: ReturnType<typeof openDatabaseAsync> | undefined;
function getDatabase() {
  connection ??= (async () => {
    const db = await openDatabaseAsync('okbite.db');
    await db.execAsync("CREATE TABLE IF NOT EXISTS history (id TEXT PRIMARY KEY, json TEXT NOT NULL, saved_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS queue (id TEXT PRIMARY KEY, kind TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', result TEXT);");
    const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(queue)');
    if (!columns.some(column => column.name === 'status')) {
      await db.execAsync("ALTER TABLE queue ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'");
    }
    if (!columns.some(column => column.name === 'result')) {
      await db.execAsync('ALTER TABLE queue ADD COLUMN result TEXT');
    }
    if (!columns.some(column => column.name === 'error')) await db.execAsync('ALTER TABLE queue ADD COLUMN error TEXT');
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
export type QueuedItem = { id: string; kind: 'photo' | 'code'; payload: string; createdAt: string; status: 'pending' | 'needs_review' | 'completed'; result: string | null; error?: string };
export async function putQueued(item: Omit<QueuedItem, 'status' | 'result'>): Promise<void> {
  await (await getDatabase()).runAsync('INSERT INTO queue (id,kind,payload,created_at) VALUES (?,?,?,?)', item.id, item.kind, item.payload, item.createdAt);
}
export async function listQueued(): Promise<QueuedItem[]> {
  const rows = await (await getDatabase()).getAllAsync<QueuedItem>('SELECT id,kind,payload,created_at AS createdAt,status,result,error FROM queue ORDER BY created_at ASC,rowid ASC');
  return rows.map(({ error, ...row }) => error ? { ...row, error } : row);
}
export async function markNeedsReview(id: string, result: string): Promise<void> {
  await (await getDatabase()).runAsync("UPDATE queue SET status='needs_review',error=NULL,result=? WHERE id=? AND status='pending'", result, id);
}
export async function deleteQueued(id: string): Promise<void> {
  await (await getDatabase()).runAsync('DELETE FROM queue WHERE id=?', id);
}

export async function saveQueuedError(id: string, error: string): Promise<void> {
  await (await getDatabase()).runAsync('UPDATE queue SET error=? WHERE id=?', error, id);
}
export async function resetQueued(id: string, corruptResult?: string | null): Promise<void> {
  await (await getDatabase()).runAsync("UPDATE queue SET status='pending',result=NULL,error=NULL WHERE id=? AND (status='pending' OR (status='needs_review' AND ?=1 AND result IS ?))", id, corruptResult === undefined ? 0 : 1, corruptResult ?? null);
}
export async function markQueuedComplete(id: string): Promise<void> {
  await (await getDatabase()).runAsync("UPDATE queue SET status='completed',result=NULL,error=NULL WHERE id=?", id);
}
export async function saveQueuedConfirmation(id: string, result: string, payload = id, kind: 'code' | 'photo' = 'code'): Promise<void> {
  await (await getDatabase()).runAsync(
    "INSERT INTO queue (id,kind,payload,created_at,status,result) VALUES (?,?,?,?,'completed',?) ON CONFLICT(id) DO UPDATE SET status='completed',result=excluded.result,error=NULL",
    id, kind, payload, new Date().toISOString(), result,
  );
}
export const setQueuedReview = markNeedsReview;
