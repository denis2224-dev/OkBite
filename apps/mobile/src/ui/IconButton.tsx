import type { ReactNode } from 'react';
import { View, type PressableProps } from 'react-native';
import { PressableOpacity } from '../shared/PressableOpacity';
import { useTheme } from '../theme/useTheme';
import { radii } from '../theme/tokens';
import { Icon, type IconName } from './Icon';

type Props = Omit<PressableProps, 'children'> & { label: string; icon?: IconName; children?: ReactNode };

/** Back, close, report and other header actions: a 44 pt target around a flat 40 pt sage-soft square with a forest icon. */
export function IconButton({ label, icon, children, disabled, style, ...props }: Props) {
  const { colors } = useTheme();
  return <PressableOpacity {...props} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }}
    style={state => [{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.45 : 1 }, typeof style === 'function' ? style(state) : style]}>
    <View testID="icon-button-face" style={{ width: 40, height: 40, borderRadius: radii.small, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sageSoft }}>
      {icon ? <Icon name={icon} size={22} color={colors.primary} /> : children}
    </View>
  </PressableOpacity>;
}
