import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PressableOpacity as Pressable } from '../../shared/PressableOpacity';
import type { Category } from '@okbite/shared';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import type { Palette } from '../../theme/tokens';

export interface CategoryPickerProps {
  categories: readonly Category[];
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
  disabled?: boolean;
}

export function CategoryPicker({
  categories,
  selectedSlug,
  onSelect,
  disabled = false,
}: CategoryPickerProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{ro.review.category}</Text>
      {categories.length === 0 ? (
        <View accessibilityRole="alert" style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>{ro.result.insufficientData}</Text>
          <Text style={styles.emptyText}>{ro.errors.generic}</Text>
        </View>
      ) : (
        <View style={styles.grid}>
          {categories.map((cat) => {
            const selected = cat.slug === selectedSlug;
            return (
              <Pressable
                key={cat.slug}
                accessibilityRole="button"
                accessibilityLabel={`${ro.review.category}: ${cat.name}`}
                accessibilityState={{ selected, disabled }}
                disabled={disabled}
                onPress={() => onSelect(cat.slug)}
                style={[styles.chip, selected && styles.chipSelected, disabled && styles.chipDisabled]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {cat.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  container: { gap: 8 },
  label: { fontSize: 15, fontWeight: '700', color: colors.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 44,
    maxWidth: '100%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.muted,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  chipDisabled: { opacity: 0.55 },
  chipText: { flexShrink: 1, fontSize: 14, fontWeight: '600', color: colors.ink },
  chipTextSelected: { color: colors.onPrimary },
  emptyBox: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.lowBg,
    gap: 4,
  },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: colors.low },
  emptyText: { fontSize: 13, color: colors.low },
});
