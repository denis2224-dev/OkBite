import { randomUUID } from 'expo-crypto';
import { Code, IdentifyResponse, LookupResponse, Uuid } from '@okbite/shared';
import { z } from 'zod';
import { api, ApiError } from '../../lib/api';
import { putQueued, listQueued, deleteQueued, setQueuedReview, saveQueuedError, resetQueued, type QueuedItem } from '../history/db';
import { saveToHistory } from '../history/store';
import { keepPhoto, readPhoto, removePhoto, openPhoto } from './photos';
import { MissingPhotoError } from './photo_errors';
import { notifyQueue } from './events';
export { subscribeQueue } from './events';

type Review = Exclude<IdentifyResponse | LookupResponse, { status: 'found' }>;
const Completed = z.object({ status: z.literal('completed'), productId: Uuid });
export type QueueEntry = Omit<QueuedItem, 'result'> & { outcome?: Review; completedProductId?: string };
export async function listQueue(): Promise<QueueEntry[]> {
  return (await listQueued()).map(({ result, ...item }) => {
    if (item.status !== 'needs_review') return item;
    try {
      const raw: unknown = JSON.parse(result ?? 'null');
      const completed = Completed.safeParse(raw);
      if (completed.success) return { ...item, completedProductId: completed.data.productId };
      const schema = item.kind === 'photo' ? IdentifyResponse : LookupResponse;
      const outcome = schema.parse(raw);
      if (outcome.status === 'found') return { ...item, error: 'invalid_response' };
      return { ...item, outcome };
    } catch { return { ...item, error: 'invalid_response' }; }
  });
}
export type NeedsReviewItem =
  | { id: string; kind: 'code'; payload: string; result: LookupResponse }
  | { id: string; kind: 'photo'; payload: string; result: IdentifyResponse };

export async function listNeedsReview(): Promise<NeedsReviewItem[]> {
  return (await listQueue()).flatMap<NeedsReviewItem>(({ id, kind, payload, outcome }) => {
    if (!outcome) return [];
    if (kind === 'photo' && 'photoPath' in outcome) return [{ id, kind, payload, result: outcome }];
    if (kind === 'code' && !('photoPath' in outcome)) return [{ id, kind, payload, result: outcome }];
    return [];
  });
}
export async function resolveQueued(id: string, completedProductId?: string): Promise<void> {
  if (completedProductId) {
    const completed = Completed.parse({ status: 'completed', productId: completedProductId });
    // Keep the successful result durable while local cleanup can still fail.
    await setQueuedReview(id, JSON.stringify(completed));
  }
  await completeQueued(id);
}
export async function enqueue(item: { kind: 'photo'; uri: string } | { kind: 'code'; code: string }): Promise<void> {
  const payload = item.kind === 'photo' ? await keepPhoto(item.uri) : Code.parse(item.code);
  try { await putQueued({ id: randomUUID(), kind: item.kind, payload, createdAt: new Date().toISOString() }); }
  catch (error) {
    if (item.kind === 'photo') await removePhoto(payload).catch(() => {});
    throw error;
  }
  notifyQueue();
}
export async function openQueuedPhoto(id: string) {
  const item = (await listQueue()).find(row => row.id === id);
  if (!item || item.kind !== 'photo') throw new ApiError('bad_request');
  return openPhoto(item.payload);
}
export async function completeQueued(id: string): Promise<void> {
  const item = (await listQueued()).find(row => row.id === id);
  if (!item) return;
  if (item.kind === 'photo') await removePhoto(item.payload);
  await deleteQueued(id);
  notifyQueue();
}
export async function retryQueued(id: string) {
  if (running) await running;
  await resetQueued(id);
  notifyQueue();
  return flushQueue();
}
let running: Promise<{ resolved: number }> | undefined;
const resolvedListeners = new Set<(id: string) => void>();
export function flushQueue(onResolved?: (id: string) => void): Promise<{ resolved: number }> {
  if (onResolved) resolvedListeners.add(onResolved);
  running ??= drain().finally(() => { running = undefined; resolvedListeners.clear(); notifyQueue(); });
  return running;
}
async function drain() {
  let resolved = 0;
  for (const item of await listQueue()) {
    // Human-review outcomes and failed work stay durable until explicit retry/acknowledgement.
    if (item.status !== 'pending' || (item.error && item.error !== 'offline')) continue;
    let photo: string | undefined;
    if (item.kind === 'photo') {
      try { photo = await readPhoto(item.payload); }
      catch (error) {
        if (error instanceof MissingPhotoError) { await deleteQueued(item.id); notifyQueue('missing_photo'); continue; }
        await saveQueuedError(item.id, 'storage');
        notifyQueue();
        break;
      }
    }
    try {
      const result = photo === undefined ? await api.lookup({ code: item.payload }) : await api.identify(photo);
      if (!(await listQueued()).some(row => row.id === item.id)) continue;
      if (result.status !== 'found') {
        await setQueuedReview(item.id, JSON.stringify(result));
        notifyQueue();
        continue;
      }
      await saveToHistory(result);
      await completeQueued(item.id);
      resolved++;
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
