import { type PressableProps, View } from 'react-native';
import { PressableOpacity as Pressable } from '../shared/PressableOpacity';
import { useTheme } from '../theme/useTheme';
import { Body } from './Typography';
import { Icon, type IconName } from './Icon';
import { fonts, radii, type Palette } from '../theme/tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'accent';
/** The flat fill for each variant; pressing only darkens the primary fill. */
export function buttonFill(variant: Variant, pressed: boolean, colors: Palette) {
  if (variant === 'primary') return pressed ? colors.primaryPressed : colors.primary;
  return variant === 'accent' ? colors.accent : variant === 'secondary' ? colors.sageSoft : colors.transparent;
}
type Props = PressableProps & { children: string; variant?: Variant; icon?: IconName };

/** Flat pills, no shadow: pressing darkens the fill (primary) or relies on PressableOpacity's opacity. */
export function Button({ children, variant = 'primary', icon, disabled, style, ...props }: Props) {
  const { colors } = useTheme();
  const fg = variant === 'primary' ? colors.onPrimary : variant === 'accent' ? colors.onAccent : colors.primary;
  return <Pressable {...props} disabled={disabled} accessibilityRole="button" accessibilityLabel={props.accessibilityLabel ?? children} accessibilityState={{ disabled: !!disabled }}
    style={state => [{ minHeight: 52, borderRadius: radii.pill, paddingHorizontal: 20, paddingVertical: 14, justifyContent: 'center', borderWidth: 0, opacity: disabled ? 0.45 : 1, backgroundColor: buttonFill(variant, state.pressed, colors) },
      typeof style === 'function' ? style(state) : style]}>
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' }}>
      {icon && <Icon name={icon} color={fg} />}
      <Body style={{ color: fg, fontFamily: fonts.medium, textAlign: 'center', flexShrink: 1 }}>{children}</Body>
    </View>
  </Pressable>;
}
