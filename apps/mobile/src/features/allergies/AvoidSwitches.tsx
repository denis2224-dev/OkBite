import { StyleSheet, View } from 'react-native';
import type { AvoidKey } from '@okbite/shared';
import { ro } from '../../copy/ro';
import { PressableOpacity as Pressable } from '../../shared/PressableOpacity';
import { softShadow } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Card } from '../../ui/Card';
import { Body } from '../../ui/Typography';

export const AVOID_KEYS: readonly AvoidKey[] = ['added_sugar', 'sweeteners', 'ultra_processed', 'colourings', 'palm_oil'];

type Props = { selected: readonly AvoidKey[]; disabled: boolean; onToggle: (key: AvoidKey) => unknown };

/** "Avoid" preferences as label + switch rows in one flat card, with hairline dividers. */
export function AvoidSwitches({ selected, disabled, onToggle }: Props) {
  const { colors } = useTheme();
  return (
    <Card testID="avoid-card" style={styles.card}>
      {AVOID_KEYS.map((key, index) => {
        const on = selected.includes(key);
        return (
          <Pressable key={key} accessibilityRole="switch" accessibilityLabel={ro.profile[key]}
            accessibilityState={{ checked: on, disabled }} disabled={disabled} onPress={() => onToggle(key)}
            style={[styles.row, { borderTopWidth: index ? 1 : 0, borderTopColor: colors.divider, opacity: disabled ? 0.6 : 1 }]}>
            <Body style={{ flex: 1 }}>{ro.profile[key]}</Body>
            <View testID={`avoid-track-${key}`} style={[styles.track, on
              ? { backgroundColor: colors.primary, borderColor: colors.primary, alignItems: 'flex-end' }
              : { backgroundColor: colors.sageSoft, borderColor: colors.border, alignItems: 'flex-start' }]}>
              {/* White thumb in both states, lifted only by the shared soft shadow. */}
              <View testID={`avoid-thumb-${key}`} style={[styles.knob, softShadow, { backgroundColor: colors.onPrimary }]} />
            </View>
          </Pressable>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: 0, gap: 0 },
  row: { minHeight: 56, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  track: { width: 52, height: 32, borderRadius: 16, padding: 4, borderWidth: 1, justifyContent: 'center' },
  knob: { width: 22, height: 22, borderRadius: 11 },
});
