import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ro } from '../../copy/ro';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { PressableOpacity } from '../../shared/PressableOpacity';
import { SwipeSheet } from '../../ui';
import { ResultIcon } from '../product/ResultIcon';

export type Category = { slug: string; name: string; count: number };
type Props = { categories: readonly Category[]; value: string | null; onChange: (slug: string | null) => void };

/** A small filter at the end of the "Scanate recent" line: it shows the chosen product type and opens the list of types. */
export function CategoryFilter({ categories, value, onChange }: Props) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const current = categories.find(category => category.slug === value)?.name ?? ro.compare.filterAll;
  const choose = (slug: string | null) => { onChange(slug); setOpen(false); };
  const row = (key: string, label: string, selected: boolean, onPress: () => void, count?: number) =>
    <PressableOpacity key={key} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} onPress={onPress}
      style={[styles.row, { backgroundColor: selected ? colors.primary : colors.transparent }]}>
      <Text allowFontScaling style={[styles.rowText, { color: selected ? colors.onPrimary : colors.ink }]}>{label}</Text>
      {count !== undefined && <Text allowFontScaling style={[styles.count, { color: selected ? colors.onPrimary : colors.muted }]}>{count}</Text>}
    </PressableOpacity>;
  return <>
    <PressableOpacity accessibilityRole="button" accessibilityLabel={ro.compare.filterLabel(current)} accessibilityState={{ expanded: open }} hitSlop={6}
      onPress={() => setOpen(true)} style={[styles.pill, { backgroundColor: value ? colors.primary : colors.divider }]}>
      <Text numberOfLines={1} allowFontScaling style={[styles.pillText, { color: value ? colors.onPrimary : colors.primary }]}>{current}</Text>
      <ResultIcon name="chevronDown" size={14} color={value ? colors.onPrimary : colors.primary} />
    </PressableOpacity>
    {open && <SwipeSheet testID="category-sheet" label={ro.compare.filterTitle} backdropCloses backdropLabel={ro.app.close} onClose={() => setOpen(false)}
      contentStyle={styles.sheetContent}>
      <Text accessibilityRole="header" allowFontScaling style={[styles.title, { color: colors.ink }]}>{ro.compare.filterTitle}</Text>
      <View style={styles.list}>
        {row('all', ro.compare.filterAll, value === null, () => choose(null))}
        {categories.map(category => row(category.slug, category.name, value === category.slug, () => choose(category.slug), category.count))}
      </View>
    </SwipeSheet>}
  </>;
}

const styles = StyleSheet.create({
  pill: { minHeight: 32, maxWidth: 170, paddingHorizontal: 12, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6 },
  pillText: { flexShrink: 1, fontFamily: fonts.bold, fontSize: 13, lineHeight: 18 },
  sheetContent: { paddingHorizontal: 12, paddingTop: 4, paddingBottom: 40, gap: 0 },
  title: { fontFamily: fonts.heading, fontSize: 18, lineHeight: 24, paddingHorizontal: 8, paddingBottom: 8 },
  list: { gap: 4 },
  row: { minHeight: 48, paddingHorizontal: 12, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rowText: { flex: 1, fontFamily: fonts.bold, fontSize: 15, lineHeight: 21 },
  count: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 19 },
});
