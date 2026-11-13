import { useEffect, useState } from 'react';
import { Keyboard, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { ro } from '../copy/ro';
import { fonts } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { HomeIcon } from './HomeChrome';
import { NavLabel } from './NavLabel';
import { PressableOpacity } from './PressableOpacity';

type TabName = 'history' | 'compare' | 'index' | 'allergies' | 'profile';
// How far the Scan circle rises above the bar's top edge; it stays inside the bar's own bounds so Android still delivers its touches.
const RAISE = 22;
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
 // Remain in layout flow: the bar reserves its full height, including scaled labels and the raised Scan circle.
 return <View style={{ backgroundColor: colors.ground }}>
  <View pointerEvents="none" style={{ position: 'absolute', top: RAISE, left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.border }} />
  <View accessibilityRole="tablist" style={{ flexDirection: 'row', alignItems: 'flex-end', width: '100%', maxWidth: 560, alignSelf: 'center',
   paddingHorizontal: 8, paddingBottom: Math.max(8, insets.bottom) }}>
   {items.map(item => {
    const route = state.routes.find(value => value.name === item.name);
    if (!route) return null;
    // Settings and About are routes without a tab, so while they are open nothing here is selected.
    const selected = state.routes[state.index]?.key === route.key;
    const scan = item.name === 'index';
    // Flat tabs: the current page gets a soft pill; a hovered tab gets a light tint so pointer users see it is clickable.
    const indicator = selected ? colors.mint : hovered === item.name ? colors.soft : colors.transparent;
    return <PressableOpacity key={route.key} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected }} aria-selected={selected}
     onPress={() => { const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true }); if (!selected && !event.defaultPrevented) navigateToTab(route.key); }}
     onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
     onHoverIn={() => setHovered(item.name)} onHoverOut={() => setHovered(current => (current === item.name ? null : current))}
     style={{ flex: 1, minWidth: 0, minHeight: 56, paddingHorizontal: 2, paddingTop: scan ? 0 : 8, paddingBottom: 4, borderRadius: 16, gap: scan ? 2 : 4, alignItems: 'center' }}>
     {scan
      ? <View testID="nav-icon-index" style={{ width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary }}>
       <TabIcon name="index" color={colors.onPrimary} />
      </View>
      : <View testID={`nav-icon-${item.name}`} style={{ width: 56, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: indicator }}>
       <TabIcon name={item.name} color={selected ? colors.primary : colors.muted} />
      </View>}
     <NavLabel style={{ fontFamily: selected ? fonts.bold : fonts.medium, fontSize: 12, lineHeight: 16, color: selected ? colors.primary : colors.muted, textAlign: 'center', alignSelf: 'stretch' }}>{item.label}</NavLabel>
    </PressableOpacity>;
   })}
  </View>
 </View>;
}
