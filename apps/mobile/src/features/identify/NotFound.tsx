import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import type { Palette } from '../../theme/tokens';
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
  const { colors } = useTheme();
  const styles = createStyles(colors);
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
        <ActionButton variant="primary" label={ro.identify.addButton} onPress={onAdd} />
        {onCheckCodeAgain ? (
          <ActionButton variant="secondary" label={ro.identify.checkCodeAgain} onPress={onCheckCodeAgain} />
        ) : null}
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  container: { flexGrow: 1, padding: 16, gap: 16, backgroundColor: colors.ground },
  title: { fontSize: 22, fontWeight: '700', color: colors.ink },
  subtitle: { fontSize: 15, color: colors.muted },
  card: { padding: 16, borderRadius: 16, backgroundColor: colors.surface, gap: 12 },
  nextTitle: { fontSize: 14, fontWeight: '700', color: colors.ink },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: {
    minWidth: 32,
    minHeight: 32,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: colors.neutralBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 14, fontWeight: '700', color: colors.neutral },
  stepText: { flex: 1, fontSize: 15, color: colors.ink },
  actions: { gap: 10 },
});
