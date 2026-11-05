import React, { useMemo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Candidate } from '@okbite/shared';
import { ro } from '../../copy/ro';
import type { Palette } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { ActionButton } from '../capture/StatusPanel';

export function CandidateList({
  candidates,
  onSelect,
  onNone,
}: {
  candidates: Candidate[];
  onSelect: (id: string) => void;
  onNone: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        {ro.identify.pickTitle}
      </Text>
      <View style={styles.list}>
        {candidates.map((c) => (
          <Pressable
            key={c.id}
            accessibilityRole="button"
            accessibilityLabel={`${c.name}, ${c.brand}, ${c.quantity}`}
            onPress={() => onSelect(c.id)}
            style={styles.row}
          >
            {c.imageUrl ? <Image source={{ uri: c.imageUrl }} style={styles.thumb} /> : null}
            <View style={styles.info}>
              <Text style={styles.name}>{c.name}</Text>
              <Text style={styles.meta}>{`${c.brand} · ${c.quantity}`}</Text>
            </View>
          </Pressable>
        ))}
      </View>
      <ActionButton label={ro.identify.noneOfThem} onPress={onNone} />
    </ScrollView>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  container: { padding: 16, gap: 16 },
  title: { color: colors.ink, fontSize: 22, fontWeight: '700' },
  list: { gap: 10 },
  row: {
    minHeight: 44,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumb: { width: 52, height: 52, borderRadius: 10 },
  info: { flex: 1, gap: 4 },
  name: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 14, color: colors.muted },
});
