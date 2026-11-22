import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { productScore, summarizeWater, type Product, type ScoreResult } from '@okbite/shared';
import { ro } from '../../copy/ro';
import { PressableOpacity } from '../../shared/PressableOpacity';
import { tierTone } from '../../theme/tierTones';
import { fonts, radii } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Body, Button, Caption, Card, Icon, LinkRow, Title } from '../../ui';
import { mineralToneColor } from './WaterDots';
import { WaterCard } from './WaterCard';
import { WaterTasteCard } from './WaterTasteCard';
import { deriveGoodForTags, getEffectivePh } from './waterAnalysis';

const PH_PILL_BG = { warn: '#FBE8DB', good: '#E1EEDC', info: '#E3F0FC' } as const;
const PH_PILL_FG = { warn: '#B84A14', good: '#1F4A35', info: '#1E5FA8' } as const;

export function WaterResultView({
  product,
  score,
  nutritionAdditionAvailable,
  onReport,
}: {
  product: Product;
  score: ScoreResult;
  nutritionAdditionAvailable: boolean;
  onReport: () => void;
}) {
  const { colors } = useTheme();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [thresholdsOpen, setThresholdsOpen] = useState(false);

  const water = product.water;
  if (!water) return null;

  const wCopy = ro.result.water;
  const thumbUrl = product.imageUrl && product.imageUrl !== failedUrl ? product.imageUrl : null;
  const scored = productScore(product, score);
  const shownValue = scored?.score ?? score.score;
  const tierKey = scored?.tier ?? (score.grade === 'good' ? 'good' : score.grade === 'medium' ? 'fair' : 'poor');
  const scoreTone = tierTone(tierKey);

  const summary = summarizeWater(water);
  const tierColor = summary.tier === 'therapeutic' ? colors.low
    : summary.tier === 'occasional_high_mineral' ? colors.medium : colors.good;
  const tierBg = summary.tier === 'therapeutic' ? colors.lowBg
    : summary.tier === 'occasional_high_mineral' ? colors.mediumBg : colors.mint;
  const phInfo = getEffectivePh(water);
  const goodFor = deriveGoodForTags(water);
  const metaLine = [product.brand, product.quantity].filter(Boolean).join(', ');

  return (
    <View style={styles.root}>
      <View style={styles.heroRow}>
        {thumbUrl ? (
          <Image
            testID="product-thumb"
            source={{ uri: thumbUrl }}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            resizeMode="cover"
            onError={() => setFailedUrl(thumbUrl)}
            style={[styles.thumb, { backgroundColor: colors.soft, borderColor: colors.border }]}
          />
        ) : shownValue !== null ? (
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[styles.scoreTile, { backgroundColor: scoreTone.bg }]}
          >
            <Body style={[styles.tileNum, { color: scoreTone.fg }]}>{shownValue}</Body>
            <Body style={[styles.tileSub, { color: scoreTone.fg }]}>{ro.score.outOf}</Body>
          </View>
        ) : null}
        <View style={styles.heroInfo}>
          <Title numberOfLines={2}>{product.name}</Title>
          {!!metaLine && <Body style={{ color: colors.muted }}>{metaLine}</Body>}
          <View style={styles.pillRow}>
            {shownValue !== null && (
              <View testID="product-score" style={[styles.pill, { backgroundColor: scoreTone.bg }]}>
                <Body style={[styles.pillText, { color: scoreTone.fg }]}>
                  {`${ro.history.score(shownValue)}, ${ro.tiers[tierKey]}`}
                </Body>
              </View>
            )}
            {phInfo && (
              <View testID="water-ph-pill" style={[styles.pill, { backgroundColor: PH_PILL_BG[phInfo.tone] }]}>
                <View style={[styles.pillDot, { backgroundColor: mineralToneColor(phInfo.tone) }]} />
                <Body style={[styles.pillText, { color: PH_PILL_FG[phInfo.tone] }]}>{phInfo.pill}</Body>
              </View>
            )}
          </View>
        </View>
      </View>

      <View testID="water-in-short" style={styles.section}>
        <Body style={[styles.eyebrow, { color: colors.good }]}>{wCopy.inShort}</Body>
        <Card style={styles.shortCard}>
          <View
            testID="water-tier-insight"
            style={[styles.outlinePill, { borderColor: tierColor, backgroundColor: tierBg }]}
          >
            <View style={[styles.pillDot, { backgroundColor: tierColor }]} />
            <Body style={[styles.outlinePillText, { color: tierColor }]}>{wCopy.tiers[summary.tier]}</Body>
          </View>
          {goodFor.caution ? (
            <View style={styles.subGroup}>
              <Body style={[styles.subLabel, { color: colors.low }]}>{wCopy.cautionTitle}</Body>
              <View style={[styles.outlinePill, { borderColor: colors.border, backgroundColor: colors.lowBg }]}>
                <Body style={[styles.outlinePillText, { color: colors.low }]}>{wCopy.therapeuticCaution}</Body>
              </View>
            </View>
          ) : goodFor.tags.length > 0 ? (
            <View style={styles.subGroup}>
              <Body style={[styles.subLabel, { color: colors.muted }]}>{wCopy.goodFor}</Body>
              <View style={styles.pillRow}>
                {goodFor.tags.map((tag) => (
                  <View key={tag} style={[styles.checkPill, { backgroundColor: colors.mint, borderColor: colors.border }]}>
                    <Icon name="check" size={14} color={colors.good} />
                    <Body style={[styles.outlinePillText, { color: colors.good }]}>{wCopy.goodForTags[tag]}</Body>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </Card>
      </View>

      <WaterTasteCard water={water} />
      <WaterCard product={product} />

      {nutritionAdditionAvailable && product.status !== 'hidden' && (
        <Button
          variant="secondary"
          onPress={() => router.push({ pathname: '/add/nutrition', params: { productId: product.id, kind: 'water' } })}
        >
          {wCopy.addOrUpdateChemistry}
        </Button>
      )}

      <View testID="water-more-card" style={styles.section}>
        <Body style={[styles.eyebrow, { color: colors.good }]}>{wCopy.moreTitle}</Body>
        <Card style={{ paddingVertical: 4, gap: 0 }}>
          <View style={{ paddingVertical: 8, borderBottomWidth: 1, borderColor: colors.divider }}>
            <PressableOpacity
              accessibilityRole="button"
              accessibilityState={{ expanded: thresholdsOpen }}
              onPress={() => setThresholdsOpen((o) => !o)}
              style={styles.moreRow}
            >
              <View style={[styles.moreIcon, { backgroundColor: colors.mint }]}>
                <Icon name="info" size={18} color={colors.primary} />
              </View>
              <Body style={styles.moreTitle}>{wCopy.whyThresholds}</Body>
              <View style={{ transform: [{ rotate: thresholdsOpen ? '-90deg' : '90deg' }] }}>
                <Icon name="arrow" size={18} color={colors.muted} />
              </View>
            </PressableOpacity>
            {thresholdsOpen && <Caption style={{ paddingTop: 8 }}>{wCopy.whyThresholdsBody}</Caption>}
          </View>
          <LinkRow icon="alert" label={ro.result.report} last onPress={onReport} />
        </Card>
      </View>

      <Caption style={{ color: colors.muted, textAlign: 'center' }}>{wCopy.labelNotice}</Caption>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 16 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  thumb: { width: 72, height: 72, borderRadius: radii.small, borderWidth: 1 },
  scoreTile: { width: 68, minHeight: 68, borderRadius: 16, padding: 6, alignItems: 'center', justifyContent: 'center' },
  tileNum: { fontFamily: fonts.heading, fontSize: 28, lineHeight: 32 },
  tileSub: { fontFamily: fonts.bold, fontSize: 11, lineHeight: 14 },
  heroInfo: { flex: 1, minWidth: 0, gap: 4 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill },
  pillDot: { width: 8, height: 8, borderRadius: 4 },
  pillText: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16 },
  section: { gap: 8 },
  eyebrow: { fontSize: 12, lineHeight: 16, fontFamily: fonts.bold, letterSpacing: 0.7 },
  shortCard: { gap: 12 },
  outlinePill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.pill, borderWidth: 1 },
  outlinePillText: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18 },
  subGroup: { gap: 6 },
  subLabel: { fontSize: 11, lineHeight: 15, fontFamily: fonts.bold, letterSpacing: 0.6 },
  checkPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.pill, borderWidth: 1 },
  moreRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12 },
  moreIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  moreTitle: { flex: 1, fontFamily: fonts.bold },
});
