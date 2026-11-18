import { StyleSheet } from 'react-native';
import { PressableOpacity as Pressable } from '../../shared/PressableOpacity';
import { depth } from '../../theme/depth';
import { fonts, radii } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Icon } from '../../ui/Icon';
import { Body } from '../../ui/Typography';

type Props = { text: string; selected: boolean; disabled: boolean; onPress: () => unknown; role?: 'checkbox' | 'button' };

/** Soft-depth chip with a forest label. Unselected: raised cream pill. Selected: pressed-in cream with a check icon. */
export function ToggleChip({ text, selected, disabled, onPress, role = 'checkbox' }: Props) {
  const { colors } = useTheme();
  const fg = colors.primary;
  const accessibilityState = role === 'button' ? { selected, disabled } : { checked: selected, selected, disabled };
  return (
    <Pressable accessibilityRole={role} aria-pressed={role === 'button' ? selected : undefined} accessibilityLabel={text}
      accessibilityState={accessibilityState} disabled={disabled} onPress={onPress}
      style={[styles.chip, selected ? depth.pressed : { backgroundColor: colors.cream, ...depth.raisedSmall },
        { opacity: disabled ? 0.6 : 1 }]}>
      {selected && <Icon name="check" size={16} color={fg} />}
      <Body style={{ color: fg, fontFamily: fonts.medium, flexShrink: 1 }}>{text}</Body>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { minHeight: 48, maxWidth: '100%', paddingHorizontal: 24, paddingVertical: 12, borderRadius: radii.pill, borderWidth: 0,
    flexDirection: 'row', alignItems: 'center', gap: 6 },
});
