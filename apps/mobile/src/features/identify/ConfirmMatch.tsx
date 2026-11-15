import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Candidate } from '@okbite/shared';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import type { Palette } from '../../theme/tokens';
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
  const { colors } = useTheme();
  const styles = createStyles(colors);
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
        <Text style={styles.meta}>{`${candidate.brand}, ${candidate.quantity}`}</Text>
      </View>
      <Text style={styles.hint}>{ro.identify.confirmHint}</Text>
      <View style={styles.actions}>
        <ActionButton variant="primary" label={ro.identify.confirmYes} onPress={() => onConfirm(candidate.id)} />
        <ActionButton variant="secondary" label={ro.identify.confirmNo} onPress={onReject} />
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  container: { flexGrow: 1, padding: 16, gap: 16, backgroundColor: colors.ground },
  title: { fontSize: 22, fontWeight: '700', color: colors.ink },
  card: { padding: 20, borderRadius: 16, backgroundColor: colors.surface, alignItems: 'center', gap: 8 },
  hero: { width: 160, height: 160, borderRadius: 12 },
  name: { maxWidth: '100%', fontSize: 20, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  meta: { maxWidth: '100%', fontSize: 15, color: colors.muted, textAlign: 'center' },
  hint: { fontSize: 14, color: colors.muted, textAlign: 'center' },
  actions: { gap: 10 },
});
