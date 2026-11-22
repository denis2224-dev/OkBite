import type { PropsWithChildren } from 'react';
import { Text, View } from 'react-native';
import { Card } from '../../ui';
import { fonts } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

/** A small grey group label over one white rounded card of rows. */
export function SettingsGroup({ label, children }: PropsWithChildren<{ label: string }>) {
  const { colors } = useTheme();
  return <View style={{ gap: 8 }}>
    <Text accessibilityRole="header" allowFontScaling style={{ marginLeft: 6, fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.muted }}>{label}</Text>
    <Card style={{ paddingVertical: 2, paddingHorizontal: 14, gap: 0, borderRadius: 20 }}>{children}</Card>
  </View>;
}
