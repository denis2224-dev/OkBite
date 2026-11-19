import { View, type ViewProps } from 'react-native';
import { radii, shadows, spacing } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

/** CALM soft card: raised surface, radius 24, padding 20. Same look as SoftCard. */
export function Card({ style, ...props }: ViewProps) {
  const { colors } = useTheme();
  return <View {...props} style={[{ backgroundColor: colors.surface, borderRadius: radii.card, padding: spacing.cardPad, gap: 12, boxShadow: shadows.raised }, style]} />;
}
