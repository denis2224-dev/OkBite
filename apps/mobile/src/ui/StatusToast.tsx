import { Text, View } from 'react-native';
import { fonts, shadows } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Icon } from './Icon';

/** One-line status: a check on success green, an alert on danger, or an info mark on the neutral track. */
export function StatusToast({ title, variant = 'success', testID }: { title: string; variant?: 'success' | 'danger' | 'neutral'; testID?: string }) {
  const { colors } = useTheme();
  const danger = variant === 'danger';
  const neutral = variant === 'neutral';
  return <View testID={testID} accessible accessibilityRole="text" accessibilityLabel={title} accessibilityLiveRegion="polite"
    style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 20, backgroundColor: danger ? colors.dangerBg : neutral ? colors.track : colors.successBg, boxShadow: shadows.raisedSm }}>
    <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: danger ? colors.dangerText : neutral ? colors.textSecondary : colors.primary }}>
      <Icon name={danger ? 'alert' : neutral ? 'info' : 'check'} size={20} color={colors.onPrimary} strokeWidth={2} />
    </View>
    <Text allowFontScaling style={{ flex: 1, fontFamily: fonts.bold, fontSize: 16, lineHeight: 22, color: danger ? colors.dangerText : colors.ink }}>{title}</Text>
  </View>;
}
