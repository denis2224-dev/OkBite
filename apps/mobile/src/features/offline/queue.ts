import { randomUUID } from 'expo-crypto';
import { Code } from '@okbite/shared';
import { api, ApiError } from '../../lib/api';
import { putQueued, listQueued, deleteQueued } from '../history/db';
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
  for (const item of await listQueued()) {
    let photo: string | undefined;
    if (item.kind === 'photo') {
      // A stored photo that can no longer be read will never resolve; drop it instead of retrying forever.
      try { photo = await readPhoto(item.payload); }
      catch { await deleteQueued(item.id).catch(() => {}); continue; }
    }
    try {
      const result = photo === undefined ? await api.lookup({ code: item.payload }) : await api.identify(photo);
      // R5 resumes confirmation/contribution for candidates and not_found; retain their capture until then.
      if (result.status !== 'found') continue;
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

export type ResumeResult =
  | { kind: 'found'; productId: string }
  | { kind: 'identify'; pathname: string; params: Record<string, string> };

/**
 * Resumes confirmation or contribution for an unresolved queued item.
 * - If product is found on retry, saves to history, cleans up queue/photo, returns found productId.
 * - If candidates or not_found, removes from queue (preventing duplicate queue runs) and returns navigation route.
 */
export async function resumeQueuedItem(item: { id: string; kind: 'photo' | 'code'; payload: string }): Promise<ResumeResult> {
  if (item.kind === 'code') {
    const result = await api.lookup({ code: item.payload });
    await deleteQueued(item.id);
    if (result.status === 'found') {
      await saveToHistory(result);
      return { kind: 'found', productId: result.product.id };
    }
    return {
      kind: 'identify',
      pathname: '/identify',
      params: { source: 'code', code: item.payload },
    };
  } else {
    let photoBase64: string;
    try {
      photoBase64 = await readPhoto(item.payload);
    } catch {
      await deleteQueued(item.id).catch(() => {});
      throw new Error('Photo not available');
    }
    const result = await api.identify(photoBase64);
    await deleteQueued(item.id);
    if (result.status === 'found') {
      await saveToHistory(result);
      await removePhoto(item.payload).catch(() => {});
      return { kind: 'found', productId: result.product.id };
    }
    return {
      kind: 'identify',
      pathname: '/identify',
      params: { source: 'photo', payload: JSON.stringify(result) },
    };
  }
}

export async function listUnresolvedQueued() {
  return listQueued();
}

