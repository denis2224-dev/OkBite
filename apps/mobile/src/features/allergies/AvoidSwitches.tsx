import { StyleSheet, View } from 'react-native';
import type { AvoidKey } from '@okbite/shared';
import { ro } from '../../copy/ro';
import { PressableOpacity as Pressable } from '../../shared/PressableOpacity';
import { useTheme } from '../../theme/useTheme';
import { Body } from '../../ui/Typography';

export const AVOID_KEYS: readonly AvoidKey[] = ['added_sugar', 'sweeteners', 'ultra_processed', 'colourings', 'palm_oil'];

type Props = { selected: readonly AvoidKey[]; disabled: boolean; onToggle: (key: AvoidKey) => unknown };

/** "Avoid" preferences as label + switch rows in one card, with hairline dividers. */
export function AvoidSwitches({ selected, disabled, onToggle }: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      {AVOID_KEYS.map((key, index) => {
        const on = selected.includes(key);
        return (
          <Pressable key={key} accessibilityRole="switch" accessibilityLabel={ro.profile[key]}
            accessibilityState={{ checked: on, disabled }} disabled={disabled} onPress={() => onToggle(key)}
            style={[styles.row, { borderTopWidth: index ? 1 : 0, borderTopColor: colors.divider, opacity: disabled ? 0.6 : 1 }]}>
            <Body style={{ flex: 1 }}>{ro.profile[key]}</Body>
            <View style={[styles.track, on
              ? { backgroundColor: colors.primary, borderColor: colors.primary, alignItems: 'flex-end' }
              : { backgroundColor: colors.soft, borderColor: colors.border, alignItems: 'flex-start' }]}>
              {/* On: lime knob on dark green. Off: white knob on the soft track. */}
              <View style={[styles.knob, { backgroundColor: on ? colors.themeSelectedIcon : colors.surface }]} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, paddingHorizontal: 16 },
  row: { minHeight: 56, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  track: { width: 52, height: 32, borderRadius: 16, padding: 4, borderWidth: 1, justifyContent: 'center' },
  knob: { width: 22, height: 22, borderRadius: 11 },
});
