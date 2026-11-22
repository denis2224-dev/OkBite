import { Text, View } from 'react-native';
import { PressableOpacity } from '../shared/PressableOpacity';
import { fonts, radii } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Icon, type IconName } from './Icon';

/** 46 pt mist icon tile, title, chevron. */
export function SettingsRow({ icon, title, onPress, first = false }: { icon: IconName; title: string; onPress: () => unknown; first?: boolean }) {
  const { colors } = useTheme();
  return <PressableOpacity accessibilityRole="button" accessibilityLabel={title} onPress={onPress}
    style={{ minHeight: 66, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 14, borderTopWidth: first ? 0 : 1, borderTopColor: colors.divider }}>
    <View testID="settings-tile" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{ width: 46, height: 46, borderRadius: radii.tile, backgroundColor: colors.mist, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={20} color={colors.primaryDark} />
    </View>
    <Text allowFontScaling style={{ flex: 1, fontFamily: fonts.medium, fontSize: 16, lineHeight: 22, color: colors.ink }}>{title}</Text>
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Icon name="chevron" size={18} color={colors.muted} /></View>
  </PressableOpacity>;
}
