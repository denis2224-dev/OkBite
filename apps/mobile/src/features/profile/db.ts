import { openDatabaseAsync } from 'expo-sqlite';

let connection: ReturnType<typeof openDatabaseAsync> | undefined;

function getDatabase() {
  connection ??= (async () => {
    const db = await openDatabaseAsync('okbite.db');
    await db.execAsync('CREATE TABLE IF NOT EXISTS profile (key TEXT PRIMARY KEY, json TEXT NOT NULL);');
    return db;
  })().catch((error: unknown) => {
    connection = undefined;
    throw error;
  });
  return connection;
}

export async function readProfile(): Promise<string | null> {
  const row = await (await getDatabase()).getFirstAsync<{ json: string }>(
    'SELECT json FROM profile WHERE key = ?',
    'profile',
  );
  return row?.json ?? null;
}

export async function writeProfile(json: string): Promise<void> {
  await (await getDatabase()).runAsync(
    'INSERT OR REPLACE INTO profile (key, json) VALUES (?, ?)',
    'profile',
    json,
  );
}

export async function deleteProfile(): Promise<void> {
  await (await getDatabase()).runAsync('DELETE FROM profile WHERE key = ?', 'profile');
}

