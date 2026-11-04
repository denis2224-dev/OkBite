import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  LookupResponse,
  type AddProductRequest,
  type Category,
} from '@okbite/shared';
import { ro } from '../../copy/ro';
import { api } from '../../lib/api';
import { StatusPanel } from '../capture/StatusPanel';
import { productRoute } from '../identify/routes';
import { clearAddReviewDraft, getAddReviewDraft, type AddReviewDraft } from './draftStore';
import { ReviewForm } from './ReviewForm';

export interface ReviewScreenProps {
  draft?: AddReviewDraft | null;
  categories?: readonly Category[];
}

export function ReviewScreen({ draft: propDraft, categories: propCategories }: ReviewScreenProps = {}) {
  const router = useRouter();
  const activeDraft = propDraft !== undefined ? propDraft : getAddReviewDraft();

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

  const categories = propCategories ?? activeDraft.categories ?? [];

  const handleSubmit = async (req: AddProductRequest) => {
    const rawResult = await api.addProduct(req);
    const parsed = LookupResponse.safeParse(rawResult);
    if (!parsed.success || parsed.data.status !== 'found') {
      throw Object.assign(new Error('invalid_response'), { code: 'invalid_response' });
    }
    clearAddReviewDraft();
    router.replace(productRoute(parsed.data.product.id));
  };

  const handleRetake = () => {
    clearAddReviewDraft();
    router.replace('/add');
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

