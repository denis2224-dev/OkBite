import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { ro } from '../../copy/ro';
import { isPreview } from '../../lib/preview';
import { fonts, radii, spacing, typeScale, type Palette } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { GradeSquare, Icon, SecondaryButton, SoftCard, StatusToast, SwipeableTabs } from '../../ui';
import type { HistoryEntry } from '../history/store';
import { productScoreFor } from '../product/productScoreFor';
import { CompareCell } from './CompareCell';
import { CompareVerdict } from './CompareVerdict';
import type { compareRows, WaterCompareRow } from './compare';
import { waterFieldDisplayValue, waterFieldLabel } from '../product/waterFormat';

const copy = ro.compare.design;
type Rows = ReturnType<typeof compareRows>;

/** Two product cards, swipeable Nutrienți / Ingrediente / Alergeni tabs and one verdict line. Existing results only. */
/** `waterRows` switches the first tab to the mineral table for two waters of the same kind. */
export function ComparisonView({ a, b, rows, waterRows, winner, onSwap, onCategory }: {
  a: HistoryEntry; b: HistoryEntry; rows: Rows; waterRows?: WaterCompareRow[]; winner: 'a' | 'b' | null; onSwap: () => void; onCategory: () => void;
}) {
  const { colors } = useTheme();
  const s = createStyles(colors);
  const [tab, setTab] = useState(0);
  const sides = [{ entry: a, side: 'a' }, { entry: b, side: 'b' }] as const;
  const unit = a.product.unit;

  const nutrients = <SoftCard accessibilityRole="table" accessibilityLabel={copy.table(unit)} style={s.table}>
    <View accessibilityRole="row" style={s.row}>
      <Text accessibilityRole="columnheader" style={[s.head, s.name]}>{ro.compare.per100(unit)}</Text>
      <Text accessibilityRole="columnheader" style={[s.head, s.value]}>A</Text>
      <Text accessibilityRole="columnheader" style={[s.head, s.value]}>B</Text>
    </View>
    {rows.map(row => {
      const amountUnit = row.key === 'kcal' ? 'kcal' : 'g';
      return <View key={row.key} accessibilityRole="row" style={[s.row, s.divided]}>
        <Text accessibilityRole="rowheader" style={[s.nutrient, s.name]}>{row.key === 'sat' ? copy.saturated : ro.result.nutrients[row.key]}</Text>
        {(['a', 'b'] as const).map(side => <CompareCell key={side} testID={`compare-cell-${row.key}-${side}`} value={row[side]} unit={amountUnit} better={row.key !== 'kcal' && row.better === side} />)}
      </View>;
    })}
  </SoftCard>;

  const water = waterRows && <SoftCard accessibilityRole="table" accessibilityLabel={copy.table(unit)} style={s.table}>
    <View accessibilityRole="row" style={s.row}>
      <Text accessibilityRole="columnheader" style={[s.head, s.name]}>{ro.result.water.cardTitle}</Text>
      <Text accessibilityRole="columnheader" style={[s.head, s.value]}>A</Text>
      <Text accessibilityRole="columnheader" style={[s.head, s.value]}>B</Text>
    </View>
    {waterRows.map(row => <View key={row.key} accessibilityRole="row" style={[s.row, s.divided]}>
      <Text accessibilityRole="rowheader" style={[s.nutrient, s.name]}>{waterFieldLabel(row.key)}</Text>
      {sides.map(({ entry, side }) => {
        const text = entry.product.water ? waterFieldDisplayValue(entry.product.water, row.key) : null;
        return <View key={side} style={[s.value, { paddingVertical: 4, borderRadius: 8, backgroundColor: row.better === side ? colors.favorableBg : colors.transparent }]}>
          <Text testID={`compare-cell-${row.key}-${side}`} style={[s.nutrient, { textAlign: 'center' }]}>{text ?? '—'}</Text>
        </View>;
      })}
    </View>)}
  </SoftCard>;

  const ingredients = <View style={s.pair}>
    {sides.map(({ entry, side }) => <SoftCard key={side} style={s.half}>
      <Text style={s.nutrient}>{side.toUpperCase()}</Text>
      <Text style={s.body}>{entry.product.ingredientsText || copy.none}</Text>
    </SoftCard>)}
  </View>;

  const allergens = <SoftCard style={s.table}>
    {sides.map(({ entry, side }) => <View key={side} style={s.allergenLine}>
      <Text style={s.body}><Text style={s.nutrient}>{side.toUpperCase()}: </Text><Text>{entry.product.allergens.join(', ') || copy.none}</Text></Text>
      {entry.product.mayContain.length > 0 && <Text style={s.body}><Text>{ro.result.mayContain}</Text> <Text>{entry.product.mayContain.join(', ')}</Text></Text>}
    </View>)}
    <Text style={s.note}>{ro.result.missingAllergenNote}</Text>
  </SoftCard>;

  const winnerName = winner === 'a' ? a.product.name : winner === 'b' ? b.product.name : null;
  return <View style={s.column}>
    <View style={s.pair}>{sides.map(({ entry, side }) => {
      const { product } = entry;
      const scored = productScoreFor(product, entry.score);
      const better = winner === side;
      return <SoftCard key={side} testID="compare-card" style={s.card}>
        <View style={s.tile} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {product.imageUrl ? <Image source={{ uri: product.imageUrl }} resizeMode="contain" style={StyleSheet.absoluteFill} /> : <Icon name="tag" size={24} color={colors.primaryDark} />}
        </View>
        <Text style={s.productName}>{product.name}</Text>
        <View style={s.grade}>
          <GradeSquare testID="compare-grade" score={scored.score} tier={scored.tier} />
          <Text style={s.tier}>{scored.score !== null && scored.tier ? ro.tiers[scored.tier] : ro.history.noScore}</Text>
        </View>
        {/* Both cards keep room for the pill so they stay the same size. */}
        <View testID={better ? 'compare-best' : undefined} style={[s.best, { backgroundColor: better ? colors.mist : colors.transparent }]}>
          <Text style={[s.bestText, { color: better ? colors.primaryDark : colors.transparent }]} accessibilityElementsHidden={!better}>{copy.better}</Text>
        </View>
        <CompareVerdict better={false} allergens={product.allergens} />
        {better && <View testID="compare-outline" pointerEvents="none" style={s.outline} />}
      </SoftCard>;
    })}</View>
    <View style={s.pair}>
      <SecondaryButton label={copy.swap} onPress={onSwap} style={s.half} />
      <SecondaryButton label={copy.category} onPress={onCategory} style={s.half} />
    </View>
    <SwipeableTabs index={tab} onIndexChange={setTab} tabs={[
      { key: 'nutrients', label: copy.tabs.nutrients, render: () => water ?? nutrients },
      { key: 'ingredients', label: copy.tabs.ingredients, render: () => ingredients },
      { key: 'allergens', label: copy.tabs.allergens, render: () => allergens },
    ]} />
    {winnerName && <StatusToast title={copy.verdict(winnerName)} />}
    <Text style={s.note}>{waterRows ? ro.result.water.disclaimer : ro.score.disclaimer}</Text>
    {isPreview && <Text style={s.note}>{copy.footnote}</Text>}
  </View>;
}

const createStyles = (c: Palette) => StyleSheet.create({
  column: { gap: spacing.section },
  pair: { flexDirection: 'row', alignItems: 'stretch', gap: 12 },
  half: { flex: 1, minWidth: 0 },
  card: { flex: 1, minWidth: 0, padding: 16, gap: 10 },
  tile: { width: 64, height: 64, borderRadius: radii.image, backgroundColor: c.mist, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  productName: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22, color: c.ink },
  grade: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  tier: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 21, color: c.ink, flexShrink: 1 },
  best: { alignSelf: 'flex-start', borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 4 },
  bestText: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18 },
  outline: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: radii.card, borderWidth: 2, borderColor: c.accent },
  table: { paddingVertical: 8, gap: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10 },
  divided: { borderTopWidth: 1, borderTopColor: c.divider },
  name: { flex: 1.25, minWidth: 0 },
  value: { flex: 1, textAlign: 'center' },
  head: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 20, color: c.textSecondary },
  nutrient: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 21, color: c.ink },
  body: { fontFamily: fonts.body, ...typeScale.body, color: c.ink },
  allergenLine: { gap: 4, paddingVertical: 10 },
  note: { fontFamily: fonts.body, ...typeScale.caption, color: c.muted, textAlign: 'center' },
});
