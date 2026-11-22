import { Text, View } from 'react-native';
import { PressableOpacity } from '../shared/PressableOpacity';
import { fonts, radii, shadows } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

type Props = { text: string; selected: boolean; onPress: () => unknown; disabled?: boolean };

/** Pill with a rounded checkbox square. Selecting changes colours only: same size, border width, shadow and font; no check glyph. */
export function CheckboxChip({ text, selected, onPress, disabled }: Props) {
  const { colors } = useTheme();
  return <PressableOpacity accessibilityRole="checkbox" accessibilityLabel={text} accessibilityState={{ checked: selected, selected, disabled: !!disabled }} disabled={disabled} onPress={onPress}
    style={{ minHeight: 44, borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5,
      borderColor: selected ? colors.greenLight : colors.divider, backgroundColor: selected ? colors.chipSelectedBg : colors.surface, boxShadow: shadows.raisedSm }}>
    <View testID="checkbox-box" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{ width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: selected ? colors.primary : colors.checkboxBorder, backgroundColor: selected ? colors.primary : colors.transparent }} />
    <Text allowFontScaling style={{ fontFamily: fonts.medium, fontSize: 15, lineHeight: 20, color: colors.ink, flexShrink: 1 }}>{text}</Text>
  </PressableOpacity>;
}
