import { Text, View } from 'react-native';
import { ro } from '../../copy/ro';
import { formatAmount } from '../../lib/format';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Icon } from '../../ui/Icon';

/** One nutrient value in the comparison table. The better value is primaryDark with a check icon, not colour alone; weight never changes. */
export function CompareCell({ value, unit, better, testID }: { value: number | null; unit: string; better: boolean; testID?: string }) {
  const { colors } = useTheme();
  const text = value === null ? '' : `${formatAmount(value)} ${unit}`;
  return <View testID={testID} accessibilityRole="cell" style={{ flex: 1, minWidth: 0, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 4 }}>
    <Text style={{ flexShrink: 1, textAlign: 'center', fontFamily: fonts.bold, fontSize: 15, lineHeight: 21, color: better ? colors.primaryDark : colors.ink }}>{text}</Text>
    {better && <View accessible accessibilityRole="image" accessibilityLabel={ro.compare.design.betterValue}>
      <Icon name="check" size={14} color={colors.primaryDark} />
    </View>}
  </View>;
}
