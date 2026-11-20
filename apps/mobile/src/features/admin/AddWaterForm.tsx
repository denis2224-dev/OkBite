import { useState } from 'react';
import { KeyboardTypeOptions, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  AdminAddWaterInput,
  Code,
  computeWaterScore,
  emptyWaterProfile,
  normalizeCode,
  summarizeWater,
  type WaterClassification,
  type WaterProfile,
} from '@okbite/shared';
import { ro } from '../../copy/ro';
import { PressableOpacity as Pressable } from '../../shared/PressableOpacity';
import { type Palette } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Body, Button } from '../../ui';
import { WaterFields } from '../add/WaterFields';

const STATUS_OPTIONS = ['verified', 'unverified'] as const;
const CLASSIFICATIONS: readonly WaterClassification[] = [
  'drinking',
  'natural_mineral',
  'table_mineral',
  'therapeutic',
];

export function AddWaterForm({
  onSave,
}: {
  onSave: (value: AdminAddWaterInput) => Promise<void>;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [brand, setBrand] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [code, setCode] = useState('');
  const [source, setSource] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [ingredientsText, setIngredientsText] = useState('');
  const [status, setStatus] = useState<'verified' | 'unverified'>('verified');
  const [water, setWater] = useState<WaterProfile>(() => emptyWaterProfile());
  const [waterInvalid, setWaterInvalid] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const preview = computeWaterScore(water, status);
  const summary = summarizeWater(water);

  const renderInput = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    options?: { placeholder?: string; keyboardType?: KeyboardTypeOptions },
  ) => (
    <View style={styles.fieldGroup}>
      <Body>{label}</Body>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        editable={!busy}
        placeholder={options?.placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={options?.keyboardType ?? 'default'}
        autoCapitalize={options?.keyboardType === 'url' ? 'none' : undefined}
        style={styles.input}
      />
    </View>
  );

  const renderChips = <T extends string>(
    label: string,
    options: readonly T[],
    selectedValue: T | null,
    labelFor: (opt: T) => string,
    onSelect: (opt: T) => void,
  ) => (
    <View style={styles.fieldGroup}>
      <Body>{label}</Body>
      <View style={styles.chipRow}>
        {options.map((opt) => {
          const selected = selectedValue === opt;
          const chipLabel = labelFor(opt);
          return (
            <Pressable
              key={opt}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={chipLabel}
              accessibilityState={{ selected, disabled: busy }}
              onPress={() => onSelect(opt)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {chipLabel}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const save = async () => {
    if (waterInvalid) {
      setError(ro.app.admin.invalid);
      return;
    }
    const trimmedCode = code.trim() || null;
    if (
      trimmedCode !== null &&
      (!Code.safeParse(trimmedCode).success || normalizeCode(trimmedCode) !== trimmedCode)
    ) {
      setError(ro.scan.manualChecksum);
      return;
    }
    const parsed = AdminAddWaterInput.safeParse({
      code: trimmedCode,
      brand: brand.trim(),
      name: name.trim(),
      quantity: quantity.trim(),
      status,
      source: source.trim(),
      sourceUrl: sourceUrl.trim() || null,
      ingredientsText: ingredientsText.trim(),
      water,
    });
    if (!parsed.success) {
      setError(ro.app.admin.invalid);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onSave(parsed.data);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : ro.app.admin.failed);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      {renderInput(ro.review.brand, brand, setBrand)}
      {renderInput(ro.review.name, name, setName)}
      {renderInput(ro.review.quantity, quantity, setQuantity)}
      {renderInput(ro.scan.manualLabel, code, setCode, {
        placeholder: ro.scan.manualPlaceholder,
        keyboardType: 'number-pad',
      })}
      {renderInput(ro.app.admin.waterSource, source, setSource)}
      {renderInput(ro.app.admin.waterSourceUrl, sourceUrl, setSourceUrl, { keyboardType: 'url' })}
      {renderInput(ro.app.admin.waterNotes, ingredientsText, setIngredientsText)}
      {renderChips(
        ro.app.admin.verify,
        STATUS_OPTIONS,
        status,
        (opt) => (opt === 'verified' ? ro.result.verified : ro.result.unverified),
        setStatus,
      )}
      {renderChips(
        ro.result.water.classificationLabel,
        CLASSIFICATIONS,
        water.classification,
        (opt) => ro.result.water.classifications[opt],
        (opt) =>
          setWater((prev) => ({
            ...prev,
            classification: prev.classification === opt ? null : opt,
          })),
      )}
      <WaterFields
        value={water}
        disabled={busy}
        onChange={setWater}
        onInvalidChange={setWaterInvalid}
      />
      <View testID="water-score-preview" style={styles.previewBox}>
        <Body>{ro.app.admin.scorePreview}</Body>
        <Text style={styles.previewText}>
          {preview.score !== null
            ? `${preview.score} ${ro.score.outOf}, ${ro.score[preview.grade]}, ${ro.result.water.tiers[summary.tier]}`
            : ro.result.scoreUnavailable}
        </Text>
      </View>
      {!!error && <Body accessibilityRole="alert">{error}</Body>}
      <Button disabled={busy} onPress={() => void save()}>
        {ro.app.admin.saveWater}
      </Button>
    </View>
  );
}

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    container: { gap: 14 },
    fieldGroup: { gap: 4 },
    input: {
      minHeight: 48,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.ink,
    },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      minHeight: 40,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.muted,
      justifyContent: 'center',
    },
    chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipText: { fontSize: 13, fontWeight: '600', color: colors.ink },
    chipTextSelected: { color: colors.onPrimary },
    previewBox: { padding: 14, borderRadius: 16, backgroundColor: colors.surface, gap: 4 },
    previewText: { fontSize: 15, fontWeight: '700', color: colors.ink },
  });
