import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { NUTRIENT_KEYS, type NutrientKey, type ReadLabelResponse } from '@okbite/shared';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { radii, type Palette } from '../../theme/tokens';
import { depth } from '../../theme/depth';
import { unitForNutrient } from './parseAmount';

export interface NutritionFieldsProps {
  values: Record<NutrientKey, string>;
  unclear: ReadLabelResponse['unclear'];
  invalid: Partial<Record<NutrientKey, boolean>>;
  onChange: (key: NutrientKey, value: string) => void;
}

// Reads R4 nutrient copy when all 8 keys exist; returns null if any required label is missing.
export function getCompleteNutrientLabels(): Record<NutrientKey, string> | null {
  const reviewCopy = ro.review as { nutrients?: Partial<Record<NutrientKey, string>> };
  const map = reviewCopy.nutrients;
  if (!map) return null;
  const complete = {} as Record<NutrientKey, string>;
  for (const key of NUTRIENT_KEYS) {
    const raw = map[key];
    if (typeof raw !== 'string' || !raw.trim()) {
      return null;
    }
    complete[key] = raw.trim();
  }
  return complete;
}

export function NutritionFields({
  values,
  unclear,
  invalid,
  onChange,
}: NutritionFieldsProps) {
  const [focused, setFocused] = useState<NutrientKey | null>(null);
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const labels = getCompleteNutrientLabels();

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{ro.review.nutritionTitle}</Text>
        <Text style={styles.muted}>{ro.review.per100}</Text>
      </View>

      {labels === null ? (
        <View
          accessibilityRole="alert"
          testID="nutrition-copy-unavailable"
          style={styles.unavailableBox}
        >
          <Text style={styles.labelText}>{ro.result.insufficientData}</Text>
          <Text style={styles.errorText}>{ro.errors.generic}</Text>
        </View>
      ) : (
        NUTRIENT_KEYS.map((key) => {
          const isUnclear = unclear.includes(key);
          const isInvalid = Boolean(invalid[key]);
          const expectedUnit = unitForNutrient(key);
          const labelText = labels[key];
          const a11yLabel = `${labelText} (${expectedUnit})`;

          return (
            <View key={key} style={styles.row}>
              <View style={styles.labelCol}>
                <Text style={styles.labelText}>{labelText}</Text>
                {isUnclear ? (
                  <Text testID={`unclear-${key}`} style={styles.unclearMark}>
                    {ro.review.unclearField}
                  </Text>
                ) : null}
                {isInvalid ? (
                  <Text testID={`error-${key}`} style={styles.errorText}>
                    {ro.errors.generic}
                  </Text>
                ) : null}
              </View>
              <TextInput
                testID={`nutrient-${key}`}
                accessibilityLabel={a11yLabel}
                value={values[key]}
                onChangeText={(v) => onChange(key, v)}
                keyboardType="decimal-pad"
                onFocus={() => setFocused(key)}
                onBlur={() => setFocused(f => (f === key ? null : f))}
                style={[styles.input, focused === key && styles.inputFocused, isInvalid && styles.inputInvalid]}
              />
              <Text style={styles.unitSuffix}>{expectedUnit}</Text>
            </View>
          );
        })
      )}
    </View>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  card: { padding: 18, borderRadius: radii.card, backgroundColor: colors.surface, gap: 8, ...depth.raised },
  header: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: colors.ink },
  muted: { fontSize: 13, color: colors.muted },
  unavailableBox: { padding: 12, borderRadius: radii.small, backgroundColor: colors.ground, gap: 4, ...depth.well },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  labelCol: { flexGrow: 1, flexShrink: 1, flexBasis: 160, minWidth: 0 },
  labelText: { fontSize: 14, fontWeight: '600', color: colors.ink },
  unclearMark: { fontSize: 12, fontWeight: '800', color: colors.medium },
  errorText: { fontSize: 12, fontWeight: '700', color: colors.low },
  input: {
    minWidth: 108,
    flexGrow: 1,
    flexBasis: 108,
    minHeight: 46,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: radii.small,
    borderWidth: 1,
    borderColor: colors.transparent,
    ...depth.well,
    backgroundColor: colors.surface,
    textAlign: 'right',
    fontSize: 15,
    color: colors.ink,
  },
  inputFocused: { borderColor: colors.focus },
  inputInvalid: { borderColor: colors.low },
  unitSuffix: { minWidth: 36, fontSize: 13, color: colors.muted },
});
