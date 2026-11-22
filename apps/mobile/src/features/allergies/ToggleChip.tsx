import { StyleSheet } from 'react-native';
import { PressableOpacity as Pressable } from '../../shared/PressableOpacity';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Body } from '../../ui/Typography';

type Props = { text: string; selected: boolean; disabled: boolean; onPress: () => unknown; role?: 'checkbox' | 'button' };

/** Selected = filled dark green, like the active tab in the bar. Only the colours change: no icon, same size, same weight. The state is also announced. */
export function ToggleChip({ text, selected, disabled, onPress, role = 'checkbox' }: Props) {
  const { colors } = useTheme();
  const fg = selected ? colors.onPrimary : colors.ink;
  const accessibilityState = role === 'button' ? { selected, disabled } : { checked: selected, selected, disabled };
  return (
    <Pressable accessibilityRole={role} aria-pressed={role === 'button' ? selected : undefined} accessibilityLabel={text}
      accessibilityState={accessibilityState} disabled={disabled} onPress={onPress}
      style={[styles.chip, { backgroundColor: selected ? colors.primary : colors.soft }]}>
      <Body style={{ color: fg, fontFamily: fonts.medium, flexShrink: 1 }}>{text}</Body>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { minHeight: 44, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22,
    flexDirection: 'row', alignItems: 'center', gap: 6 },
});
