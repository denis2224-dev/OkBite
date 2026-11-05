import { randomUUID } from 'expo-crypto';
import { Code, IdentifyResponse, LookupResponse } from '@okbite/shared';
import { api, ApiError } from '../../lib/api';
import { putQueued, listQueued, deleteQueued, markNeedsReview } from '../history/db';
import { saveToHistory } from '../history/store';
import { keepPhoto, readPhoto, removePhoto } from './photos';

export async function enqueue(item: { kind: 'photo'; uri: string } | { kind: 'code'; code: string }): Promise<void> {
  const payload = item.kind === 'photo' ? await keepPhoto(item.uri) : Code.parse(item.code);
  try { await putQueued({ id: randomUUID(), kind: item.kind, payload, createdAt: new Date().toISOString() }); }
  catch (error) {
    if (item.kind === 'photo') await removePhoto(payload).catch(() => {});
    throw error;
  }
}
export async function listNeedsReview(): Promise<{ id: string; kind: 'photo' | 'code'; payload: string; result: LookupResponse | IdentifyResponse }[]> {
  return (await listQueued()).flatMap(item => {
    if (item.status !== 'needs_review' || item.result === null) return [];
    try {
      const schema = item.kind === 'code' ? LookupResponse : IdentifyResponse;
      return [{ id: item.id, kind: item.kind, payload: item.payload, result: schema.parse(JSON.parse(item.result)) }];
    } catch { return []; }
  });
}
export async function resolveQueued(id: string): Promise<void> {
  const item = (await listQueued()).find(row => row.id === id);
  if (!item) return;
  await deleteQueued(id);
  if (item.kind === 'photo') await removePhoto(item.payload).catch(() => {});
}
let running: Promise<{ resolved: number }> | undefined;
export function flushQueue(onResolved?: (id: string) => void): Promise<{ resolved: number }> {
  running ??= drain(onResolved).finally(() => { running = undefined; });
  return running;
}
async function drain(onResolved?: (id: string) => void) {
  let resolved = 0;
  for (const item of await listQueued()) {
    if (item.status !== 'pending') continue;
    let photo: string | undefined;
    if (item.kind === 'photo') {
      // A stored photo that can no longer be read will never resolve; drop it instead of retrying forever.
      try { photo = await readPhoto(item.payload); }
      catch { await deleteQueued(item.id).catch(() => {}); continue; }
    }
    try {
      const result = photo === undefined ? await api.lookup({ code: item.payload }) : await api.identify(photo);
      // Keep the capture and result for confirmation/contribution without repeating the API call.
      if (result.status !== 'found') {
        await markNeedsReview(item.id, JSON.stringify(result));
        continue;
      }
      await saveToHistory(result);
      await deleteQueued(item.id);
      if (item.kind === 'photo') await removePhoto(item.payload).catch(() => {});
      resolved++;
      onResolved?.(result.product.id);
    } catch (error) {
      if (error instanceof ApiError && (error.code === 'offline' || error.code === 'rate_limited' || error.code === 'configuration')) break;
    }
  }
  return { resolved };
}
