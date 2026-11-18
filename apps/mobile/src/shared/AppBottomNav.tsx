import { useEffect, useState } from 'react';
import { Keyboard, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { ro } from '../copy/ro';
import { useTheme } from '../theme/useTheme';
import { fonts } from '../theme/tokens';
import { depth } from '../theme/depth';
import { HomeIcon } from './HomeChrome';
import { PressableOpacity } from './PressableOpacity';

type TabName = 'history' | 'compare' | 'index' | 'allergies' | 'profile';
const items: { name: TabName; label: string }[] = [
 { name: 'history', label: ro.nav.history }, { name: 'compare', label: ro.nav.compare }, { name: 'index', label: ro.nav.scan },
 { name: 'allergies', label: ro.nav.allergies }, { name: 'profile', label: ro.nav.profile },
];

function TabIcon({ name, color }: { name: TabName; color: string }) {
 if (name !== 'allergies' && name !== 'profile') return <HomeIcon name={name === 'index' ? 'scan' : name === 'history' ? 'clock' : 'swap'} size={24} color={color} />;
 return <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
  {name === 'profile' ? <><Circle cx={12} cy={7} r={4}/><Path d="M4 21v-2a8 8 0 0 1 16 0v2"/></> : <Path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6zM9 12l2 2 4-4"/>}
 </Svg>;
}

export function AppBottomNav({ state, emitter, navigateToTab, insets }: BottomTabBarProps) {
 const { colors } = useTheme();
 const [keyboard, setKeyboard] = useState(false);
 const [hovered, setHovered] = useState<string | null>(null);
 useEffect(() => {
  const show = Keyboard.addListener('keyboardDidShow', () => setKeyboard(true));
  const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(false));
  return () => { show.remove(); hide.remove(); };
 }, []);
 if (keyboard) return null;
 // A raised ivory bar with each tab's name under its icon. Scan sits above the bar as a raised forest button;
 // the current tab is pressed into a sage pill. It stays in layout flow, so content never hides behind it.
 return <View testID="nav-bar" style={{ backgroundColor: colors.ground, alignItems: 'center', paddingHorizontal: 16, paddingTop: 30, paddingBottom: Math.max(12, insets.bottom) }}>
  <View testID="nav-pill" accessibilityRole="tablist" style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around',
   width: '100%', maxWidth: 448, paddingHorizontal: 6, paddingVertical: 8, borderRadius: 30, backgroundColor: colors.surface, ...depth.raised }}>
   {items.map(item => {
    const route = state.routes.find(value => value.name === item.name);
    if (!route) return null;
    // Settings and About are routes without a tab, so while they are open nothing here is selected.
    const selected = state.routes[state.index]?.key === route.key;
    const scan = item.name === 'index';
    const iconStyle = scan
     ? { width: 58, height: 58, borderRadius: 29, marginTop: -30, ...depth.forest }
     : { width: 52, height: 34, borderRadius: 17, ...(selected ? depth.pressed : { backgroundColor: hovered === item.name ? colors.highlightBg : colors.transparent }) };
    const tint = scan ? colors.onPrimary : selected ? colors.primary : colors.muted;
    return <PressableOpacity key={route.key} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected }} aria-selected={selected}
     onPress={() => { const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true }); if (!selected && !event.defaultPrevented) navigateToTab(route.key); }}
     onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
     onHoverIn={() => setHovered(item.name)} onHoverOut={() => setHovered(current => (current === item.name ? null : current))}
     style={{ flex: 1, minWidth: 0, minHeight: 52, alignItems: 'center', justifyContent: 'flex-end', gap: 3, borderRadius: 18 }}>
     <View testID={`nav-icon-${item.name}`} style={{ alignItems: 'center', justifyContent: 'center', ...iconStyle }}>
      <TabIcon name={item.name} color={tint} />
     </View>
     <Text numberOfLines={1} style={{ fontFamily: fonts.body, fontSize: 12, lineHeight: 16, color: scan || selected ? colors.primary : colors.muted }}>{item.label}</Text>
    </PressableOpacity>;
   })}
  </View>
 </View>;
}
