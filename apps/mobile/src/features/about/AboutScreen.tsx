import { useState, type ReactNode } from 'react';
import { Linking, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { Body, Card, Heading, Screen } from '../../ui';
import { LinkRow } from '../../ui/LinkRow';
import { AdminEntry } from '../admin/AdminEntry';

export type AboutScreenProps = { children?: ReactNode };
export function AboutScreen({ children }: AboutScreenProps = {}) {
  const { colors } = useTheme();
  const [sourceFailed, setSourceFailed] = useState(false);
  async function openSource() {
    setSourceFailed(false);
    try { await Linking.openURL('https://world.openfoodfacts.org'); }
    catch { setSourceFailed(true); }
  }
  return <Screen title={ro.about.title}>
    <Card style={{ backgroundColor: colors.hero, borderColor: colors.hero }}><Heading style={[styles.heading, { color: colors.heroText }]}>{ro.about.whatTitle}</Heading><Body style={{ color: colors.heroText }}>{ro.about.whatBody}</Body></Card>
    <Card><LinkRow label={ro.settings.method} last onPress={() => router.push('/method')} /></Card>
    <Card><Heading style={styles.heading}>{ro.about.promiseTitle}</Heading><Body>{ro.about.promiseBody}</Body></Card>
    <Card>
      <LinkRow label={ro.about.sources} onPress={() => void openSource()} />
      {sourceFailed ? <Body accessibilityRole="alert">{ro.app.retry}</Body> : null}
      <LinkRow label={ro.nav.privacy} onPress={() => router.push('/privacy')} />
      <LinkRow label={ro.nav.terms} last onPress={() => router.push('/terms')} />
    </Card>
    {children}
    <AdminEntry />
  </Screen>;
}
const styles = StyleSheet.create({
  heading: { fontSize: 19, lineHeight: 27 },
});
