import type { PropsWithChildren } from 'react';
import { StyleSheet, Text, View, type PressableProps, type ViewProps } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Card } from '../ui/Card';
import { PressableOpacity } from './PressableOpacity';
import { homeTheme as t, useHomeTheme } from '../theme/home';

const paths = {
  sun: 'M12 1v2M12 21v2M1 12h2M21 12h2M4 4l2 2M18 18l2 2M4 20l2-2M18 6l2-2',
  moon: 'M20.9 13a9 9 0 0 1-9.9-9.9A9 9 0 1 0 20.9 13z',
  trash: 'M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12',
  close: 'M6 6l12 12M18 6L6 18',
  back: 'M15 5l-7 7 7 7',
  swap: 'M7 7h12l-3-3M17 17H5l3 3',
  logo: 'M3 12.5L12 3.5h8.5V12L11.5 21z',
  sliders: 'M4 7h10M18 7h2M4 17h4M12 17h8',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4z',
  bars: 'M5 20V10M12 20V4M19 20v-7',
  scan: 'M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10',
  home: 'M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z',
  clock: 'M12 8v4l3 2',
  offline: 'M3 3l18 18M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5-2.7M14 10.3A10 10 0 0 1 19 13M2 9.5a15 15 0 0 1 4-2.4M10.5 6.1A15 15 0 0 1 22 9.5',
} as const;
export function HomeIcon({ name, size = 24, color, strokeWidth = 2 }: { name: keyof typeof paths; size?: number; color?: string; strokeWidth?: number }) {
  const theme = useHomeTheme();
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? theme.colors.primary} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <Path d={paths[name]} />
    {name === 'logo' && <Circle cx={16} cy={8} r={1.6} />}
    {name === 'sun' && <Circle cx={12} cy={12} r={4} />}
    {name === 'camera' && <Circle cx={12} cy={13} r={3.5} />}
    {name === 'clock' && <Circle cx={12} cy={12} r={8} />}
    {name === 'sliders' && <><Circle cx={16} cy={7} r={2} /><Circle cx={10} cy={17} r={2} /></>}
  </Svg>;
}
export function HomePressable({ label, ...props }: PressableProps & { label: string }) {
 return <PressableOpacity {...props} accessibilityRole={props.accessibilityRole ?? 'button'} accessibilityLabel={label} />;
}
export function HomeCard({ style, ...props }: ViewProps) {
  const theme = useHomeTheme();
  return <Card {...props} style={[s.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.cardBorder }, style]} />;
}
export function HomeChip({ children, background, color, minWidth }: PropsWithChildren<{ background: string; color: string; minWidth?: number }>) {
  return <View style={[s.chip, { backgroundColor: background, minWidth }]}><Text style={[s.chipText, { color }]}>{children}</Text></View>;
}
const s = StyleSheet.create({
  target: { minHeight: 44 },
  focus: { outlineWidth: 3, outlineColor: t.colors.focus, outlineOffset: 2, outlineStyle: 'solid' },
  card: { backgroundColor: t.colors.surface, borderWidth: 1, borderColor: t.colors.cardBorder, borderRadius: 20, padding: 16, gap: 0 },
  chip: { minHeight: 30, paddingVertical: 4, paddingHorizontal: 12, borderRadius: 999, justifyContent: 'center', alignItems: 'center' },
  chipText: { fontFamily: t.fonts.bold, fontSize: 13, lineHeight: 18.85 },
  nav: { backgroundColor: t.colors.surface, borderTopWidth: 1, borderTopColor: t.colors.cardBorder, paddingTop: 6, paddingHorizontal: 8, paddingBottom: 12, flexDirection: 'row' },
  tab: { flex: 1, minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabText: { fontFamily: t.fonts.bold, fontSize: 12, lineHeight: 17.4 },
});
