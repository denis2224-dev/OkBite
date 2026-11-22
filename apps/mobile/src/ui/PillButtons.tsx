import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { PressableOpacity } from '../shared/PressableOpacity';
import { fonts, radii, shadows } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Icon, type IconName } from './Icon';

type Props = { label: string; onPress: () => unknown; icon?: IconName; disabled?: boolean; style?: StyleProp<ViewStyle>; accessibilityLabel?: string; expanded?: boolean };

function Pill({ label, onPress, icon, disabled, style, accessibilityLabel, expanded, primary }: Props & { primary: boolean }) {
  const { colors } = useTheme();
  const fg = primary ? colors.onPrimary : colors.ink;
  return <PressableOpacity accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} accessibilityState={expanded === undefined ? { disabled: !!disabled } : { disabled: !!disabled, expanded }} disabled={disabled} onPress={onPress}
    style={[{ minHeight: 54, borderRadius: radii.pill, paddingHorizontal: 22, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
      primary ? { backgroundColor: colors.primary, boxShadow: shadows.primaryGlow } : { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.divider }, style]}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Text allowFontScaling style={{ color: fg, fontFamily: fonts.medium, fontSize: 16, lineHeight: 22, textAlign: 'center', flexShrink: 1 }}>{label}</Text>
      {icon && <Icon name={icon} size={18} color={fg} />}
    </View>
  </PressableOpacity>;
}

/** 54 pt primary pill with white text and the green glow; optional trailing icon. */
export const PrimaryButton = (props: Props) => <Pill {...props} primary />;
/** 54 pt surface pill with a soft 1.5 divider border, like the allergen chips. */
export const SecondaryButton = (props: Props) => <Pill {...props} primary={false} />;
