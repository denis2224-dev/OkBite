import React, { useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  LookupResponse,
  type AddProductRequest,
} from '@okbite/shared';
import { ro } from '../../copy/ro';
import type { Palette } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { api } from '../../lib/api';
import { StatusPanel } from '../capture/StatusPanel';
import { addProductRoute, productRoute, type AddInitialValues } from '../identify/routes';
import { resolveQueued } from '../offline/queue';
import {
  clearAddReviewDraft,
  getAddReviewDraft,
  getAvailableCategories,
  setAddReviewDraft,
} from './draftStore';
import { ReviewForm } from './ReviewForm';

export function ReviewScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const activeDraft = getAddReviewDraft();
  const [savedProductId, setSavedProductId] = useState(activeDraft?.savedProductId);
  const [completionFailed, setCompletionFailed] = useState(Boolean(savedProductId));
  const finishing = useRef(false);

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

  const finish = async (id: string) => {
    if (finishing.current) return;
    finishing.current = true;
    setCompletionFailed(false);
    try {
      if (activeDraft.initial.queuedId) await resolveQueued(activeDraft.initial.queuedId, id);
      router.replace(productRoute(id));
      clearAddReviewDraft();
    } catch {
      setCompletionFailed(true);
    } finally {
      finishing.current = false;
    }
  };

  const handleSubmit = async (req: AddProductRequest) => {
    const rawResult = await api.addProduct(req);
    const parsed = LookupResponse.safeParse(rawResult);
    if (!parsed.success || parsed.data.status !== 'found') {
      throw Object.assign(new Error('invalid_response'), { code: 'invalid_response' });
    }
    const id = parsed.data.product.id;
    setAddReviewDraft({ ...activeDraft, savedProductId: id });
    setSavedProductId(id);
    await finish(id);
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
        queuedId: currentIdentity.queuedId,
      }),
    );
  };

  if (savedProductId) return <View style={styles.emptyRoot}>
    <StatusPanel
      message={completionFailed ? ro.offline.queueError : ro.app.loading}
      actions={completionFailed ? [{ label: ro.app.retry, onPress: () => { void finish(savedProductId); } }] : []}
    />
  </View>;

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

const makeStyles = (colors: Palette) => StyleSheet.create({
  emptyRoot: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: colors.ground },
});
