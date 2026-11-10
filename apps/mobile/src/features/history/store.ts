import { z } from 'zod';
import { Product, ScoreResult } from '@okbite/shared';
import { writeHistory, readHistory, deleteHistory, restoreHistory } from './db';

const Entry = z.object({ product: Product, score: ScoreResult, savedAt: z.string().datetime() });
export type HistoryEntry = z.infer<typeof Entry>;
export async function saveToHistory(entry: { product: Product; score: ScoreResult }): Promise<void> {
  const value = Entry.parse({ ...entry, savedAt: new Date().toISOString() });
  await writeHistory(value.product.id, JSON.stringify(value), value.savedAt);
}
export async function listHistory(): Promise<HistoryEntry[]> {
  return (await readHistory()).flatMap(row => {
    try {
      const parsed = Entry.safeParse(JSON.parse(row.json));
      return parsed.success ? [parsed.data] : [];
    } catch { return []; }
  });
}
export async function getFromHistory(id: string): Promise<HistoryEntry | undefined> {
  return (await listHistory()).find(entry => entry.product.id === id);
}
export async function clearHistory(): Promise<void> { await deleteHistory(); }

export async function removeFromHistory(id: string): Promise<void> { await deleteHistory(id); }
export async function restoreToHistory(entry: HistoryEntry): Promise<void> {
  const value = Entry.parse(entry);
  await restoreHistory(value.product.id, JSON.stringify(value), value.savedAt);
}
