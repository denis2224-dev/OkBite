import { PressableOpacity } from '../shared/PressableOpacity';
import { shadows } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Icon, type IconName } from './Icon';

/** Raised surface circle (46 pt by default) with a 20 pt stroke icon. */
export function IconCircleButton({ icon, label, onPress, size = 46, disabled }: { icon: IconName; label: string; onPress: () => unknown; size?: number; disabled?: boolean }) {
  const { colors } = useTheme();
  return <PressableOpacity accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
    style={{ width: size, height: size, minHeight: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, boxShadow: shadows.raisedSm }}>
    <Icon name={icon} size={20} color={colors.ink} />
  </PressableOpacity>;
}
