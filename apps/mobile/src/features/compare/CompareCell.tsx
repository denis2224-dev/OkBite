import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ro } from '../../copy/ro';
import { formatAmount } from '../../lib/format';
import { useHomeTheme, type HomeTheme } from '../../theme/home';
import { Icon } from '../../ui/Icon';

/** One nutrient value in the comparison table. The better value gets a check icon, not colour alone. */
export function CompareCell({ value, unit, better, testID }: { value: number | null; unit: string; better: boolean; testID?: string }) {
  const theme = useHomeTheme();
  const s = useMemo(() => createStyles(theme), [theme]);
  const text = value === null ? '' : `${formatAmount(value)} ${unit}`;
  return <View testID={testID} accessibilityRole="cell" style={[s.cell, better && s.favorable]}>
    <Text style={[s.value, better && s.favorableText]}>{text}</Text>
    {better && <View accessible accessibilityRole="image" accessibilityLabel={ro.compare.design.betterValue}>
      <Icon name="check" size={14} color={theme.colors.favorable} />
    </View>}
  </View>;
}

const createStyles = (t: HomeTheme) => StyleSheet.create({
  cell: { flex: 1, minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 4, borderRadius: 10, overflow: 'hidden' },
  value: { flexShrink: 1, textAlign: 'center', fontFamily: t.fonts.semibold, fontSize: 15, lineHeight: 21.75, color: t.colors.ink },
  favorable: { backgroundColor: t.colors.favorableBg },
  favorableText: { color: t.colors.favorable, fontFamily: t.fonts.extra },
});
