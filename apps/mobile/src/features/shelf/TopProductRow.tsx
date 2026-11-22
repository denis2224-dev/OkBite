import { Image, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ro } from '../../copy/ro';
import { fonts } from '../../theme/tokens';
import { tierTone } from '../../theme/tierTones';
import { useTheme } from '../../theme/useTheme';
import { PressableOpacity } from '../../shared/PressableOpacity';
import type { ShelfPick } from './topProducts';

/** One ranked product: its place, photo, name with brand, and score with the tier word. The first place is outlined. */
export function TopProductRow({ pick, rank }: { pick: ShelfPick; rank: number }) {
  const { colors } = useTheme();
  const { product, score, tier } = pick;
  const tone = tierTone(tier);
  const label = [ro.topProducts.rank(rank), product.name, product.brand, `${ro.history.score(score)}, ${ro.tiers[tier]}`].filter(Boolean).join('. ');
  return <PressableOpacity testID={`top-row-${rank}`} accessibilityRole="button" accessibilityLabel={label}
    onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })}
    style={[styles.row, { backgroundColor: colors.surface, borderColor: rank === 1 ? colors.primary : colors.transparent }]}>
    <Text allowFontScaling style={[styles.rank, { color: rank === 1 ? colors.primary : colors.muted }]}>{rank}</Text>
    {product.imageUrl
      ? <Image source={{ uri: product.imageUrl }} accessible={false} resizeMode="contain" style={[styles.photo, { backgroundColor: colors.mint }]} />
      : <View style={[styles.photo, { backgroundColor: colors.mint }]} />}
    <View style={styles.text}>
      <Text allowFontScaling numberOfLines={2} style={[styles.name, { color: colors.ink }]}>{product.name}</Text>
      {!!product.brand && <Text allowFontScaling numberOfLines={1} style={[styles.brand, { color: colors.muted }]}>{product.brand}</Text>}
    </View>
    <View style={styles.result}>
      <Text allowFontScaling style={[styles.score, { color: tone.fg }]}>{score}</Text>
      <Text allowFontScaling style={[styles.tier, { color: tone.fg }]}>{ro.tiers[tier]}</Text>
    </View>
  </PressableOpacity>;
}

const styles = StyleSheet.create({
  row: { minHeight: 88, padding: 12, borderRadius: 22, borderWidth: 2, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rank: { width: 26, textAlign: 'center', fontFamily: fonts.headingExtra, fontSize: 28, lineHeight: 32 },
  photo: { width: 64, height: 64, borderRadius: 16 },
  text: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18 },
  brand: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16 },
  result: { alignItems: 'flex-end', gap: 2 },
  score: { fontFamily: fonts.headingExtra, fontSize: 24, lineHeight: 26 },
  tier: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16 },
});
