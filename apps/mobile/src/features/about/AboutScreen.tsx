import { useState, type ReactNode } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { Body, Caption, Card, Screen, Section } from '../../ui';
import { LinkRow } from '../../ui/LinkRow';
import { TabPageHeader } from '../../shared/TabPageHeader';
import { goBack } from '../../shared/EdgeSwipeBack';
import { tierTone } from '../../theme/tierTones';
import { AdminEntry } from '../admin/AdminEntry';

const tiers = ['excellent', 'good', 'fair', 'poor', 'bad'] as const;
export type AboutScreenProps = { children?: ReactNode };
export function AboutScreen({ children }: AboutScreenProps = {}) {
  const { colors } = useTheme();
  const [sourceFailed, setSourceFailed] = useState(false);
  async function openSource() {
    setSourceFailed(false);
    try { await Linking.openURL('https://world.openfoodfacts.org'); }
    catch { setSourceFailed(true); }
  }
  return <Screen>
    <View style={styles.header}><TabPageHeader title={ro.about.title} onBack={goBack} /></View>
    <Card testID="about-feature" style={{ backgroundColor: colors.hero, borderColor: colors.hero }}><Section style={{ color: colors.heroText }}>{ro.about.whatTitle}</Section><Body style={{ color: colors.heroText }}>{ro.about.whatBody}</Body></Card>
    <Card>
      <Section>{ro.about.scoreTitle}</Section>
      <View style={styles.tiers}>
        {tiers.map(tier => <View key={tier} style={styles.tier}>
          <View testID={`tier-swatch-${tier}`} style={[styles.dot, { backgroundColor: tierTone(tier).fg }]} />
          <Body>{ro.tiers[tier]}</Body>
        </View>)}
      </View>
      <Caption>{ro.score.disclaimer}</Caption>
      <LinkRow label={ro.settings.method} last onPress={() => router.push('/method')} />
    </Card>
    <Card><Section>{ro.about.promiseTitle}</Section><Body>{ro.about.promiseBody}</Body></Card>
    <Card style={styles.links}>
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
  header: { marginHorizontal: -16, marginTop: -12 },
  tiers: { gap: 8 }, tier: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  links: { paddingVertical: 4, gap: 0 },
});
