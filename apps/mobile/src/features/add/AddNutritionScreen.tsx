import React, { useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LookupResponse, NUTRIENT_KEYS, Nutrients, type Unit } from '@okbite/shared';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { PressableOpacity as Pressable } from '../../shared/PressableOpacity';
import { Screen } from '../../ui/Screen';
import { compressPhoto } from '../capture/compressPhoto';
import { ActionButton, StatusPanel, errorMessage } from '../capture/StatusPanel';
import { useScreenActivity } from '../capture/useScreenActivity';
import { productRoute } from '../identify/routes';
import { saveToHistory } from '../history/store';
import { GuidedPhotoCapture } from './GuidedPhotoCapture';
import { parseAmount, unitForNutrient } from './parseAmount';
import { UnknownConfirmationField } from './UnknownConfirmationField';
import { EnrichProductRequest, EnrichReadLabelRequest, EnrichReadLabelResponse, type EnrichReadLabelResponse as EnrichReadResult } from './unknownFlowContract';
import { requestUnknownFlow } from './unknownFlowTransport';

const SINGLE_BUDGET = 1_450_000;

export function AddNutritionScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const activity = useScreenActivity();
  const rawParams = useLocalSearchParams<Record<string, string | string[] | undefined>>();
  const productId = typeof rawParams.productId === 'string' ? rawParams.productId.trim() : '';

  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readResult, setReadResult] = useState<EnrichReadResult | null>(null);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [unitOpen, setUnitOpen] = useState(false);
  const [nutrients, setNutrients] = useState(
    () => Object.fromEntries(NUTRIENT_KEYS.map(key => [key, null])) as Record<(typeof NUTRIENT_KEYS)[number], number | null>,
  );
  const [invalid, setInvalid] = useState<Record<string, boolean>>({});
  const busy = useRef(false);

  if (!productId) {
    return (
      <Screen title={ro.add.nutritionLater}>
        <StatusPanel message={ro.add.enrichUnavailable} actions={[]} />
      </Screen>
    );
  }

  const handleCapture = async (uri: string) => {
    if (busy.current) return;
    busy.current = true;
    setReading(true);
    setError(null);
    const token = activity.start();
    try {
      const photo = await compressPhoto(uri, SINGLE_BUDGET);
      if (!activity.isCurrent(token)) return;
      const result = await requestUnknownFlow('read-label', EnrichReadLabelRequest, EnrichReadLabelResponse, {
        ingredientsImage: null,
        nutritionImage: photo.base64,
        nutrition: 'separate',
      });
      if (!activity.isCurrent(token)) return;
      setReadResult(result);
      setUnit(result.unit); // unread stays null: the shopper picks g/ml, we never guess
      setNutrients({ ...result.nutrients });
    } catch (err) {
      if (activity.isCurrent(token)) {
        setError((err as { code?: string })?.code ?? 'failed');
      }
    } finally {
      busy.current = false;
      setReading(false);
    }
  };

  const numericInvalid =
    Object.values(invalid).some(Boolean) ||
    (nutrients.sat !== null && nutrients.fat !== null && nutrients.sat > nutrients.fat);
  const hasAnyValue = NUTRIENT_KEYS.some(key => nutrients[key] !== null);
  const canSubmit = Boolean(readResult) && !saving && !numericInvalid && hasAnyValue && unit !== null;

  const handleConfirm = async () => {
    if (busy.current || !readResult || !canSubmit || unit === null) return;
    busy.current = true;
    setSaving(true);
    setError(null);
    const token = activity.start();
    try {
      const response = await requestUnknownFlow('enrich-product', EnrichProductRequest, LookupResponse, {
        productId,
        unit,
        nutrients,
        nutritionPhotoPath: readResult.nutritionPhotoPath,
      });
      if (response.status !== 'found') throw Object.assign(new Error('invalid_response'), { code: 'invalid_response' });
      await saveToHistory(response);
      if (activity.isCurrent(token)) {
        router.replace(productRoute(response.product.id));
      }
    } catch (err) {
      if (activity.isCurrent(token)) {
        setError((err as { code?: string })?.code ?? 'failed');
      }
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  if (reading) {
    return (
      <Screen title={ro.add.nutritionTitle}>
        <View style={{ alignItems: 'center', gap: 12, paddingVertical: 24 }}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={{ color: colors.ink, fontSize: 16 }}>{ro.add.reading}</Text>
        </View>
      </Screen>
    );
  }

  if (!readResult) {
    return (
      <Screen title={ro.add.nutritionTitle}>
        <Text style={{ color: colors.muted, fontSize: 14 }}>{ro.add.nutritionHint}</Text>
        {error ? <Text accessibilityRole="alert" style={{ color: colors.low }}>{errorMessage(error)}</Text> : null}
        <GuidedPhotoCapture onCapture={handleCapture} />
      </Screen>
    );
  }

  return (
    <Screen title={ro.add.confirmTitle}>
      <View style={{ gap: 12, padding: 16, borderRadius: 20, backgroundColor: colors.surface }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ro.review.per100}
          disabled={saving}
          onPress={() => setUnitOpen(!unitOpen)}
          style={{ minHeight: 44, justifyContent: 'center' }}
        >
          <Text style={{ color: colors.ink, fontSize: 16 }}>{unit === 'g' ? ro.add.basisGram : unit === 'ml' ? ro.add.basisMl : ro.add.unitQuestion}</Text>
        </Pressable>
        {unitOpen || unit === null ? (
          (['g', 'ml'] as const).map(option => (
            <ActionButton
              key={option}
              label={ro.compare.per100(option)}
              disabled={saving}
              onPress={() => {
                setUnit(option);
                setUnitOpen(false);
              }}
            />
          ))
        ) : null}
        {NUTRIENT_KEYS.map(key => {
          const amount = nutrients[key];
          return (
            <UnknownConfirmationField
              key={key}
              label={ro.review.nutrients[key]}
              disabled={saving}
              numeric
              invalid={invalid[key]}
              value={amount === null ? '' : `${String(amount).replace('.', ',')} ${unitForNutrient(key)}`}
              onChange={text => {
                const parsed = text.trim() ? parseAmount(text, unitForNutrient(key)) : null;
                const valid = !text.trim() || (parsed !== null && Nutrients.shape[key].safeParse(parsed).success);
                setInvalid(prev => ({ ...prev, [key]: !valid }));
                if (valid) setNutrients(prev => ({ ...prev, [key]: parsed }));
              }}
            />
          );
        })}
        <ActionButton
          label={ro.add.retakePhoto}
          disabled={saving}
          onPress={() => {
            setReadResult(null);
            setError(null);
          }}
        />
      </View>
      {error ? <Text accessibilityRole="alert" style={{ color: colors.low }}>{errorMessage(error)}</Text> : null}
      <ActionButton
        label={saving ? ro.add.savePending : ro.add.confirmSave}
        disabled={!canSubmit}
        variant="primary"
        onPress={() => void handleConfirm()}
      />
    </Screen>
  );
}
export default AddNutritionScreen;
