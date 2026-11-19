import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { PressableOpacity as Pressable } from '../../shared/PressableOpacity';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { fonts } from '../../theme/tokens';
import { tierTone } from '../../theme/tierTones';
import { ScoreTagSmall } from './ScoreTagSmall';
import type { ShelfPick } from './topProducts';

// Lighter than `goodBg`, so every tier colour still reads on it (the lighter "Bun" green needs 4.5:1).
const BEST_FILL = '#F1F6EE';

/** One ranked product: score tag, name, "brand, quantity" and the tier word. `best` marks the first row. */
export function ShelfPickRow({ pick, best }: { pick: ShelfPick; best: boolean }) {
  const { colors } = useTheme();
  const { product, score, tier } = pick;
  const tone = tierTone(tier).word;
  const detail = [product.brand, product.quantity].filter(Boolean).join(', ');
  const label = [best ? ro.scan.shelf.best : null, [product.name, product.brand].filter(Boolean).join(', '), `${ro.history.score(score)} · ${ro.tiers[tier]}`].filter(Boolean).join('. ');
  return <Pressable accessibilityRole="button" accessibilityLabel={label}
    onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id } })}
    style={[styles.row, { borderColor: best ? colors.primary : colors.border, backgroundColor: best ? BEST_FILL : colors.surface }]}>
    <ScoreTagSmall score={score} tier={tier} />
    <View style={styles.text}>
      {best ? <Text style={[styles.pill, { backgroundColor: colors.primary, color: colors.onPrimary }]}>{ro.scan.shelf.best}</Text> : null}
      <Text style={[styles.name, { color: colors.ink }]}>{product.name}</Text>
      {detail ? <Text style={[styles.detail, { color: colors.muted }]}>{detail}</Text> : null}
    </View>
    <Text style={[styles.tier, { color: tone }]}>{ro.tiers[tier]}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  row: { minHeight: 64, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1, borderRadius: 16 },
  text: { flex: 1, minWidth: 120, gap: 2 },
  pill: { alignSelf: 'flex-start', overflow: 'hidden', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginBottom: 2, fontFamily: fonts.bold, fontSize: 12, lineHeight: 17 },
  name: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 22 },
  detail: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  tier: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 21, flexShrink: 1 },
});
