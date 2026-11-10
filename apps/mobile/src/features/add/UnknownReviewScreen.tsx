import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LookupResponse, type AddProductRequest } from '@okbite/shared';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { StatusPanel } from '../capture/StatusPanel';
import { useScreenActivity } from '../capture/useScreenActivity';
import { productRoute, type AddInitialValues } from '../identify/routes';
import { completeUnknownDraft } from './completeUnknownDraft';
import { getAvailableCategories, initializeAvailableCategories } from './draftStore';
import { ReviewForm } from './ReviewForm';
import { loadUnknownDraft, saveUnknownDraftIfCurrent, type UnknownDraftSnapshot } from './unknownDraft';
import { UnknownAddProductRequest } from './unknownFlowContract';
import { requestUnknownFlow } from './unknownFlowTransport';
import { UnknownProductConfirmation, type UnknownPhotoKind, type UnknownProductProposal } from './UnknownProductConfirmation';

const useSafeSearchParams = useLocalSearchParams ?? (() => ({}));

export function UnknownReviewScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const activity = useScreenActivity();
  const rawParams = useSafeSearchParams<Record<string, string | string[] | undefined>>();

  const [draft, setDraft] = useState<UnknownDraftSnapshot | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [manual, setManual] = useState(false);

  useEffect(() => {
    let active = true;
    if (getAvailableCategories().length === 0) initializeAvailableCategories();
    void loadUnknownDraft()
      .then(stored => {
        if (!active) return;
        setDraft(stored);
        setLoaded(true);
      })
      .catch(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [rawParams.unknownDraftId]);

  if (!loaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.ground }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!draft || !draft.label) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 20, backgroundColor: colors.ground }}>
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

  const handleChange = (proposal: UnknownProductProposal) => {
    const updated: UnknownDraftSnapshot = {
      ...draft,
      initial: {
        ...draft.initial,
        name: proposal.name || null,
        brand: proposal.brand || null,
        quantity: proposal.quantity || null,
        ...(proposal.categorySlug ? { categorySlug: proposal.categorySlug } : {}),
      },
      label: {
        ...draft.label!,
        ingredientsText: proposal.ingredientsText,
        unit: proposal.unit,
        nutrients: proposal.nutrients,
      },
    };
    setDraft(updated);
    void saveUnknownDraftIfCurrent(updated).catch(() => {});
  };

  const handleConfirm = async (proposal: UnknownProductProposal | AddProductRequest) => {
    const token = activity.start();
    const response = draft.savedResult ?? await requestUnknownFlow('add-product', UnknownAddProductRequest, LookupResponse, proposal);
    await completeUnknownDraft(draft, response);
    if (response.status === 'found' && activity.isCurrent(token)) {
      router.replace(productRoute(response.product.id));
    }
  };

  const handleRetake = (kind: UnknownPhotoKind) => {
    activity.leave();
    router.replace({
      pathname: '/add',
      params: { unknownDraftId: draft.id, retake: kind },
    });
  };

  const handleManualRetake = async (identity: AddInitialValues) => {
    const token = activity.start();
    const updated = { ...draft, initial: { ...draft.initial, ...identity } };
    if (!await saveUnknownDraftIfCurrent(updated)) throw new Error('stale_draft');
    if (!activity.isCurrent(token)) return;
    setDraft(updated);
    handleRetake('ingredients');
  };

  if (manual) {
    return (
      <ReviewForm
        label={draft.label}
        initial={draft.initial}
        categories={categories}
        onSubmit={handleConfirm}
        onRetake={handleManualRetake}
      />
    );
  }

  return (
    <UnknownProductConfirmation
      initial={draft.initial}
      label={draft.label as UnknownDraftSnapshot['label'] & { reasons?: Record<string, string> | null }}
      photos={draft.photos}
      categories={categories}
      onChange={handleChange}
      onConfirm={handleConfirm}
      onRetake={handleRetake}
      onManual={() => setManual(true)}
    />
  );
}
export default UnknownReviewScreen;
