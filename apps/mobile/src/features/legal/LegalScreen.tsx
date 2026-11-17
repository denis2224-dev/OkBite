import type { PropsWithChildren } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../theme/useTheme';
import { spacing } from '../../theme/tokens';
import { Body, Button, Caption, Screen, Section, Title } from '../../ui';
import { goBack } from '../../shared/EdgeSwipeBack';
import { ro } from '../../copy/ro';
import { texts, type LegalKind } from './texts';

/** Formatting only: a readable measure, section headings and dividers on the palette; the wording lives in the copy files. */
export function LegalScreen({ kind, children }: PropsWithChildren<{ kind: LegalKind }>) {
  const text = texts[kind];
  const { colors } = useTheme();
  return (
    <Screen title={text.title} onBack={goBack}>
      <View testID="legal-page" style={styles.page}>
        <View style={styles.intro}>
          <Title style={{ color: colors.primary }}>{text.lead}</Title>
          <Caption>{ro.legal.updated}</Caption>
        </View>
        {text.sections.map((section, index) => (
          <View key={section.title} testID="legal-section" style={[styles.section, index > 0 && { borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: spacing.xl }]}>
            <Section>{section.title}</Section>
            <Body>{section.body}</Body>
          </View>
        ))}
        {kind === 'method' ? <Caption>{ro.score.disclaimer}</Caption> : null}
        {kind === 'about' ? <View style={styles.links}>
          <Button variant="secondary" onPress={() => router.push('/method')}>{ro.nav.method}</Button>
          <Button variant="secondary" onPress={() => router.push('/privacy')}>{ro.nav.privacy}</Button>
          <Button variant="secondary" onPress={() => router.push('/terms')}>{ro.nav.terms}</Button>
        </View> : null}
        {children}
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  page: { width: '100%', maxWidth: 560, alignSelf: 'center', gap: spacing.xl, paddingBottom: spacing.xl },
  intro: { gap: spacing.xs },
  section: { gap: spacing.sm },
  links: { gap: spacing.md },
});
