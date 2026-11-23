import { TextInput, View } from 'react-native';
import { fonts, radii, shadows } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Icon } from './Icon';

/** 54 pt raised search pill. The sliders icon is decorative (there is no filter) and can be left out with `filterIcon={false}`. */
export function SearchPill({ value, onChangeText, placeholder, testID, filterIcon = true }: { value: string; onChangeText: (text: string) => void; placeholder: string; testID?: string; filterIcon?: boolean }) {
  const { colors } = useTheme();
  return <View testID={testID} style={{ minHeight: 54, borderRadius: radii.pill, backgroundColor: colors.surface, boxShadow: shadows.raisedSm, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18 }}>
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Icon name="search" size={20} color={colors.muted} /></View>
    <TextInput accessibilityLabel={placeholder} placeholder={placeholder} placeholderTextColor={colors.muted} value={value} onChangeText={onChangeText} allowFontScaling
      style={{ flex: 1, minHeight: 44, fontFamily: fonts.body, fontSize: 16, color: colors.ink }} />
    {filterIcon && <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 1, height: 24, backgroundColor: colors.divider }} />
      <Icon name="sliders" size={20} color={colors.muted} />
    </View>}
  </View>;
}
