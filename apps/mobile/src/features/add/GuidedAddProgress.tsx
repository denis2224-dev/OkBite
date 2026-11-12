import { StyleSheet, View } from 'react-native';
import { ro } from '../../copy/ro';
import { fonts, spacing } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { Body } from '../../ui/Typography';

export function GuidedAddProgress({ step, total }: { step: number; total: number }) {
  const { colors } = useTheme();
  const label = ro.add.stepOf(step, total);
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, now: step, max: total, text: label }}
      style={styles.progress}
    >
      <Body style={[styles.label, { color: colors.muted }]}>{label}</Body>
      <View style={styles.track} aria-hidden>
        {Array.from({ length: total }, (_, index) => (
          <View
            key={index}
            style={[styles.segment, { backgroundColor: index < step ? colors.primary : colors.border }]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  progress: { gap: spacing.sm },
  label: { fontFamily: fonts.bold },
  track: { flexDirection: 'row', gap: spacing.xs },
  segment: { flex: 1, height: 5, borderRadius: 3 },
});
