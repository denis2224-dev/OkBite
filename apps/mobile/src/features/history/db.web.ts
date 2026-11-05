import { createStore, get, del, update } from 'idb-keyval';
import type { QueuedItem } from './db';
export type { QueuedItem } from './db';

const history = createStore('okbite-history', 'history');
const queue = createStore('okbite-queue', 'queue');
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
export async function putQueued(item: Omit<QueuedItem, 'status' | 'result'>): Promise<void> {
  await update<QueuedItem[]>('entries', rows => [...(rows ?? []), { ...item, status: 'pending', result: null }], queue);
}
export async function listQueued(): Promise<QueuedItem[]> {
  return ((await get<QueuedItem[]>('entries', queue)) ?? [])
    .map(({ error, ...row }) => ({ ...row, status: row.status ?? 'pending', result: row.result ?? null, ...(error ? { error } : {}) }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
export async function markNeedsReview(id: string, result: string): Promise<void> {
  await update<QueuedItem[]>('entries', rows => (rows ?? []).map(row => row.id === id && (row.status ?? 'pending') === 'pending' ? { ...row, status: 'needs_review', result, error: undefined } : row), queue);
}
export async function deleteQueued(id: string): Promise<void> {
  await update<QueuedItem[]>('entries', rows => (rows ?? []).filter(row => row.id !== id), queue);
}

export async function saveQueuedError(id: string, error: string): Promise<void> {
  await update<QueuedItem[]>('entries', rows => (rows ?? []).map(row => row.id === id ? { ...row, error } : row), queue);
}
export async function resetQueued(id: string, corruptResult?: string | null): Promise<void> {
  await update<QueuedItem[]>('entries', rows => (rows ?? []).map(row => row.id === id &&
    ((row.status ?? 'pending') === 'pending' || (row.status === 'needs_review' && corruptResult !== undefined && row.result === corruptResult))
    ? { ...row, status: 'pending', result: null, error: undefined } : row), queue);
}
export async function markQueuedComplete(id: string): Promise<void> {
  await update<QueuedItem[]>('entries', rows => (rows ?? []).map(row => row.id === id
    ? { ...row, status: 'completed', result: null, error: undefined } : row), queue);
}
export const setQueuedReview = markNeedsReview;
