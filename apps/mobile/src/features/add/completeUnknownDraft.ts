import { LookupResponse } from '@okbite/shared';
import { ApiError } from '../../lib/api';
import { saveToHistory } from '../history/store';
import { saveQueuedConfirmation } from '../history/db';
import { completeQueued } from '../offline/queue';
import { removePhoto } from '../offline/photos';
import { loadUnknownDraft, saveUnknownDraft, clearUnknownDraft, type UnknownDraftSnapshot } from './unknownDraft';

export async function completeUnknownDraft(draft: UnknownDraftSnapshot, raw: unknown): Promise<void> {
  const result = LookupResponse.safeParse(raw);
  if (!result.success || result.data.status !== 'found') throw new ApiError('invalid_response');
  const current = await loadUnknownDraft();
  if (current?.id === draft.id) await saveUnknownDraft({ ...current, savedResult: result.data });
  const receiptId = draft.initial.queueId ?? draft.id;
  await saveQueuedConfirmation(receiptId, JSON.stringify(result.data));
  await saveToHistory(result.data);
  await completeQueued(receiptId);
  await clearUnknownDraft(draft.id);
  // Completion of an older request cannot erase a newer draft's local images.
  const newer = await loadUnknownDraft();
  const protectedIds = new Set(Object.values(newer?.photos ?? {}));
  if (!draft.initial.queueId) for (const id of new Set(Object.values(draft.photos))) {
    if (id && !protectedIds.has(id)) await removePhoto(id).catch(() => {});
  }
}
