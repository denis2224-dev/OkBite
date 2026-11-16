import { StyleSheet } from 'react-native';
import { PressableOpacity as Pressable } from '../../shared/PressableOpacity';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Icon } from '../../ui/Icon';
import { Body } from '../../ui/Typography';

type Props = { text: string; selected: boolean; disabled: boolean; onPress: () => unknown; role?: 'checkbox' | 'button' };

/** Selected = filled with a check icon, so the state is not shown by colour alone. */
export function ToggleChip({ text, selected, disabled, onPress, role = 'checkbox' }: Props) {
  const { colors } = useTheme();
  const fg = selected ? colors.onPrimary : colors.ink;
  const accessibilityState = role === 'button' ? { selected, disabled } : { checked: selected, selected, disabled };
  return (
    <Pressable accessibilityRole={role} aria-pressed={role === 'button' ? selected : undefined} accessibilityLabel={text}
      accessibilityState={accessibilityState} disabled={disabled} onPress={onPress}
      style={[styles.chip, { backgroundColor: selected ? colors.primary : colors.soft, opacity: disabled ? 0.6 : 1 }]}>
      {selected && <Icon name="check" size={16} color={fg} />}
      <Body style={{ color: fg, fontFamily: selected ? fonts.bold : fonts.medium, flexShrink: 1 }}>{text}</Body>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { minHeight: 44, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22,
    flexDirection: 'row', alignItems: 'center', gap: 6 },
});
