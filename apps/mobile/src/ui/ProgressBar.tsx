import { View } from 'react-native';
import { radii, shadows } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

/** Pill track with an inset shadow and an accent fill (12 pt; 8 for nutrient bars). No percent label. */
export function ProgressBar({ value, height = 12, testID, label }: { value: number; height?: number; testID?: string; label?: string }) {
  const { colors } = useTheme();
  const now = Math.max(0, Math.min(100, Math.round(value)));
  return <View testID={testID} accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now }}
    style={{ height, borderRadius: radii.pill, backgroundColor: colors.track, boxShadow: shadows.inset, overflow: 'hidden' }}>
    <View testID={testID ? `${testID}-fill` : undefined} style={{ height: '100%', width: `${now}%`, borderRadius: radii.pill, backgroundColor: colors.accent }} />
  </View>;
}
