import { StyleSheet } from 'react-native';
import { PressableOpacity as Pressable } from '../../shared/PressableOpacity';
import { fonts, radii } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Icon } from '../../ui/Icon';
import { Body } from '../../ui/Typography';

type Props = { text: string; selected: boolean; disabled: boolean; onPress: () => unknown; role?: 'checkbox' | 'button' };

/** Flat chip, no shadow. Unselected: surface fill with a 1 px border. Selected: forest fill, white label and a check icon. */
export function ToggleChip({ text, selected, disabled, onPress, role = 'checkbox' }: Props) {
  const { colors } = useTheme();
  const fg = selected ? colors.onPrimary : colors.ink;
  const accessibilityState = role === 'button' ? { selected, disabled } : { checked: selected, selected, disabled };
  return (
    <Pressable accessibilityRole={role} aria-pressed={role === 'button' ? selected : undefined} accessibilityLabel={text}
      accessibilityState={accessibilityState} disabled={disabled} onPress={onPress}
      style={[styles.chip, { backgroundColor: selected ? colors.primary : colors.surface,
        borderColor: selected ? colors.primary : colors.border, opacity: disabled ? 0.6 : 1 }]}>
      {selected && <Icon name="check" size={16} color={fg} />}
      <Body style={{ color: fg, fontFamily: selected ? fonts.bold : fonts.medium, flexShrink: 1 }}>{text}</Body>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { minHeight: 44, maxWidth: '100%', paddingHorizontal: 16, paddingVertical: 10, borderRadius: radii.pill, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', gap: 6 },
});
