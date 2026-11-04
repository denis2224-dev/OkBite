import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ro } from '../../copy/ro';
import { ActionButton } from '../capture/StatusPanel';

export function NotFound({
  code,
  onAdd,
  onCheckCodeAgain,
}: {
  code: string | null;
  onAdd: () => void;
  onCheckCodeAgain?: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        {ro.identify.notFoundTitle}
      </Text>
      <Text style={styles.subtitle}>
        {code ? ro.identify.codeNotFound(code) : ro.identify.notFoundText}
      </Text>
      <View style={styles.card}>
        <Text style={styles.nextTitle}>{ro.identify.nextTitle}</Text>
        {ro.identify.nextSteps.map((step, idx) => (
          <View key={step} style={styles.stepRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{String(idx + 1)}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>
      <View style={styles.actions}>
        <ActionButton label={ro.identify.addButton} onPress={onAdd} />
        {onCheckCodeAgain ? (
          <ActionButton label={ro.identify.checkCodeAgain} onPress={onCheckCodeAgain} />
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 15, color: '#56615A' },
  card: { padding: 16, borderRadius: 16, backgroundColor: '#fff', gap: 12 },
  nextTitle: { fontSize: 14, fontWeight: '700' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E3EEDF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 14, fontWeight: '700', color: '#173A2A' },
  stepText: { flex: 1, fontSize: 15 },
  actions: { gap: 10 },
});

