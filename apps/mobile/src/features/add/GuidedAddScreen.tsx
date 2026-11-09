import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { Screen } from '../../ui/Screen';
import { StatusPanel, errorMessage } from '../capture/StatusPanel';
import { parseAddParams } from '../identify/routes';
import { GuidedNutritionQuestion } from './GuidedNutritionQuestion';
import { GuidedPhotoCapture } from './GuidedPhotoCapture';
import { useGuidedAddSession } from './useGuidedAddSession';

export function GuidedAddScreen() {
  const { colors } = useTheme();
  const rawParams = useLocalSearchParams<Record<string, string | string[] | undefined>>();
  const parsed = parseAddParams(rawParams);
  const frontPhotoId = typeof rawParams.frontPhotoId === 'string' && rawParams.frontPhotoId.trim() ? rawParams.frontPhotoId.trim() : undefined;
  const retakeParam = rawParams.retake;
  const retakeKind = retakeParam === 'front' || retakeParam === 'ingredients' || retakeParam === 'nutrition' ? retakeParam : undefined;
  const { state, controller, error, restoredFromDraft, discardDraft } = useGuidedAddSession(
    {
      ...parsed,
      ...(frontPhotoId ? { frontPhotoId } : {}),
    },
    retakeKind,
  );

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

  return (
    <Screen title={stageTitle}>
      {restoredFromDraft ? <Text style={{ color: colors.muted, fontSize: 14 }}>{ro.add.draftRestored}</Text> : null}

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
            { label: ro.add.discardDraft, onPress: () => void discardDraft() },
          ]}
        />
      ) : null}
    </Screen>
  );
}

export default GuidedAddScreen;
