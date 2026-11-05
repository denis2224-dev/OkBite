import React, { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import {
  LookupResponse,
  type AddProductRequest,
} from '@okbite/shared';
import { ro } from '../../copy/ro';
import { api } from '../../lib/api';
import { StatusPanel } from '../capture/StatusPanel';
import { addProductRoute, productRoute, type AddInitialValues } from '../identify/routes';
import {
  clearAddReviewDraft,
  getAddReviewDraft,
  getAvailableCategories,
  setAddReviewDraftResult,
  type AddReviewDraft,
} from './draftStore';
import { ReviewForm } from './ReviewForm';
import { resolveQueued } from '../offline/queue';
import { saveQueuedConfirmation } from '../history/db';
import { saveToHistory } from '../history/store';

export function ReviewScreen() {
  const router = useRouter();
  const activeDraft = getAddReviewDraft();
  const saved = useRef<Extract<LookupResponse, { status: 'found' }> | null>(activeDraft?.savedResult ?? null);
  const finishing = useRef(false);
  const [cleanupPending, setCleanupPending] = useState(Boolean(activeDraft?.savedResult));

  const finishSaved = async (
    targetDraft: AddReviewDraft = activeDraft!,
    committedData?: Extract<LookupResponse, { status: 'found' }>,
  ) => {
    const committed = committedData ?? saved.current ?? targetDraft?.savedResult;
    if (!committed || !targetDraft || finishing.current) return;
    finishing.current = true;
    try {
      const queueId = targetDraft.initial.queueId ?? randomUUID();
      if (typeof saveQueuedConfirmation === 'function') {
        await saveQueuedConfirmation(queueId, JSON.stringify(committed), targetDraft.initial.code ?? queueId, targetDraft.label ? 'photo' : 'code');
      }
      await saveToHistory(committed);
      await resolveQueued(queueId);
      const id = committed.product.id;
      if (getAddReviewDraft() === targetDraft) {
        clearAddReviewDraft();
        router.replace(productRoute(id));
      }
    } finally { finishing.current = false; }
  };

  if (cleanupPending) {
    return <View style={styles.emptyRoot}><StatusPanel message={ro.review.savedPendingCleanup} actions={[
      { label: ro.review.finishSave, onPress: () => { void finishSaved().catch(() => { setCleanupPending(true); }); } },
    ]} /></View>;
  }

  if (!activeDraft) {
    return (
      <View style={styles.emptyRoot}>
        <StatusPanel
          message={ro.errors.generic}
          actions={[
            { label: ro.review.retakePhotos, onPress: () => router.replace('/add') },
            { label: ro.capture.title, onPress: () => router.replace('/capture') },
          ]}
        />
      </View>
    );
  }

  const categories = getAvailableCategories();

  const handleSubmit = async (req: AddProductRequest) => {
    const initiatingDraft = activeDraft;
    if (!initiatingDraft) return;
    const rawResult = await api.addProduct(req);
    const parsed = LookupResponse.safeParse(rawResult);
    if (!parsed.success || parsed.data.status !== 'found') {
      throw Object.assign(new Error('invalid_response'), { code: 'invalid_response' });
    }
    saved.current = parsed.data;
    setAddReviewDraftResult(parsed.data, initiatingDraft);
    try { await finishSaved(initiatingDraft, parsed.data); }
    catch {
      if (getAddReviewDraft() === initiatingDraft) {
        setCleanupPending(true);
      }
    }
  };

  const handleRetake = (currentIdentity: AddInitialValues) => {
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

export default ReviewScreen;

const styles = StyleSheet.create({
  emptyRoot: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#F6F1E6' },
});
