import { openDatabaseAsync } from 'expo-sqlite';

let connection: ReturnType<typeof openDatabaseAsync> | undefined;
function getDatabase() {
  connection ??= (async () => {
    const db = await openDatabaseAsync('okbite.db');
    await db.execAsync('CREATE TABLE IF NOT EXISTS history (id TEXT PRIMARY KEY, json TEXT NOT NULL, saved_at TEXT NOT NULL);');
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
