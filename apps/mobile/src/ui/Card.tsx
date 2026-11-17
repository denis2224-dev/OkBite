import { View, type ViewProps } from 'react-native';
import { useTheme } from '../theme/useTheme';
import { radii } from '../theme/tokens';
/** Flat ivory card on the page: a 1 px border, no shadow. */
export function Card({ style, ...props }: ViewProps) { const { colors } = useTheme(); return <View {...props} style={[{ backgroundColor: colors.surface, borderRadius: radii.card, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 12 }, style]} />; }
