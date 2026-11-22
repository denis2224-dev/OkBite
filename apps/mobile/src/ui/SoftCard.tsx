import { View, type ViewProps } from 'react-native';
import { radii, shadows, spacing } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

/** Raised surface card (radius 24, padding 20). No label slot. */
export function SoftCard({ style, ...props }: ViewProps) {
  const { colors } = useTheme();
  return <View {...props} style={[{ backgroundColor: colors.surface, borderRadius: radii.card, padding: spacing.cardPad, gap: 12, boxShadow: shadows.raised }, style]} />;
}
