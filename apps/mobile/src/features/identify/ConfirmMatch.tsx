import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Candidate } from '@okbite/shared';
import { ro } from '../../copy/ro';
import { ActionButton } from '../capture/StatusPanel';

export function ConfirmMatch({
  candidate,
  onConfirm,
  onReject,
}: {
  candidate: Candidate;
  onConfirm: (id: string) => void;
  onReject: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        {ro.identify.confirmTitle}
      </Text>
      <View style={styles.card}>
        {candidate.imageUrl ? (
          <Image
            source={{ uri: candidate.imageUrl }}
            accessibilityLabel={candidate.name}
            style={styles.hero}
          />
        ) : null}
        <Text style={styles.name}>{candidate.name}</Text>
        <Text style={styles.meta}>{`${candidate.brand} · ${candidate.quantity}`}</Text>
      </View>
      <Text style={styles.hint}>{ro.identify.confirmHint}</Text>
      <View style={styles.actions}>
        <ActionButton label={ro.identify.confirmYes} onPress={() => onConfirm(candidate.id)} />
        <ActionButton label={ro.identify.confirmNo} onPress={onReject} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  title: { fontSize: 22, fontWeight: '700' },
  card: { padding: 20, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', gap: 8 },
  hero: { width: 160, height: 160, borderRadius: 12 },
  name: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  meta: { fontSize: 15, color: '#56615A', textAlign: 'center' },
  hint: { fontSize: 14, color: '#56615A', textAlign: 'center' },
  actions: { gap: 10 },
});

