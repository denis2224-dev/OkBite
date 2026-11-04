import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { NUTRIENT_KEYS, type NutrientKey, type ReadLabelResponse } from '@okbite/shared';
import { ro } from '../../copy/ro';
import { unitForNutrient } from './parseAmount';

export interface NutritionFieldsProps {
  values: Record<NutrientKey, string>;
  unclear: ReadLabelResponse['unclear'];
  invalid: Partial<Record<NutrientKey, boolean>>;
  onChange: (key: NutrientKey, value: string) => void;
}

// Reads optional R4 nutrient copy when merged; never exposes raw English keys as user labels.
function getOptionalNutrientLabel(key: NutrientKey): string | undefined {
  const reviewCopy = ro.review as { nutrients?: Partial<Record<NutrientKey, string>> };
  return reviewCopy.nutrients?.[key];
}

export function NutritionFields({
  values,
  unclear,
  invalid,
  onChange,
}: NutritionFieldsProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{ro.review.nutritionTitle}</Text>
        <Text style={styles.muted}>{ro.review.per100}</Text>
      </View>

      {NUTRIENT_KEYS.map((key) => {
        const isUnclear = unclear.includes(key);
        const isInvalid = Boolean(invalid[key]);
        const expectedUnit = unitForNutrient(key);
        const labelText = getOptionalNutrientLabel(key);
        const a11yLabel = labelText ?? `${ro.review.nutritionTitle} (${expectedUnit})`;

        return (
          <View key={key} style={styles.row}>
            <View style={styles.labelCol}>
              {labelText ? <Text style={styles.labelText}>{labelText}</Text> : null}
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
              style={[styles.input, isInvalid && styles.inputInvalid]}
            />
            <Text style={styles.unitSuffix}>{expectedUnit}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, borderRadius: 16, backgroundColor: '#FFFDF6', gap: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '700', color: '#1C2420' },
  muted: { fontSize: 13, color: '#56615A' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  labelCol: { flex: 1 },
  labelText: { fontSize: 14, fontWeight: '600', color: '#1C2420' },
  unclearMark: { fontSize: 12, fontWeight: '800', color: '#7A4E00' },
  errorText: { fontSize: 12, fontWeight: '700', color: '#8E3417' },
  input: {
    width: 108,
    minHeight: 46,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CFC8B8',
    backgroundColor: '#FFFFFF',
    textAlign: 'right',
    fontSize: 15,
    color: '#1C2420',
  },
  inputInvalid: { borderColor: '#8E3417' },
  unitSuffix: { width: 36, fontSize: 13, color: '#56615A' },
});

