import { View, type PressableProps } from 'react-native';
import { PressableOpacity } from '../shared/PressableOpacity';
import { useTheme } from '../theme/useTheme';
import { fonts } from '../theme/tokens';
import { Body } from './Typography';
import { Icon, type IconName } from './Icon';

/** A navigation row: optional leading icon, label, optional hint and a trailing chevron. */
export function LinkRow({ label, hint, icon, last = false, ...props }: PressableProps & { label: string; hint?: string; icon?: IconName; last?: boolean }) {
  const { colors } = useTheme();
  return <PressableOpacity {...props} accessibilityRole="button" accessibilityLabel={label}
    style={{ minHeight: 56, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: last ? 0 : 1, borderColor: colors.divider }}>
    {icon ? <View testID="link-row-icon" style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.mint }}>
      <Icon name={icon} size={20} color={colors.primary} />
    </View> : null}
    <View style={{ flex: 1, minWidth: 0 }}>
      <Body style={{ fontFamily: fonts.bold }}>{label}</Body>
      {hint ? <Body style={{ fontSize: 13, lineHeight: 19, color: colors.muted }}>{hint}</Body> : null}
    </View>
    <Icon name="arrow" size={20} color={colors.muted} />
  </PressableOpacity>;
}
