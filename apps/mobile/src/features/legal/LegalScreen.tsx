import type { PropsWithChildren } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../theme/useTheme';
import { spacing } from '../../theme/tokens';
import { Body, Button, Heading, Screen } from '../../ui';
import { ro } from '../../copy/ro';
import { texts, type LegalKind } from './texts';

export function LegalScreen({ kind, children }: PropsWithChildren<{ kind: LegalKind }>) {
  const text = texts[kind];
  const { colors } = useTheme();
  return (
    <Screen title={text.title} back>
      <View style={styles.page}>
        <Body style={[styles.notice, { color: colors.muted }]}>{ro.legal.draft}</Body>
        <Heading>{text.lead}</Heading>
        <Body style={[styles.notice, { color: colors.muted }]}>{ro.legal.updated}</Body>
        {text.sections.map(section => (
          <View key={section.title} style={styles.section}>
            <Heading style={styles.heading}>{section.title}</Heading>
            <Body style={styles.body}>{section.body}</Body>
          </View>
        ))}
        {kind === 'method' ? <Body style={styles.body}>{ro.score.disclaimer}</Body> : null}
        {kind === 'privacy' ? <Body style={styles.body}>{ro.legal.contactPending}</Body> : null}
        {kind === 'about' ? <>
          <Button variant="secondary" onPress={() => router.push('/method')}>{ro.nav.method}</Button>
          <Button variant="secondary" onPress={() => router.push('/privacy')}>{ro.nav.privacy}</Button>
          <Button variant="secondary" onPress={() => router.push('/terms')}>{ro.nav.terms}</Button>
        </> : null}
        {children}
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  page: { width: '100%', maxWidth: 520, alignSelf: 'center', gap: spacing.xl },
  notice: { fontSize: 13, lineHeight: 20 },
  section: { gap: spacing.sm },
  heading: { fontSize: 18, lineHeight: 26 },
  body: { fontSize: 16, lineHeight: 24 },
});
