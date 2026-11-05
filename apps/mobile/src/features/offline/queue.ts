import { randomUUID } from 'expo-crypto';
import { Code, IdentifyResponse, LookupResponse } from '@okbite/shared';
import { api, ApiError } from '../../lib/api';
import { putQueued, listQueued, deleteQueued, markNeedsReview, type QueuedItem } from '../history/db';
import { saveToHistory } from '../history/store';
import { keepPhoto, readPhoto, removePhoto } from './photos';
import { MissingPhotoError } from './photoErrors';
import { withQueueLock } from './queueLock';

export type QueueResult = { item: Pick<QueuedItem, 'id' | 'kind' | 'payload'>; result: LookupResponse | IdentifyResponse };
const listeners = new Set<(event: QueueResult) => boolean>();
export function subscribeQueueResults(listener: (event: QueueResult) => boolean): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
function handoff(event: QueueResult): boolean {
  for (const listener of listeners) if (listener(event)) return true;
  return false;
}
function reviewResult(item: QueuedItem): LookupResponse | IdentifyResponse | undefined {
  if (item.status !== 'needs_review' || item.result === null) return;
  try {
    return (item.kind === 'code' ? LookupResponse : IdentifyResponse).parse(JSON.parse(item.result));
  } catch { return; }
}

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
    const result = reviewResult(item);
    return result ? [{ id: item.id, kind: item.kind, payload: item.payload, result }] : [];
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
  running ??= withQueueLock(() => drain(onResolved)).finally(() => { running = undefined; });
  return running;
}
async function drain(onResolved?: (id: string) => void) {
  let resolved = 0;
  const items = await listQueued();
  // Saved decisions remain accessible even when earlier network work cannot run.
  for (const item of items) {
    const result = reviewResult(item);
    if (result) handoff({ item, result });
  }
  for (const item of items) {
    if (item.status !== 'pending') continue;
    let photo: string | undefined;
    if (item.kind === 'photo') {
      // A stored photo that can no longer be read will never resolve; drop it instead of retrying forever.
      try { photo = await readPhoto(item.payload); }
      catch (error) {
        if (!(error instanceof MissingPhotoError)) break;
        await deleteQueued(item.id).catch(() => {});
        continue;
      }
    }
    try {
      const result = photo === undefined ? await api.lookup({ code: item.payload }) : await api.identify(photo);
      // Keep the capture and result for confirmation/contribution without repeating the API call.
      if (result.status !== 'found') {
        await markNeedsReview(item.id, JSON.stringify(result));
        handoff({ item, result });
        continue;
      }
      await saveToHistory(result);
      await deleteQueued(item.id);
      if (item.kind === 'photo') await removePhoto(item.payload).catch(() => {});
      resolved++;
      if (result.status === 'found') {
        onResolved?.(result.product.id);
        handoff({ item, result });
      }
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

