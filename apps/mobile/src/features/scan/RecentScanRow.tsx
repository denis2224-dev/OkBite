import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { Allergen } from '@okbite/shared';
import { PressableOpacity as Pressable } from '../../shared/PressableOpacity';
import { Icon } from '../../ui/Icon';
import { ro } from '../../copy/ro';
import { useTheme } from '../../theme/useTheme';
import { fonts } from '../../theme/tokens';
import { letterTones } from '../../theme/letterTones';
import { displayScore } from '../product/displayScore';
import type { HistoryEntry } from '../history/store';

/** One recent product: letter tile, name, and either the tier word or the profile allergens it declares. */
export function RecentScanRow({ entry, watched, last }: { entry: HistoryEntry; watched: readonly Allergen[]; last: boolean }) {
  const { colors, isDark } = useTheme();
  const { product } = entry;
  const { letter, grade } = displayScore(product, entry.score);
  const tone = letter ? (isDark ? letterTones.dark : letterTones.light)[letter] : { fg: colors.neutral, bg: colors.neutralBg };
  const matches = product.allergens.filter(allergen => watched.includes(allergen)).map(allergen => ro.allergens[allergen]);
  const warning = matches.length ? ro.result.containsAllergen(matches.join(', ')) : null;
  const label = [ro.history.open(product.name), letter ? `${ro.tiers.nutriScore} ${letter}` : null, ro.score[grade], warning].filter(Boolean).join('. ');
  return <Pressable accessibilityRole="button" accessibilityLabel={label}
    onPress={() => router.push({ pathname: '/product/[id]', params: { id: product.id, cached: '1' } })}
    style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
    <View style={[styles.tile, { backgroundColor: tone.bg }]}><Text style={[styles.letter, { color: tone.fg }]}>{letter ?? '–'}</Text></View>
    <Text style={[styles.name, { color: colors.ink }]}>{product.name}</Text>
    {warning
      ? <View style={styles.warning}><Icon name="alert" size={18} color={colors.low} /><Text style={[styles.side, { color: colors.low, fontFamily: fonts.bold }]}>{matches.join(', ')}</Text></View>
      : <Text style={[styles.side, { color: colors.muted }]}>{ro.score[grade]}</Text>}
  </Pressable>;
}

const styles = StyleSheet.create({
  row: { minHeight: 64, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, paddingVertical: 10 },
  tile: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  letter: { fontFamily: fonts.heading, fontSize: 20, lineHeight: 26 },
  name: { flex: 1, minWidth: 120, fontFamily: fonts.medium, fontSize: 16, lineHeight: 22 },
  warning: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  side: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, flexShrink: 1 },
});
