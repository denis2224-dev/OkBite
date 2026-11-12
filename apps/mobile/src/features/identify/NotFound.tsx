import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { fonts, spacing } from '../../theme/tokens';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Icon } from '../../ui/Icon';
import { Body, Heading } from '../../ui/Typography';

export function NotFound({
  code,
  onAdd,
  onCheckCodeAgain,
  guided,
}: {
  code: string | null;
  onAdd: () => void;
  onCheckCodeAgain?: () => void;
  guided?: { needsFrontPhoto: boolean };
}) {
  const { colors } = useTheme();
  const steps = guided?.needsFrontPhoto ? [ro.add.frontTitle, ...ro.identify.nextSteps] : ro.identify.nextSteps;
  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.ground }]}>
      <View style={styles.content}>
        <View style={styles.intro}>
          <View style={[styles.icon, { backgroundColor: colors.soft }]} aria-hidden>
            <Icon name="scan" size={32} color={colors.ink} />
          </View>
          <Heading style={styles.centered}>{ro.identify.notFoundTitle}</Heading>
          <Body style={[styles.centered, { color: colors.muted }]}>
            {code ? ro.identify.codeNotFound(code) : ro.identify.notFoundText}
          </Body>
        </View>
        <Card>
          <Heading style={styles.nextTitle}>{ro.identify.nextTitle}</Heading>
          {steps.map((step, index) => (
            <View key={step} style={styles.stepRow}>
              <View style={[styles.badge, { backgroundColor: colors.goodBg }]} aria-hidden>
                <Body style={[styles.badgeText, { color: colors.good }]}>{String(index + 1)}</Body>
              </View>
              <View style={styles.stepText}>
                <Body>{step}</Body>
                {guided && step === ro.identify.nextSteps[1] && (
                  <Body style={{ color: colors.muted }}>{ro.add.nutritionSkip}</Body>
                )}
              </View>
            </View>
          ))}
        </Card>
        <View style={styles.actions}>
          <Button icon="camera" onPress={onAdd}>{ro.identify.addButton}</Button>
          {onCheckCodeAgain && (
            <Button variant="secondary" onPress={onCheckCodeAgain}>{ro.identify.checkCodeAgain}</Button>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: spacing.lg, paddingBottom: spacing.xl },
  content: { alignSelf: 'center', width: '100%', maxWidth: 480, gap: spacing.xl },
  intro: { alignItems: 'center', gap: spacing.md },
  icon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  centered: { textAlign: 'center' },
  nextTitle: { fontSize: 18, lineHeight: 24 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  badge: {
    minWidth: 32,
    minHeight: 32,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.bold },
  stepText: { flex: 1, paddingVertical: 4 },
  actions: { gap: spacing.md },
});
