import { type PressableProps, View } from 'react-native';
import { PressableOpacity as Pressable } from '../shared/PressableOpacity';
import { useTheme } from '../theme/useTheme';
import { Body } from './Typography';
import { Icon, type IconName } from './Icon';
import { fonts, light, radii } from '../theme/tokens';
import { depth } from '../theme/depth';

type Variant = 'primary' | 'secondary' | 'ghost' | 'accent';

/** Soft depth: primary is a raised forest pill, secondary a raised ivory pill, ghost stays flat. Pressing pushes the pill in. */
export function buttonSurface(variant: Variant, pressed: boolean) {
  if (variant === 'primary') return pressed ? depth.forestPressed : depth.forest;
  if (variant === 'secondary' || variant === 'accent') return pressed ? depth.pressed : { backgroundColor: variant === 'accent' ? light.accent : light.surface, ...depth.raisedSmall };
  return { backgroundColor: light.transparent };
}
type Props = PressableProps & { children: string; variant?: Variant; icon?: IconName };

export function Button({ children, variant = 'primary', icon, disabled, style, ...props }: Props) {
  const { colors } = useTheme();
  const fg = variant === 'primary' ? colors.onPrimary : variant === 'accent' ? colors.onAccent : colors.primary;
  return <Pressable {...props} disabled={disabled} accessibilityRole="button" accessibilityLabel={props.accessibilityLabel ?? children} accessibilityState={{ disabled: !!disabled }}
    style={state => [{ minHeight: 52, borderRadius: radii.pill, paddingHorizontal: 22, paddingVertical: 14, justifyContent: 'center', borderWidth: 0, opacity: disabled ? 0.45 : 1, ...buttonSurface(variant, state.pressed) },
      typeof style === 'function' ? style(state) : style]}>
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' }}>
      {icon && <Icon name={icon} color={fg} />}
      <Body style={{ color: fg, fontFamily: fonts.medium, textAlign: 'center', flexShrink: 1 }}>{children}</Body>
    </View>
  </Pressable>;
}
