import { Text } from 'react-native';
import { PressableOpacity } from '../shared/PressableOpacity';
import { fonts, radii } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

/** Multi-select pill. Selecting changes colours only (border stays 1.5, no shadow in either state). */
export function GoalPill({ text, selected, onPress, disabled }: { text: string; selected: boolean; onPress: () => unknown; disabled?: boolean }) {
  const { colors } = useTheme();
  return <PressableOpacity accessibilityRole="checkbox" accessibilityLabel={text} accessibilityState={{ checked: selected, selected, disabled: !!disabled }} disabled={disabled} onPress={onPress}
    style={{ minHeight: 46, borderRadius: radii.pill, paddingHorizontal: 18, paddingVertical: 11, justifyContent: 'center', borderWidth: 1.5,
      borderColor: selected ? colors.primary : colors.sand, backgroundColor: selected ? colors.primary : colors.surface }}>
    <Text allowFontScaling style={{ fontFamily: fonts.medium, fontSize: 15, lineHeight: 20, color: selected ? colors.onPrimary : colors.ink }}>{text}</Text>
  </PressableOpacity>;
}
