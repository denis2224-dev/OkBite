import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ro } from '../../copy/ro';
import { spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Card } from '../../ui/Card';
import { Screen } from '../../ui/Screen';
import { Body } from '../../ui/Typography';
import { StatusPanel, errorMessage } from '../capture/StatusPanel';
import { addProductRoute, parseAddParams } from '../identify/routes';
import { GuidedAddProgress } from './GuidedAddProgress';
import { GuidedIdentityForm } from './GuidedIdentityForm';
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
  const { state, controller, draftId, error, restoredFromDraft, draftConflict, discardError, frontPending, resumeDraft, discardDraft } = useGuidedAddSession(
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

  if (state.stage === 'identity') {
    return <Screen title={ro.identify.addButton}>
      <GuidedIdentityForm onConfirm={controller.confirmIdentity} />
    </Screen>;
  }

  if (state.stage === 'label_failed') {
    return <Screen title={ro.review.title}>
      <StatusPanel message={ro.add.processingFailed} actions={[
        { label: ro.add.retryRead, onPress: () => void controller.retry() },
        { label: ro.add.manualEntry, onPress: () => void controller.enterLabelManually() },
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

  const isWorking = state.stage === 'working';
  const isFront = state.stage === 'front' || (isWorking && !state.remotePhotoPath);
  const isNutrition = state.stage === 'nutrition' || state.stage === 'nutrition_unreadable';
  const stageTitle =
    isFront
      ? ro.add.frontTitle
      : isNutrition
        ? ro.add.nutritionTitle
        : ro.add.ingredientsTitle;
  const stageHint =
    isFront
      ? ro.add.frontHint
      : isNutrition
        ? ro.add.nutritionHint
        : ro.add.ingredientsHint;

  const totalSteps = parsed.photoPath ? 3 : 4;
  const ingredientsStep = totalSteps - 2;
  const readingLabel = isWorking && state.remotePhotoPath && state.photos.ingredients && state.nutritionMode;
  const stepNumber =
    isFront
      ? 1
      : readingLabel
        ? totalSteps
        : state.stage === 'ingredients' || isWorking
          ? ingredientsStep
          : totalSteps - 1;

  return (
    <Screen title={stageTitle}>
      <GuidedAddProgress step={stepNumber} total={totalSteps} />
      {restoredFromDraft ? <Text style={{ color: colors.muted, fontSize: 14 }}>{ro.add.draftRestored}</Text> : null}
      {discardError ? <Text accessibilityRole="alert" style={{ color: colors.ink }}>{ro.add.draftSaveFailed}</Text> : null}

      {state.stage === 'front' || state.stage === 'ingredients' || state.stage === 'nutrition' ? (
        <View style={{ gap: spacing.md }}>
          <Body style={{ color: colors.muted }}>{stageHint}</Body>
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

      {isWorking ? (
        frontPending === 'waiting' ? (
          <StatusPanel title={ro.pwa.analysis.title} message={ro.pwa.analysis.unknown} actions={[]} />
        ) : (
          <Card style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
            <ActivityIndicator size="large" color={colors.primary} aria-hidden />
            <Body role="status" accessibilityLiveRegion="polite" style={{ textAlign: 'center' }}>
              {state.remotePhotoPath ? ro.add.reading : ro.add.readingFront}
            </Body>
          </Card>
        )
      ) : null}

      {state.stage === 'interrupted' || state.stage === 'error' ? (
        <StatusPanel
          message={
            state.stage === 'interrupted'
              ? ro.add.draftInterrupted
              : frontPending === 'retry'
                ? `${errorMessage(state.error)}\n\n${ro.pwa.analysis.retry}`
                : errorMessage(state.error)
          }
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
