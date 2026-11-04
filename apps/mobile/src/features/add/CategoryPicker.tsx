import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Category } from '@okbite/shared';
import { ro } from '../../copy/ro';

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

const styles = StyleSheet.create({
  container: { gap: 8 },
  label: { fontSize: 15, fontWeight: '700', color: '#1C2420' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CFC8B8',
    backgroundColor: '#FFFDF6',
    justifyContent: 'center',
  },
  chipSelected: {
    borderColor: '#173A2A',
    backgroundColor: '#173A2A',
  },
  chipDisabled: { opacity: 0.55 },
  chipText: { fontSize: 14, fontWeight: '600', color: '#1C2420' },
  chipTextSelected: { color: '#FFFFFF' },
  emptyBox: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FBE3D8',
    gap: 4,
  },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#8E3417' },
  emptyText: { fontSize: 13, color: '#8E3417' },
});

