import { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ro } from '../../copy/ro';
import { fonts } from '../../theme/tokens';
import { tierTone } from '../../theme/tierTones';
import { useTheme } from '../../theme/useTheme';
import { PressableOpacity } from '../../shared/PressableOpacity';
import type { HistoryEntry } from '../history/store';
import { productScoreFor } from '../product/productScoreFor';
import { ResultSection } from '../product/ResultSection';
import { pickable } from './compare';
import { CategoryFilter, type Category } from './CategoryFilter';

type Props = { entries: HistoryEntry[]; a?: HistoryEntry; b?: HistoryEntry; onPick: (entry: HistoryEntry) => void };

/** The last scanned products as photo tiles with score and verdict. A tap puts one in the next free slot. */
export function RecentProducts({ entries, a, b, onPick }: Props) {
  const { colors } = useTheme();
  const [chosen, setChosen] = useState<string | null>(null);
  const visible = useMemo(() => entries.filter(entry => entry.product.status !== 'hidden')
    .sort((x, y) => y.savedAt.localeCompare(x.savedAt)), [entries]);
  // The product types found in history, most products first. The filter is always on the line, even with a single type.
  const categories = useMemo<Category[]>(() => {
    const found = new Map<string, Category>();
    for (const { product } of visible) {
      const known = found.get(product.category.slug);
      found.set(product.category.slug, { slug: product.category.slug, name: product.category.name, count: (known?.count ?? 0) + 1 });
    }
    return [...found.values()].sort((x, y) => y.count - x.count || x.name.localeCompare(y.name));
  }, [visible]);
  const category = categories.some(item => item.slug === chosen) ? chosen : null; // a type that left the history falls back to All
  // Everything of the chosen type, or the newest few when nothing is chosen.
  const recent = category ? visible.filter(entry => entry.product.category.slug === category) : visible.slice(0, 8);
  if (!recent.length) return null;
  return <ResultSection title={ro.home.design.recent}
    action={<CategoryFilter categories={categories} value={category} onChange={setChosen} />}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {recent.map(entry => {
        const { product } = entry;
        const { score, tier } = productScoreFor(product, entry.score);
        const chosen = product.id === a?.product.id || product.id === b?.product.id;
        // A product already in a slot stays tappable: pressing it again takes it out.
        const enabled = chosen || pickable(a, b, entry);
        const tone = score !== null && tier ? tierTone(tier) : null;
        const ink = chosen ? colors.onPrimary : tone?.fg ?? colors.muted;
        const name = `${product.name}, ${product.brand}`;
        const spoken = score !== null && tier ? `${name}, ${ro.history.score(score)}, ${ro.tiers[tier]}` : `${name}, ${ro.history.noScore}`;
        return <PressableOpacity key={product.id} accessibilityRole="button" accessibilityLabel={spoken}
          accessibilityState={{ selected: chosen, disabled: !enabled }} disabled={!enabled} onPress={() => onPick(entry)}
          style={[styles.tile, { backgroundColor: chosen ? colors.primary : colors.surface, opacity: enabled ? 1 : 0.4 }]}>
          {product.imageUrl
            ? <Image source={{ uri: product.imageUrl }} accessible={false} resizeMode="contain" style={[styles.photo, { backgroundColor: chosen ? colors.surface : colors.mint }]} />
            : <View style={[styles.photo, { backgroundColor: chosen ? colors.surface : colors.mint }]} />}
          <View>
            <Text allowFontScaling style={[styles.score, { color: ink }]}>{score !== null && tier ? score : '–'}</Text>
            <Text allowFontScaling numberOfLines={1} style={[styles.verdict, { color: ink }]}>{score !== null && tier ? ro.tiers[tier] : ro.history.noScore}</Text>
          </View>
        </PressableOpacity>;
      })}
    </ScrollView>
  </ResultSection>;
}

const styles = StyleSheet.create({
  row: { gap: 10, paddingVertical: 2 },
  tile: { width: 120, minHeight: 44, padding: 10, borderRadius: 22, gap: 10 },
  photo: { width: 100, height: 100, borderRadius: 16 },
  score: { fontFamily: fonts.headingExtra, fontSize: 28, lineHeight: 32 },
  verdict: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 19 },
});
