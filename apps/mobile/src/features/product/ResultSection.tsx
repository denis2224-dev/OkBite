import type { PropsWithChildren, ReactNode } from 'react';
import { Text, View } from 'react-native';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

/** A result section: a small green heading with a thin line after it (and an optional count or action at the end of the line), then its content. */
export function ResultSection({ title, count, action, children }: PropsWithChildren<{ title: string; count?: number; action?: ReactNode }>) {
  const { colors } = useTheme();
  return <View style={{ gap: 10 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
      <Text accessibilityRole="header" allowFontScaling style={{ fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, letterSpacing: 1.6, textTransform: 'uppercase', color: colors.good }}>{title}</Text>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      {action}
      {count !== undefined && <View style={{ backgroundColor: colors.divider, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
        <Text style={{ fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, color: colors.primary }}>{count}</Text>
      </View>}
    </View>
    {children}
  </View>;
}
