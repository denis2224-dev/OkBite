import React, { useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  parseWaterValueWithRange,
  WaterProfile,
  WaterRange,
  type Carbonation,
  type WaterNumericKey as SharedWaterNumericKey,
  type WaterProfile as WaterProfileType,
} from '@okbite/shared';
import { PressableOpacity as Pressable } from '../../shared/PressableOpacity';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import type { Palette } from '../../theme/tokens';

export type WaterNumericKey = Exclude<SharedWaterNumericKey, 'bMgL'>;

const CARBONATION_OPTIONS: readonly Carbonation[] = ['still', 'lightly_sparkling', 'sparkling'];
const PRIMARY_KEYS: readonly WaterNumericKey[] = [
  'tdsMgL', 'dryResidueMgL', 'ph', 'caMgL', 'mgMgL', 'naMgL', 'naPlusKMgL', 'hco3MgL', 'so4MgL', 'clMgL',
];
const TRACE_KEYS: readonly WaterNumericKey[] = ['kMgL', 'fMgL', 'no3MgL', 'h3bo3MgL', 'iUgL'];

const formatNum = (v: number) => String(v).replace('.', ',');
const formatFieldValue = (w: WaterProfileType, key: WaterNumericKey): string => {
  const r = w.ranges?.[key];
  if (r) return `${formatNum(r.min)}-${formatNum(r.max)}`;
  const v = w[key];
  return v === null || v === undefined ? '' : formatNum(v);
};

export interface WaterFieldsProps {
  value: WaterProfileType;
  disabled?: boolean;
  onChange: (next: WaterProfileType) => void;
  onInvalidChange?: (hasInvalid: boolean) => void;
}

export function WaterFields({ value, disabled, onChange, onInvalidChange }: WaterFieldsProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const wCopy = ro.result.water;
  const [traceOpen, setTraceOpen] = useState(() => TRACE_KEYS.some(k => value[k] !== null));
  const [drafts, setDrafts] = useState<Partial<Record<WaterNumericKey, string>>>({});
  const [invalid, setInvalid] = useState<Partial<Record<WaterNumericKey, boolean>>>({});

  const labelFor = (key: WaterNumericKey) =>
    key === 'tdsMgL' ? wCopy.tdsLabel
      : key === 'dryResidueMgL' ? wCopy.dryResidueLabel
      : key === 'ph' ? wCopy.phLabel
      : wCopy.ions[key];

  const unitFor = (key: WaterNumericKey) => (key === 'ph' ? '' : key === 'iUgL' ? wCopy.ugL : wCopy.mgL);

  const handleText = (key: WaterNumericKey, text: string) => {
    setDrafts(prev => ({ ...prev, [key]: text }));
    const trimmed = text.trim();
    const kind = key === 'ph' ? 'ph' : key === 'iUgL' ? 'i_ug' : 'mg';
    const maxCap = key === 'ph' ? 14 : 50_000;
    const { value: parsed, range } = trimmed ? parseWaterValueWithRange(trimmed, kind, key) : { value: null };
    const valid =
      !trimmed ||
      (parsed !== null &&
        WaterProfile.shape[key].safeParse(parsed).success &&
        (!range || (WaterRange.safeParse(range).success && range.max <= maxCap)));
    const nextInvalid = { ...invalid, [key]: !valid };
    setInvalid(nextInvalid);
    onInvalidChange?.(Object.values(nextInvalid).some(Boolean));
    if (valid) {
      const nextRanges = { ...(value.ranges ?? {}) };
      if (range) nextRanges[key] = range;
      else delete nextRanges[key];
      const next: WaterProfileType = { ...value, [key]: parsed };
      if (Object.keys(nextRanges).length > 0) next.ranges = nextRanges;
      else delete next.ranges;
      onChange(next);
    }
  };

  const renderField = (key: WaterNumericKey) => {
    const label = labelFor(key);
    const unit = unitFor(key);
    const display = key in drafts ? drafts[key]! : formatFieldValue(value, key);
    const isBad = Boolean(invalid[key]);
    return (
      <View key={key} style={styles.row}>
        <View style={styles.labelCol}>
          <Text style={styles.labelText}>{label}</Text>
          {isBad ? <Text testID={`water-error-${key}`} style={styles.errorText}>{ro.errors.generic}</Text> : null}
        </View>
        <TextInput
          testID={`water-${key}`}
          accessibilityLabel={label}
          editable={!disabled}
          keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
          value={display}
          onChangeText={t => handleText(key, t)}
          placeholder="0"
          placeholderTextColor={colors.muted}
          style={[styles.input, isBad && styles.inputInvalid]}
        />
        <Text style={styles.unitLabel}>{unit}</Text>
      </View>
    );
  };

  return (
    <View testID="water-fields" style={styles.card}>
      <Text style={styles.title}>{wCopy.cardTitle}</Text>
      <View style={styles.chipRow}>
        {CARBONATION_OPTIONS.map(opt => {
          const selected = value.carbonation === opt;
          return (
            <Pressable
              key={opt}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel={wCopy.carbonation[opt]}
              accessibilityState={{ selected, disabled: Boolean(disabled) }}
              onPress={() => onChange({ ...value, carbonation: selected ? null : opt })}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{wCopy.carbonation[opt]}</Text>
            </Pressable>
          );
        })}
      </View>
      {PRIMARY_KEYS.map(renderField)}
      <Pressable
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ expanded: traceOpen }}
        onPress={() => setTraceOpen(o => !o)}
        style={styles.toggle}
      >
        <Text style={styles.toggleText}>{wCopy.traceToggle}</Text>
      </Pressable>
      {traceOpen ? TRACE_KEYS.map(renderField) : null}
    </View>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  card: { padding: 14, borderRadius: 16, backgroundColor: colors.surface, gap: 10 },
  title: { fontSize: 16, fontWeight: '800', color: colors.ink },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 40, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5, borderColor: colors.muted, justifyContent: 'center' },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.ink },
  chipTextSelected: { color: colors.onPrimary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  labelCol: { flex: 1, gap: 2 },
  labelText: { fontSize: 14, fontWeight: '600', color: colors.ink },
  errorText: { fontSize: 11, fontWeight: '700', color: colors.low },
  input: { width: 88, minHeight: 44, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: colors.muted, backgroundColor: colors.surface, color: colors.ink, textAlign: 'right', fontSize: 15 },
  inputInvalid: { borderColor: colors.low },
  unitLabel: { width: 40, fontSize: 12, color: colors.muted },
  toggle: { minHeight: 44, justifyContent: 'center' },
  toggleText: { fontSize: 13, fontWeight: '700', color: colors.primary },
});
