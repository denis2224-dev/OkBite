import { createStore, get, set, del, entries, update } from "idb-keyval";
import type { QueuedItem } from "./storage_service";
const history = createStore("okbite-history", "history"),
  queue = createStore("okbite-queue", "queue");
type StoredEntry = { id: string; json: string; savedAt: string };
export async function readHistory() {
  const rows = (await get<StoredEntry[]>("entries", history)) ?? [];
  return rows.map((row) => JSON.parse(row.json) as unknown);
}
export async function writeHistory(id: string, json: string, savedAt: string) {
  await update<StoredEntry[]>(
    "entries",
    (rows) =>
      [
        { id, json, savedAt },
        ...(rows ?? []).filter((row) => row.id !== id),
      ].slice(0, 200),
    history,
  );
}
export async function deleteHistory() {
  await del("entries", history);
}
export async function putQueued(item: QueuedItem) {
  await set(item.id, item, queue);
}
export async function listQueued(): Promise<QueuedItem[]> {
  return (await entries<string, QueuedItem>(queue))
    .map(([, item]) => item)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
export async function deleteQueued(id: string) {
  await del(id, queue);
}
