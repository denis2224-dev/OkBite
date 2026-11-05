import { randomUUID } from 'expo-crypto';
import { Code, type IdentifyResponse, type LookupResponse } from '@okbite/shared';
import { api, ApiError } from '../../lib/api';
import { putQueued, listQueued, deleteQueued, type QueuedItem } from '../history/db';
import { saveToHistory } from '../history/store';
import { keepPhoto, readPhoto, removePhoto } from './photos';

export type QueueResult = { item: QueuedItem; result: LookupResponse | IdentifyResponse };
const listeners = new Set<(event: QueueResult) => boolean>();
export function subscribeQueueResults(listener: (event: QueueResult) => boolean): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
function handoff(event: QueueResult): boolean {
  for (const listener of listeners) if (listener(event)) return true;
  return false;
}

export async function enqueue(item: { kind: 'photo'; uri: string } | { kind: 'code'; code: string }): Promise<void> {
  const payload = item.kind === 'photo' ? await keepPhoto(item.uri) : Code.parse(item.code);
  try { await putQueued({ id: randomUUID(), kind: item.kind, payload, createdAt: new Date().toISOString() }); }
  catch (error) {
    if (item.kind === 'photo') await removePhoto(payload).catch(() => {});
    throw error;
  }
}
let running: Promise<{ resolved: number }> | undefined;
export function flushQueue(onResolved?: (id: string) => void): Promise<{ resolved: number }> {
  running ??= drain(onResolved).finally(() => { running = undefined; });
  return running;
}
async function drain(onResolved?: (id: string) => void) {
  let resolved = 0;
  for (const item of await listQueued()) {
    let photo: string | undefined;
    if (item.kind === 'photo') {
      // A stored photo that can no longer be read will never resolve; drop it instead of retrying forever.
      try { photo = await readPhoto(item.payload); }
      catch { await deleteQueued(item.id).catch(() => {}); continue; }
    }
    try {
      const result = photo === undefined ? await api.lookup({ code: item.payload }) : await api.identify(photo);
      // Unknown products stay durable until a visible screen accepts their complete response.
      const accepted = result.status !== 'found' && handoff({ item, result });
      if (result.status !== 'found' && !accepted) continue;
      if (result.status === 'found') await saveToHistory(result);
      await deleteQueued(item.id);
      if (item.kind === 'photo') await removePhoto(item.payload).catch(() => {});
      resolved++;
      if (result.status === 'found') {
        onResolved?.(result.product.id);
        if (handoff({ item, result })) break;
      }
      if (accepted) break;
    } catch (error) {
      if (error instanceof ApiError && (error.code === 'offline' || error.code === 'rate_limited' || error.code === 'configuration')) break;
    }
  }
  return { resolved };
}
