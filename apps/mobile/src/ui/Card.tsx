import { View, type ViewProps } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { radii } from '../theme/tokens';
import { depth } from '../theme/depth';
/** Raised ivory card: no border, the soft shadow pair lifts it off the page. */
export function Card({ style, ...props }: ViewProps) { const { colors } = useTheme(); return <View {...props} style={[{ backgroundColor: colors.surface, borderRadius: radii.card, borderWidth: 0, padding: 18, gap: 12, ...depth.raised }, style]} />; }
