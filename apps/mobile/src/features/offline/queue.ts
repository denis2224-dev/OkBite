import { randomUUID } from 'expo-crypto';
import { Code, IdentifyResponse, LookupResponse } from '@okbite/shared';
import { api, ApiError } from '../../lib/api';
import { putQueued, listQueued, deleteQueued, markNeedsReview, saveQueuedError, resetQueued, markQueuedComplete, type QueuedItem } from '../history/db';
import { saveToHistory } from '../history/store';
import { keepPhoto, readPhoto, removePhoto, openPhoto } from './photos';
import { MissingPhotoError } from './photo_errors';
import { notifyQueue } from './events';
import { withQueueLock } from './queueLock';
export { subscribeQueue } from './events';

export type QueueResult = { item: Pick<QueuedItem, 'id' | 'kind' | 'payload'>; result: LookupResponse | IdentifyResponse };
const resultListeners = new Set<(event: QueueResult) => boolean>();
export function subscribeQueueResults(listener: (event: QueueResult) => boolean): () => void {
  resultListeners.add(listener);
  return () => { resultListeners.delete(listener); };
}
function handoff(event: QueueResult): void {
  for (const listener of resultListeners) {
    try { if (listener(event)) return; } catch { /* Views cannot abandon durable work. */ }
  }
}

type Review = Exclude<IdentifyResponse | LookupResponse, { status: 'found' }>;
export type QueueEntry = Omit<QueuedItem, 'result'> & { outcome?: Review };
export async function listQueue(): Promise<QueueEntry[]> {
  return (await listQueued()).map(({ result, ...item }) => {
    if (item.status !== 'needs_review') return item;
    try {
      const schema = item.kind === 'photo' ? IdentifyResponse : LookupResponse;
      const outcome = schema.parse(JSON.parse(result ?? 'null'));
      if (outcome.status === 'found') return { ...item, error: 'invalid_response' };
      return { ...item, outcome };
    } catch { return { ...item, error: 'invalid_response' }; }
  });
}
export type NeedsReviewItem =
  | { id: string; kind: 'code'; payload: string; result: LookupResponse }
  | { id: string; kind: 'photo'; payload: string; result: IdentifyResponse };

