import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Candidate } from '@okbite/shared';
import { ro } from '../../copy/ro';
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

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  title: { fontSize: 22, fontWeight: '700' },
  list: { gap: 10 },
  row: {
    minHeight: 44,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumb: { width: 52, height: 52, borderRadius: 10 },
  info: { flex: 1, gap: 4 },
  name: { fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 14, color: '#56615A' },
});

