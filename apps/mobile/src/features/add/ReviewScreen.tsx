import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { StatusPanel } from '../capture/StatusPanel';
import { getAddReviewDraft, getAddReviewDraftKey } from './draftStore';
import { ReviewDraftScreen } from './ReviewDraftScreen';
import { UnknownReviewScreen } from './UnknownReviewScreen';

const useSafeSearchParams = useLocalSearchParams ?? (() => ({}));

export function ReviewScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useSafeSearchParams<Record<string, string | string[] | undefined>>();
  const draft = getAddReviewDraft();
  if (params?.unknownDraftId) return <UnknownReviewScreen />;
  if (draft) return <ReviewDraftScreen key={getAddReviewDraftKey(draft)} activeDraft={draft} />;
  return <View style={[styles.emptyRoot, { backgroundColor: colors.ground }]}>
    <StatusPanel message={ro.errors.generic} actions={[
      { label: ro.review.retakePhotos, onPress: () => router.replace('/add') },
      { label: ro.capture.title, onPress: () => router.replace('/capture') },
    ]} />
  </View>;
}

export default ReviewScreen;
const styles = StyleSheet.create({ emptyRoot: { flex: 1, justifyContent: 'center', padding: 20 } });
