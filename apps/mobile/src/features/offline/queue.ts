import { randomUUID } from 'expo-crypto';
import { z } from 'zod';
import { Code, IdentifyResponse, LookupResponse } from '@okbite/shared';
import { api, ApiError } from '../../lib/api';
import { putQueued, listQueued, deleteQueued, saveQueuedState, type QueuedItem } from '../history/db';
import { saveToHistory } from '../history/store';
import { keepPhoto, readPhoto, removePhoto, openPhoto } from './photos';
import { MissingPhotoError } from './photo_errors';
import { notifyQueue } from './events';
export { subscribeQueue } from './events';

const Outcome = z.union([IdentifyResponse, LookupResponse]).refine(result => result.status !== 'found');
const State = z.object({ outcome: Outcome.optional(), error: z.string().optional() });
type Review = Exclude<IdentifyResponse | LookupResponse, { status: 'found' }>;
export type QueueEntry = Omit<QueuedItem, 'state'> & { outcome?: Review; error?: string };
export async function listQueue(): Promise<QueueEntry[]> {
  return (await listQueued()).map(({ state, ...item }) => {
    try {
      const parsed = State.parse(state ? JSON.parse(state) : {});
      return { ...item, ...parsed, outcome: parsed.outcome as Review | undefined };
    } catch { return { ...item, error: 'invalid_response' }; }
  });
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
  await saveQueuedState(id, null);
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
    if (item.outcome || (item.error && item.error !== 'offline')) continue;
    let photo: string | undefined;
    if (item.kind === 'photo') {
      try { photo = await readPhoto(item.payload); }
      catch (error) {
        if (error instanceof MissingPhotoError) { await deleteQueued(item.id); notifyQueue('missing_photo'); continue; }
        await saveQueuedState(item.id, JSON.stringify({ error: 'storage' }));
        notifyQueue();
        break;
      }
    }
    try {
      const result = photo === undefined ? await api.lookup({ code: item.payload }) : await api.identify(photo);
      if (!(await listQueued()).some(row => row.id === item.id)) continue;
      if (result.status !== 'found') {
        await saveQueuedState(item.id, JSON.stringify({ outcome: result }));
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
      await saveQueuedState(item.id, JSON.stringify({ error: code }));
      notifyQueue();
      if (code === 'offline' || code === 'rate_limited' || code === 'configuration' || code === 'storage') break;
    }
  }
  return { resolved };
}
