import { Text, View } from 'react-native';
import { fonts, shadows } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { Icon } from './Icon';

/** One-line status: a check on success green, or an alert on danger. */
export function StatusToast({ title, variant = 'success', testID }: { title: string; variant?: 'success' | 'danger'; testID?: string }) {
  const { colors } = useTheme();
  const danger = variant === 'danger';
  return <View testID={testID} accessible accessibilityRole="text" accessibilityLabel={title} accessibilityLiveRegion="polite"
    style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 20, backgroundColor: danger ? colors.dangerBg : colors.successBg, boxShadow: shadows.raisedSm }}>
    <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: danger ? colors.dangerText : colors.primary }}>
      <Icon name={danger ? 'alert' : 'check'} size={20} color={colors.onPrimary} strokeWidth={2} />
    </View>
    <Text allowFontScaling style={{ flex: 1, fontFamily: fonts.bold, fontSize: 16, lineHeight: 22, color: danger ? colors.dangerText : colors.ink }}>{title}</Text>
  </View>;
}
