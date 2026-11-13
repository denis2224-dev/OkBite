import { useState, type ReactNode } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { Body, Card, Heading, Screen } from '../../ui';
import { LinkRow } from '../../ui/LinkRow';
import { AdminEntry } from '../admin/AdminEntry';

const tiers = ['excellent', 'good', 'fair', 'poor', 'bad'] as const;
export type TierPalette = Record<typeof tiers[number], string>;
export type AboutScreenProps = { tierPalette?: TierPalette; children?: ReactNode };
export function AboutScreen({ tierPalette, children }: AboutScreenProps = {}) {
  const { colors } = useTheme();
  const [sourceFailed, setSourceFailed] = useState(false);
  async function openSource() {
    setSourceFailed(false);
    try { await Linking.openURL('https://world.openfoodfacts.org'); }
    catch { setSourceFailed(true); }
  }
  return <Screen title={ro.about.title}>
    <Card style={{ backgroundColor: colors.hero, borderColor: colors.hero }}><Heading style={[styles.heading, { color: colors.heroText }]}>{ro.about.whatTitle}</Heading><Body style={{ color: colors.heroText }}>{ro.about.whatBody}</Body></Card>
    <Card>
      <Heading style={styles.heading}>{ro.about.scoreTitle}</Heading>
      <View style={styles.tiers}>
        {tiers.map(tier => <View key={tier} style={styles.tier}>
          {tierPalette ? <View style={[styles.dot, { backgroundColor: tierPalette[tier] }]} /> : null}
          <Body>{ro.tiers[tier]}</Body>
        </View>)}
      </View>
      <Body style={{ color: colors.muted }}>{ro.score.disclaimer}</Body>
      <LinkRow label={ro.settings.method} last onPress={() => router.push('/method')} />
    </Card>
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
  tiers: { gap: 8 }, tier: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 12, height: 12, borderRadius: 6 },
});
