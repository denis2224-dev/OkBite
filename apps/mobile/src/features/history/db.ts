import { openDatabaseAsync } from 'expo-sqlite';
export type QueuedItem={id:string;kind:'photo'|'code';payload:string;createdAt:string};
let connection:ReturnType<typeof openDatabaseAsync>|undefined;
async function db(){return connection??=(async()=>{const value=await openDatabaseAsync('okbite.db');await value.execAsync('CREATE TABLE IF NOT EXISTS history (id TEXT PRIMARY KEY, json TEXT NOT NULL, saved_at TEXT NOT NULL); CREATE TABLE IF NOT EXISTS queue (id TEXT PRIMARY KEY, kind TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL);');return value;})();}
export async function readHistory(){const rows=await (await db()).getAllAsync<{json:string}>('SELECT json FROM history ORDER BY saved_at DESC, rowid DESC LIMIT 200');return rows.map(row=>JSON.parse(row.json) as unknown);}
export async function writeHistory(id:string,json:string,savedAt:string){const database=await db();await database.runAsync('INSERT OR REPLACE INTO history (id,json,saved_at) VALUES (?,?,?)',id,json,savedAt);await database.runAsync('DELETE FROM history WHERE id NOT IN (SELECT id FROM history ORDER BY saved_at DESC,rowid DESC LIMIT 200)');}
export async function deleteHistory(){await (await db()).runAsync('DELETE FROM history');}
export async function putQueued(item:QueuedItem){await (await db()).runAsync('INSERT INTO queue (id,kind,payload,created_at) VALUES (?,?,?,?)',item.id,item.kind,item.payload,item.createdAt);}
export async function listQueued():Promise<QueuedItem[]>{return (await db()).getAllAsync<QueuedItem>('SELECT id,kind,payload,created_at AS createdAt FROM queue ORDER BY created_at ASC,rowid ASC');}
export async function deleteQueued(id:string){await (await db()).runAsync('DELETE FROM queue WHERE id=?',id);}
