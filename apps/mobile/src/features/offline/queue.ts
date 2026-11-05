import { randomUUID } from 'expo-crypto';
import { z } from 'zod';
import { Code, IdentifyResponse, LookupResponse } from '@okbite/shared';
import { api, ApiError } from '../../lib/api';
import { putQueued, listQueued, deleteQueued, setQueuedReview } from '../history/db';
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
let running: Promise<{ resolved: number }> | undefined;
export function flushQueue(onResolved?: (id: string) => void): Promise<{ resolved: number }> {
  running ??= drain(onResolved).finally(() => { running = undefined; });
  return running;
}
async function drain(onResolved?: (id: string) => void) {
  let resolved = 0;
  // needs_review items already have their answer; sending them again would cost another identify call per sync.
  for (const item of (await listQueued()).filter(row => row.status !== 'needs_review')) {
    let photo: string | undefined;
    if (item.kind === 'photo') {
      // A stored photo that can no longer be read will never resolve; drop it instead of retrying forever.
      try { photo = await readPhoto(item.payload); }
      catch { await deleteQueued(item.id).catch(() => {}); continue; }
    }
    try {
      const result = photo === undefined ? await api.lookup({ code: item.payload }) : await api.identify(photo);
      // Candidates/not_found wait for the user's confirmation or contribution; keep the capture and the answer.
      if (result.status !== 'found') { await setQueuedReview(item.id, JSON.stringify(result)); continue; }
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
const ReviewResult = z.union([LookupResponse, IdentifyResponse]);
export async function listNeedsReview() {
  return (await listQueued()).flatMap(({ id, kind, payload, status, result }) => {
    const parsed = status === 'needs_review' && result ? ReviewResult.safeParse(JSON.parse(result)) : undefined;
    return parsed?.success ? [{ id, kind, payload, result: parsed.data }] : [];
  });
}
export async function resolveQueued(id: string): Promise<void> {
  const item = (await listQueued()).find(row => row.id === id);
  if (!item) return;
  await deleteQueued(id);
  if (item.kind === 'photo') await removePhoto(item.payload).catch(() => {});
}