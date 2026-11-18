import { View, type PressableProps } from 'react-native';
import { PressableOpacity } from '../shared/PressableOpacity';
import { useTheme } from '../theme/useTheme';
import { fonts, radii } from '../theme/tokens';
import { depth } from '../theme/depth';
import { Body, Caption } from './Typography';
import { Icon, type IconName } from './Icon';

/** A navigation row: optional leading icon, label, optional hint and a trailing chevron. */
export function LinkRow({ label, hint, icon, last = false, ...props }: PressableProps & { label: string; hint?: string; icon?: IconName; last?: boolean }) {
  const { colors } = useTheme();
  return <PressableOpacity {...props} accessibilityRole="button" accessibilityLabel={label}
    style={{ minHeight: 64, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: last ? 0 : 1, borderColor: colors.divider }}>
    {icon ? <View testID="link-row-icon" style={{ width: 44, height: 44, borderRadius: radii.small, alignItems: 'center', justifyContent: 'center', ...depth.sageTile }}>
      <Icon name={icon} size={20} color={colors.primary} />
    </View> : null}
    <View style={{ flex: 1, minWidth: 0 }}>
      <Body style={{ fontFamily: fonts.heading, fontSize: 21, lineHeight: 27, color: colors.ink }}>{label}</Body>
      {hint ? <Caption>{hint}</Caption> : null}
    </View>
    <Icon name="arrow" size={20} color={colors.muted} />
  </PressableOpacity>;
}