// Retain R5's published consumer interface and persisted status/result representation.
export async function listNeedsReview(): Promise<NeedsReviewItem[]> {
  const items = await listQueue();
  const reviewed: NeedsReviewItem[] = [];
  for (const item of items) {
    if (!item.outcome) continue;
    if (item.kind === 'photo') {
      reviewed.push({ id: item.id, kind: 'photo', payload: item.payload, result: item.outcome as IdentifyResponse });
    } else {
      reviewed.push({ id: item.id, kind: 'code', payload: item.payload, result: item.outcome as LookupResponse });
    }
  }
  return reviewed;
}
export async function resolveQueued(id: string): Promise<void> { await completeQueued(id); }
export async function enqueue(item: { kind: 'photo'; uri: string } | { kind: 'code'; code: string }): Promise<void> {
  const payload = item.kind === 'photo' ? await keepPhoto(item.uri) : Code.parse(item.code);
  try { await putQueued({ id: randomUUID(), kind: item.kind, payload, createdAt: new Date().toISOString() }); }
  catch (error) {
    if (item.kind === 'photo') await removePhoto(payload).catch(() => {});
    throw error;
  }
  notifyQueue('enqueued');
}
export async function openQueuedPhoto(id: string) {
  const item = (await listQueue()).find(row => row.id === id);
  if (!item || item.kind !== 'photo') throw new ApiError('bad_request');
  return openPhoto(item.payload);
}
export async function completeQueued(id: string): Promise<void> {
  const item = (await listQueued()).find(row => row.id === id);
  if (!item) return;
  // Commit acknowledgement before cleanup; a cleanup failure must never reopen add/review.
  if (item.status !== 'completed') await markQueuedComplete(id);
  try {
    if (item.kind === 'photo') await removePhoto(item.payload);
    await deleteQueued(id);
  } catch { await saveQueuedError(id, 'storage').catch(() => {}); }
  notifyQueue();
}
export async function retryQueued(id: string) {
  if (running) await running;
  await withQueueLock(async () => {
    const entry = (await listQueue()).find(item => item.id === id);
    const raw = entry?.error === 'invalid_response' ? (await listQueued()).find(item => item.id === id) : undefined;
    await resetQueued(id, raw?.result);
  });
  notifyQueue();
  return flushQueue();
}
let running: Promise<{ resolved: number }> | undefined;
const resolvedListeners = new Set<(id: string) => void>();
export function flushQueue(onResolved?: (id: string) => void): Promise<{ resolved: number }> {
  if (onResolved) resolvedListeners.add(onResolved);
  running ??= withQueueLock(drain).finally(() => { running = undefined; resolvedListeners.clear(); notifyQueue(); });
  return running;
}
async function drain() {
  let resolved = 0;
  const items = await listQueue();
  const stored = new Map((await listQueued()).map(item => [item.id, item]));
  // Cached review results must remain accessible when older network work fails.
  for (const item of items) if (item.outcome && stored.get(item.id)?.status === 'needs_review') handoff({ item: stored.get(item.id)!, result: item.outcome });
  for (const item of items) {
    const current = (await listQueued()).find(row => row.id === item.id);
    if (!current) continue;
    if (current.status === 'completed') { await completeQueued(item.id); continue; }
    // Human-review outcomes and failed work stay durable until explicit retry/acknowledgement.
    if (current.status !== 'pending' || (current.error && current.error !== 'offline')) continue;
    let photo: string | undefined;
    if (item.kind === 'photo') {
      try { photo = await readPhoto(item.payload); }
      catch (error) {
        if (error instanceof MissingPhotoError) { await deleteQueued(item.id); notifyQueue('missing_photo'); continue; }
        await saveQueuedError(item.id, 'storage');
        notifyQueue();
        continue;
      }
    }
    try {
      const result = photo === undefined ? await api.lookup({ code: item.payload }) : await api.identify(photo);
      if (!(await listQueued()).some(row => row.id === item.id && row.status === 'pending')) continue;
      if (result.status !== 'found') {
        await markNeedsReview(item.id, JSON.stringify(result));
        if (!(await listQueued()).some(row => row.id === item.id && row.status === 'needs_review')) continue;
        notifyQueue();
        handoff({ item, result });
        continue;
      }
      await saveToHistory(result);
      await completeQueued(item.id);
      resolved++;
      handoff({ item, result });
      for (const listener of resolvedListeners) {
        try { listener(result.product.id); } catch { /* Resolution must not depend on navigation. */ }
      }
    } catch (error) {
      const code = error instanceof ApiError ? error.code : 'storage';
      await saveQueuedError(item.id, code);
      notifyQueue();
      if (code === 'offline' || code === 'rate_limited' || code === 'configuration' || code === 'storage') break;
    }
  }
  return { resolved };
}

export type ResumeResult =
  | { kind: 'found'; productId: string }
  | { kind: 'identify'; pathname: string; params: Record<string, string> };
export async function resumeQueuedItem(input: Pick<QueuedItem, 'id' | 'kind' | 'payload'>): Promise<ResumeResult> {
  const existing = (await listQueue()).find(row => row.id === input.id);
  if (existing?.status === 'completed') throw new ApiError('bad_request');
  if (existing?.outcome) {
    return { kind: 'identify', pathname: '/identify', params: existing.kind === 'code'
      ? { source: 'code', code: existing.payload, queueId: existing.id }
      : { source: 'photo', payload: JSON.stringify(existing.outcome), queueId: existing.id } };
  }
  if (running) await running;
  return withQueueLock(async (): Promise<ResumeResult> => {
    const item = (await listQueue()).find(row => row.id === input.id);
    if (!item) throw new ApiError('not_found');
    if (item.status === 'completed') throw new ApiError('bad_request');
    const result = item.outcome ?? (item.kind === 'code'
      ? await api.lookup({ code: item.payload }) : await api.identify(await readPhoto(item.payload)));
    const fresh = (await listQueued()).find(row => row.id === item.id);
    if (!fresh || fresh.status === 'completed') throw new ApiError('not_found');
    if (result.status === 'found') {
      await saveToHistory(result);
      await completeQueued(item.id);
      return { kind: 'found', productId: result.product.id };
    }
    if (!item.outcome) { await markNeedsReview(item.id, JSON.stringify(result)); notifyQueue(); }
    // Opening review is not a decision: retain the result/photo through app restart.
    return { kind: 'identify', pathname: '/identify', params: item.kind === 'code'
      ? { source: 'code', code: item.payload, queueId: item.id }
      : { source: 'photo', payload: JSON.stringify(result), queueId: item.id } };
  });
}
export async function listUnresolvedQueued(): Promise<QueuedItem[]> { return listQueued(); }

