import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { Screen } from '../../ui/Screen';
import { StatusPanel, errorMessage } from '../capture/StatusPanel';
import { addProductRoute, parseAddParams } from '../identify/routes';
import { GuidedNutritionQuestion } from './GuidedNutritionQuestion';
import { GuidedPhotoCapture } from './GuidedPhotoCapture';
import { useGuidedAddSession } from './useGuidedAddSession';

const useSafeSearchParams = useLocalSearchParams ?? (() => ({}));

export function GuidedAddScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const rawParams = useSafeSearchParams<Record<string, string | string[] | undefined>>();
  const parsed = parseAddParams(rawParams);
  const frontPhotoId = typeof rawParams.frontPhotoId === 'string' && rawParams.frontPhotoId.trim() ? rawParams.frontPhotoId.trim() : undefined;
  const retakeParam = rawParams.retake;
  const retakeKind = retakeParam === 'front' || retakeParam === 'ingredients' || retakeParam === 'nutrition' ? retakeParam : undefined;
  const { state, controller, draftId, error, restoredFromDraft, draftConflict, discardError, resumeDraft, discardDraft } = useGuidedAddSession(
    {
      ...parsed,
      ...(frontPhotoId ? { frontPhotoId } : {}),
    },
    retakeKind,
  );
  const openManualFallback = () => {
    const currentInitial = state?.initial ?? parsed;
    router.replace(
      addProductRoute({
        read: {
          code: currentInitial.code,
          brand: currentInitial.brand,
          name: currentInitial.name,
          quantity: currentInitial.quantity,
        },
        photoPath: currentInitial.photoPath,
        queueId: currentInitial.queueId,
        flow: 'manual',
      }),
    );
  };

  if (error) {
    return (
      <Screen title={ro.add.frontTitle}>
        <StatusPanel message={ro.add.draftSaveFailed} actions={[]} />
      </Screen>
    );
  }

  if (!state || !controller) {
    return (
      <Screen title={ro.add.frontTitle}>
        <ActivityIndicator size="large" color={colors.accent} />
      </Screen>
    );
  }

  if (draftConflict) {
    return <Screen title={ro.add.frontTitle}>
      <Text style={{ color: colors.ink, fontSize: 16 }}>{state.initial.name}</Text>
      {discardError ? <Text accessibilityRole="alert" style={{ color: colors.ink }}>{ro.add.draftSaveFailed}</Text> : null}
      <StatusPanel message={ro.add.draftRestored} actions={[
        { label: ro.add.resumeDraft, onPress: resumeDraft },
        { label: ro.add.discardDraft, onPress: () => void discardDraft() },
      ]} />
    </Screen>;
  }

  if (state.stage === 'review') {
    return <Screen title={ro.add.confirmTitle}>
      <StatusPanel message={ro.add.draftRestored} actions={[
        { label: ro.add.confirmTitle, onPress: () => router.replace({ pathname: '/add/review', params: { unknownDraftId: draftId } }) },
      ]} />
    </Screen>;
  }

  const stageTitle =
    state.stage === 'front'
      ? ro.add.frontTitle
      : state.stage === 'nutrition'
        ? ro.add.nutritionTitle
        : ro.add.ingredientsTitle;
  const stageHint =
    state.stage === 'front'
      ? ro.add.frontHint
      : state.stage === 'nutrition'
        ? ro.add.nutritionHint
        : ro.add.ingredientsHint;

  const totalSteps = parsed.photoPath ? 3 : 4;
  const stepNumber =
    state.stage === 'front'
      ? 1
      : state.stage === 'ingredients'
        ? parsed.photoPath
          ? 1
          : 2
        : parsed.photoPath
          ? 2
          : 3;

  return (
    <Screen title={stageTitle}>
      <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '700' }}>{ro.add.stepOf(stepNumber, totalSteps)}</Text>
      {restoredFromDraft ? <Text style={{ color: colors.muted, fontSize: 14 }}>{ro.add.draftRestored}</Text> : null}
      {discardError ? <Text accessibilityRole="alert" style={{ color: colors.ink }}>{ro.add.draftSaveFailed}</Text> : null}

      {state.stage === 'front' || state.stage === 'ingredients' || state.stage === 'nutrition' ? (
        <View style={{ gap: 12 }}>
          <Text style={{ color: colors.muted, fontSize: 14 }}>{stageHint}</Text>
          <GuidedPhotoCapture onCapture={uri => controller.capturePhoto(uri)} />
        </View>
      ) : null}

      {state.stage === 'nutrition_question' ? (
        <GuidedNutritionQuestion onChoose={mode => void controller.chooseNutrition(mode)} />
      ) : null}

      {state.stage === 'nutrition_unreadable' ? (
        <StatusPanel
          message={ro.add.nutritionUnreadable}
          actions={[
            { label: ro.add.retakePhoto, onPress: () => controller.retake('nutrition') },
            { label: ro.add.continueIngredients, onPress: () => void controller.continueIngredientsOnly() },
          ]}
        />
      ) : null}

      {state.stage === 'working' ? (
        <View style={{ alignItems: 'center', gap: 12, paddingVertical: 24 }}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={{ color: colors.ink, fontSize: 16 }}>
            {state.remotePhotoPath ? ro.add.reading : ro.add.readingFront}
          </Text>
        </View>
      ) : null}

      {state.stage === 'interrupted' || state.stage === 'error' ? (
        <StatusPanel
          message={state.stage === 'interrupted' ? ro.add.draftInterrupted : errorMessage(state.error)}
          actions={[
            { label: ro.add.retryRead, onPress: () => void controller.retry() },
            { label: ro.add.manualEntry, onPress: openManualFallback },
            { label: ro.add.discardDraft, onPress: () => void discardDraft() },
          ]}
        />
      ) : null}
    </Screen>
  );
}

export default GuidedAddScreen;
