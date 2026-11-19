import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LookupResponse, type AddProductRequest, type WaterProfile } from '@okbite/shared';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { compressPhoto } from '../capture/compressPhoto';
import { StatusPanel } from '../capture/StatusPanel';
import { useScreenActivity } from '../capture/useScreenActivity';
import { openPhoto } from '../offline/photos';
import { productRoute, type AddInitialValues } from '../identify/routes';
import { completeUnknownDraft } from './completeUnknownDraft';
import { getAvailableCategories, initializeAvailableCategories } from './draftStore';
import { ReviewForm } from './ReviewForm';
import { loadUnknownDraft, saveUnknownDraftIfCurrent, type UnknownDraftSnapshot } from './unknownDraft';
import { GuidedReadLabelRequest, GuidedReadLabelResponse, UnknownAddProductRequest } from './unknownFlowContract';
import { requestUnknownFlow } from './unknownFlowTransport';
import { reconcileLabelReasons } from './labelWarnings';
import { UnknownProductConfirmation, type UnknownPhotoKind, type UnknownProductProposal } from './UnknownProductConfirmation';

const useSafeSearchParams = useLocalSearchParams ?? (() => ({}));

export function UnknownReviewScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const activity = useScreenActivity();
  const rawParams = useSafeSearchParams<Record<string, string | string[] | undefined>>();

  const [draft, setDraft] = useState<UnknownDraftSnapshot | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [manual, setManual] = useState(() => rawParams.manual === '1');

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
        ...(proposal.name !== (draft.initial.name ?? '') || proposal.quantity !== (draft.initial.quantity ?? '')
          ? { identityConfirmed: true as const } : {}),
        name: proposal.name || null,
        brand: proposal.brand || null,
        quantity: proposal.quantity || null,
        ...(proposal.categorySlug ? { categorySlug: proposal.categorySlug } : {}),
      },
      label: reconcileLabelReasons({
        ...draft.label!,
        ingredientsText: proposal.ingredientsText,
        unit: proposal.unit,
        nutrients: proposal.nutrients,
        water: proposal.water ?? null,
      }),
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
    const updated: UnknownDraftSnapshot = { ...draft, initial: { ...draft.initial, ...identity, identityConfirmed: true } };
    if (!await saveUnknownDraftIfCurrent(updated)) throw new Error('stale_draft');
    if (!activity.isCurrent(token)) return;
    setDraft(updated);
    handleRetake('ingredients');
  };

  const handleReadWaterFromPhoto = async (): Promise<WaterProfile | null> => {
    if (!draft.photos.ingredients || !draft.label) return null;
    const token = activity.start();
    const photoHandle = await openPhoto(draft.photos.ingredients);
    let compressedBase64: string;
    try {
      const prepared = await compressPhoto(photoHandle.uri, 1_450_000);
      compressedBase64 = prepared.base64;
    } finally {
      photoHandle.release();
    }
    const read = await requestUnknownFlow(
      'read-label',
      GuidedReadLabelRequest,
      GuidedReadLabelResponse,
      {
        ingredientsImage: compressedBase64,
        nutritionImage: null,
        nutrition: 'same_photo',
        kind: 'water',
      },
    );
    if (!activity.isCurrent(token)) return null;
    const updated: UnknownDraftSnapshot = {
      ...draft,
      initial: { ...draft.initial, isWater: true, categorySlug: 'apa' },
      label: {
        ...draft.label,
        ingredientsText: draft.label.ingredientsText ?? read.ingredientsText,
        unit: 'ml',
        water: read.water ?? null,
      },
    };
    setDraft(updated);
    await saveUnknownDraftIfCurrent(updated).catch(() => {});
    return read.water ?? null;
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
      onReadWaterFromPhoto={draft.photos.ingredients ? handleReadWaterFromPhoto : undefined}
    />
  );
}
export default UnknownReviewScreen;
