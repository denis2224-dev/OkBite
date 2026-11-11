import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { Body, Button, Card, Heading, Screen } from '../../ui';
import { AdminEntry } from '../admin/AdminEntry';

const tiers = ['excellent', 'good', 'fair', 'poor', 'bad'] as const;
export type TierPalette = Record<typeof tiers[number], string>;
export type AboutScreenProps = { tierPalette?: TierPalette };
export function AboutScreen({ tierPalette }: AboutScreenProps = {}) {
  const { colors } = useTheme();
  const [sourceFailed, setSourceFailed] = useState(false);
  async function openSource() {
    setSourceFailed(false);
    try { await Linking.openURL('https://world.openfoodfacts.org'); }
    catch { setSourceFailed(true); }
  }
  return <Screen title={ro.about.title}>
    <Card style={{ backgroundColor: colors.hero, borderColor: colors.hero }}><Heading style={{ color: colors.heroText }}>{ro.about.whatTitle}</Heading><Body style={{ color: colors.heroText }}>{ro.about.whatBody}</Body></Card>
    <Card>
      <Heading style={styles.heading}>{ro.about.methodTitle}</Heading><Body>{ro.about.methodBody}</Body>
      <Body style={{ color: colors.muted }}>{ro.score.disclaimer}</Body>
      <Button variant="secondary" onPress={() => router.push('/method')}>{ro.settings.method}</Button>
    </Card>
    <Card>
      <Heading style={styles.heading}>{ro.about.tiersTitle}</Heading><Body>{ro.about.tiersBody}</Body>
      <View style={styles.tiers}>
        {tiers.map(tier => <View key={tier} style={styles.tier}>
          {tierPalette ? <View style={[styles.dot, { backgroundColor: tierPalette[tier] }]} /> : null}
          <Body>{ro.tiers[tier]}</Body>
        </View>)}
      </View>
    </Card>
    <Card><Heading style={styles.heading}>{ro.about.nutriScoreTitle}</Heading><Body>{ro.about.nutriScoreBody}</Body></Card>
    <Card>
      <Heading style={styles.heading}>{ro.about.sourcesTitle}</Heading><Body>{ro.about.sourcesBody}</Body>
      <Button variant="secondary" onPress={() => void openSource()}>{ro.about.sourcesTitle}</Button>
      {sourceFailed ? <Body accessibilityRole="alert">{ro.app.retry}</Body> : null}
    </Card>
    <Card><Heading style={styles.heading}>{ro.about.promiseTitle}</Heading><Body>{ro.about.promiseBody}</Body></Card>
    <AdminEntry />
  </Screen>;
}
const styles = StyleSheet.create({
  heading: { fontSize: 19, lineHeight: 27 },
  tiers: { gap: 8 }, tier: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 12, height: 12, borderRadius: 6 },
});
