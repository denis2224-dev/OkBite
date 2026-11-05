import { createStore, get, del, update } from 'idb-keyval';

const history = createStore('okbite-history', 'history');
type Row = { id: string; json: string; savedAt: string };
export async function readHistory(): Promise<{ json: string }[]> {
  return ((await get<Row[]>('entries', history)) ?? []).map(({ json }) => ({ json }));
}
export async function writeHistory(id: string, json: string, savedAt: string): Promise<void> {
  await update<Row[]>('entries', rows => [
    { id, json, savedAt }, ...(rows ?? []).filter(row => row.id !== id),
  ].sort((a, b) => b.savedAt.localeCompare(a.savedAt)).slice(0, 200), history);
}
export async function deleteHistory(): Promise<void> {
  await del('entries', history);
}
