import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { PressableOpacity as Pressable } from '../../shared/PressableOpacity';
import type { HistoryEntry } from '../history/store';
import { Badge, Body, Button, Card } from '../../ui';
import { ro } from '../../copy/ro';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { ScoreCard } from '../product/ScoreCard';
import { productScoreFor } from '../product/productScoreFor';
import { tierTone } from '../../theme/tierTones';
import { SourceCard } from '../product/SourceCard';
import { AllergenDetails } from '../product/AllergenDetails';

export function ProductPicker({ entries, selected, category, excluded, slot, onSelect }: {
  slot?: string; entries: HistoryEntry[]; selected?: HistoryEntry; category?: string; excluded?: string; onSelect(entry: HistoryEntry): void;
}) {
  const [open, setOpen] = useState(false);
  const { colors } = useTheme();
  const missing = selected ? (['kcal', 'sugar', 'sat', 'salt'] as const).filter(key => selected.product.nutrients[key] === null) : [];
  const options = entries.filter(entry => entry.product.status !== 'hidden' && entry.product.id !== excluded)
    .sort((a, b) => Number(b.product.category.slug === category) - Number(a.product.category.slug === category));
  // A numbered slot on the Compare page is compact: the photo and the score with its verdict, nothing else.
  if (slot) {
    const scored = selected ? productScoreFor(selected.product, selected.score) : null;
    const tone = scored?.score !== null && scored?.tier ? tierTone(scored.tier) : null;
    return <Card testID="compare-slot" style={{ gap: 10, padding: 14, borderRadius: 20 }}>
      <Text accessibilityRole="header" allowFontScaling style={[styles.slotLabel, { color: colors.muted }]}>{slot}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={selected?.product.name ?? `${slot}: ${ro.compare.pick}`}
        accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)}
        style={selected
          ? styles.filled
          : styles.empty}>
        {selected ? <>
          {selected.product.imageUrl
            ? <Image testID="slot-photo" source={{ uri: selected.product.imageUrl }} accessible={false} resizeMode="contain" style={[styles.photo, { backgroundColor: colors.mint }]} />
            : <View testID="slot-photo-tile" style={[styles.photo, { backgroundColor: colors.mint }]} />}
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            {tone && scored?.tier
              ? <>
                <Text allowFontScaling style={[styles.score, { color: tone.fg }]}>{scored.score}</Text>
                <Text allowFontScaling style={[styles.verdict, { color: tone.fg }]}>{ro.tiers[scored.tier]}</Text>
              </>
              : <Text allowFontScaling style={[styles.verdict, { color: colors.muted }]}>{ro.history.noScore}</Text>}
          </View>
        </> : <Text allowFontScaling style={[styles.choose, { color: colors.primary }]}>{ro.compare.pick}</Text>}
      </Pressable>
      {open && (!options.length ? <Body>{ro.history.design.emptyTitle}</Body> : options.map(entry => <Button key={entry.product.id} variant="ghost"
        onPress={() => { onSelect(entry); setOpen(false); }}>{`${entry.product.name}, ${entry.product.brand}`}</Button>))}
    </Card>;
  }
  return <Card>
    <Pressable accessibilityRole="button" accessibilityLabel={selected?.product.name ?? (slot ? `${slot}: ${ro.compare.choose}` : ro.compare.choose)}
      accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)}
      style={{ minHeight: 52, padding: 12, borderRadius: 16, backgroundColor: colors.soft, justifyContent: 'center' }}>
      <Body>{selected?.product.name ?? ro.compare.choose}</Body>
    </Pressable>
    {selected && <Body>{selected.product.brand}, {selected.product.quantity}</Body>}
    {selected?.product.status === 'unverified' && <Badge tone="unverified">{ro.result.unverified}</Badge>}
    {selected && <ScoreCard product={selected.product} identity={false} score={missing.length ? { score: null, letter: null, grade: 'unavailable', reasons: [], missing } : selected.score} />}
    {selected && <>
      <Body>{ro.result.allergens}</Body>
      <AllergenDetails product={selected.product} />
      <SourceCard product={selected.product} />
    </>}
    {open && (!options.length ? <Body>{ro.history.design.emptyTitle}</Body> : options.map(entry => <Button key={entry.product.id} variant="ghost"
      onPress={() => { onSelect(entry); setOpen(false); }}>{`${entry.product.name}, ${entry.product.brand}`}</Button>))}
  </Card>;
}

const styles = StyleSheet.create({
  slotLabel: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, letterSpacing: 1.4, textTransform: 'uppercase' },
  filled: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 14 },
  empty: { minHeight: 44, justifyContent: 'center' },
  photo: { width: 64, height: 64, borderRadius: 16 },
  score: { fontFamily: fonts.headingExtra, fontSize: 28, lineHeight: 32 },
  verdict: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 19 },
  choose: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 22 },
});
