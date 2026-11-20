import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ro } from '../../copy/ro';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { PressableOpacity } from '../../shared/PressableOpacity';
import { ScreenSafeArea } from '../../shared/ScreenSafeArea';
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
    <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)}>
      <View style={[styles.scrim, { backgroundColor: colors.scrim }]}>
        <PressableOpacity accessibilityRole="button" accessibilityLabel={ro.app.close} onPress={() => setOpen(false)} style={styles.dismiss} />
        <ScreenSafeArea edges={['bottom', 'left', 'right']} accessibilityViewIsModal style={[styles.sheet, { backgroundColor: colors.ground }]}>
          <Text accessibilityRole="header" allowFontScaling style={[styles.title, { color: colors.ink }]}>{ro.compare.filterTitle}</Text>
          <ScrollView contentContainerStyle={styles.list}>
            {row('all', ro.compare.filterAll, value === null, () => choose(null))}
            {categories.map(category => row(category.slug, category.name, value === category.slug, () => choose(category.slug), category.count))}
          </ScrollView>
        </ScreenSafeArea>
      </View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  pill: { minHeight: 32, maxWidth: 170, paddingHorizontal: 12, borderRadius: 999, flexDirection: 'row', alignItems: 'center', gap: 6 },
  pillText: { flexShrink: 1, fontFamily: fonts.bold, fontSize: 13, lineHeight: 18 },
  scrim: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  dismiss: { flex: 1, width: '100%' },
  sheet: { width: '100%', maxWidth: 430, maxHeight: '70%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 18 },
  title: { fontFamily: fonts.heading, fontSize: 18, lineHeight: 24, paddingHorizontal: 20, paddingBottom: 8 },
  list: { paddingHorizontal: 12, paddingBottom: 16, gap: 4 },
  row: { minHeight: 48, paddingHorizontal: 12, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rowText: { flex: 1, fontFamily: fonts.bold, fontSize: 15, lineHeight: 21 },
  count: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 19 },
});
