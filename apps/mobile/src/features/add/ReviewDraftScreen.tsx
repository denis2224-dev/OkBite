import React, { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import {
  LookupResponse,
  type AddProductRequest,
} from '@okbite/shared';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { api } from '../../lib/api';
import { StatusPanel } from '../capture/StatusPanel';
import { useScreenActivity } from '../capture/useScreenActivity';
import { addProductRoute, productRoute, type AddInitialValues } from '../identify/routes';
import {
  clearAddReviewDraft,
  getAddReviewDraft,
  getAvailableCategories,
  setAddReviewDraftResult,
  type AddReviewDraft,
} from './draftStore';
import { ReviewForm } from './ReviewForm';
import { completeQueued } from '../offline/queue';
import { saveQueuedConfirmation } from '../history/db';
import { saveToHistory } from '../history/store';

export function ReviewDraftScreen({ activeDraft }: { activeDraft: AddReviewDraft }) {
  const { colors } = useTheme();
  const activity = useScreenActivity();
  const router = useRouter();
  const saved = useRef<Extract<LookupResponse, { status: 'found' }> | null>(activeDraft?.savedResult ?? null);
  const finishing = useRef(false);
  const [cleanupPending, setCleanupPending] = useState(Boolean(activeDraft?.savedResult));

  const finishSaved = async (
    targetDraft: AddReviewDraft = activeDraft,
    committedData?: Extract<LookupResponse, { status: 'found' }>,
    token = activity.start(),
  ) => {
    const committed = committedData ?? saved.current ?? targetDraft?.savedResult;
    if (!committed || !targetDraft || finishing.current) return;
    finishing.current = true;
    try {
      const queueId = targetDraft.initial.queueId ?? (targetDraft.completionId ??= randomUUID());
      // New receipts own metadata only; upserts preserve any existing queue photo.
      await saveQueuedConfirmation(queueId, JSON.stringify(committed));
      await saveToHistory(committed);
      await completeQueued(queueId);
      const id = committed.product.id;
      if (getAddReviewDraft() === targetDraft) {
        clearAddReviewDraft();
        if (activity.isCurrent(token)) router.replace(productRoute(id));
      }
    } finally { finishing.current = false; }
  };

  if (cleanupPending) {
    return <View style={[styles.emptyRoot, { backgroundColor: colors.ground }]}><StatusPanel message={ro.review.savedPendingCleanup} actions={[
      { label: ro.review.finishSave, onPress: () => { void finishSaved().catch(() => {}); } },
    ]} /></View>;
  }

  const categories = getAvailableCategories();

  const handleSubmit = async (req: AddProductRequest) => {
    const token = activity.start();
    const initiatingDraft = activeDraft;
    if (getAddReviewDraft() !== initiatingDraft || initiatingDraft.savedResult) return;
    const rawResult = await api.addProduct(req);
    const parsed = LookupResponse.safeParse(rawResult);
    if (!parsed.success || parsed.data.status !== 'found') {
      throw Object.assign(new Error('invalid_response'), { code: 'invalid_response' });
    }
    saved.current = parsed.data;
    setAddReviewDraftResult(parsed.data, initiatingDraft);
    try { await finishSaved(initiatingDraft, parsed.data, token); }
    catch {
      if (getAddReviewDraft() === initiatingDraft && activity.isCurrent(token)) {
        setCleanupPending(true);
      }
    }
  };

  const handleRetake = (currentIdentity: AddInitialValues) => {
    if (getAddReviewDraft() !== activeDraft) return;
    activity.leave();
    clearAddReviewDraft();
    router.replace(
      addProductRoute({
        read: {
          code: currentIdentity.code,
          brand: currentIdentity.brand,
          name: currentIdentity.name,
          quantity: currentIdentity.quantity,
        },
        photoPath: currentIdentity.photoPath,
        queueId: currentIdentity.queueId,
      }),
    );
  };

  return (
    <ReviewForm
      label={activeDraft.label}
      initial={activeDraft.initial}
      categories={categories}
      onSubmit={handleSubmit}
      onRetake={handleRetake}
    />
  );
}

const styles = StyleSheet.create({
  emptyRoot: { flex: 1, justifyContent: 'center', padding: 20 },
});
