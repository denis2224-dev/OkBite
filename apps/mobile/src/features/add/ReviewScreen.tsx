import React, { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
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
} from './draftStore';
import { ReviewForm } from './ReviewForm';
import { resolveQueued } from '../offline/queue';
import { saveToHistory } from '../history/store';

export function ReviewScreen() {
  const router = useRouter();
  const activeDraft = getAddReviewDraft();
  const saved = useRef<Extract<LookupResponse, { status: 'found' }> | null>(null);
  const finishing = useRef(false);
  const [cleanupPending, setCleanupPending] = useState(false);

  const finishSaved = async () => {
    if (!saved.current || !activeDraft || finishing.current) return;
    finishing.current = true;
    try {
      await saveToHistory(saved.current);
      if (activeDraft.initial.queueId) await resolveQueued(activeDraft.initial.queueId);
      const id = saved.current.product.id;
      clearAddReviewDraft();
      router.replace(productRoute(id));
    } finally { finishing.current = false; }
  };

  if (cleanupPending) {
    return <View style={styles.emptyRoot}><StatusPanel message={ro.review.savedPendingCleanup} actions={[
      { label: ro.review.finishSave, onPress: () => { void finishSaved().catch(() => {}); } },
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
    const rawResult = await api.addProduct(req);
    const parsed = LookupResponse.safeParse(rawResult);
    if (!parsed.success || parsed.data.status !== 'found') {
      throw Object.assign(new Error('invalid_response'), { code: 'invalid_response' });
    }
    saved.current = parsed.data;
    try { await finishSaved(); }
    catch { setCleanupPending(true); }
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
