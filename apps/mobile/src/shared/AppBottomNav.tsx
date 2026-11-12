import { useEffect, useState } from 'react';
import { Keyboard, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { ro } from '../copy/ro';
import { fonts } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { HomeIcon } from './HomeChrome';
import { PressableOpacity } from './PressableOpacity';

type TabName = 'about' | 'history' | 'index' | 'profile' | 'settings';

function TabIcon({ name, color }: { name: TabName; color: string }) {
 if (name === 'index' || name === 'history') return <HomeIcon name={name === 'index' ? 'scan' : 'clock'} size={24} color={color} />;
 return <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
  {name === 'profile' ? <><Circle cx={12} cy={7} r={4}/><Path d="M4 21v-2a8 8 0 0 1 16 0v2"/></> :
   name === 'about' ? <><Circle cx={12} cy={12} r={9}/><Path d="M12 11v6M12 7h.01"/></> : <><Circle cx={12} cy={12} r={4}/><Path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/></>}
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
 const items: { name: TabName; label: string }[] = [
  { name: 'about', label: ro.nav.about }, { name: 'history', label: ro.nav.history },
  { name: 'index', label: ro.nav.scan }, { name: 'profile', label: ro.nav.profile }, { name: 'settings', label: ro.nav.settings },
 ];
 if (keyboard) return null;
 // Remain in layout flow: the floating bar reserves its full height, including scaled labels.
 return <View style={{ paddingTop: 4, paddingHorizontal: 12, paddingBottom: Math.max(12, insets.bottom), backgroundColor: colors.ground }}>
  <View accessibilityRole="tablist" style={{ flexDirection: 'row', width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 4, paddingVertical: 6,
   borderRadius: 28, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}>
   {items.map(item => {
    const route = state.routes.find(value => value.name === item.name);
    if (!route) return null;
    const selected = state.routes[state.index]?.key === route.key;
    // The current page gets a filled pill; a hovered tab gets a light tint so pointer users see it is clickable.
    const indicator = selected ? colors.primary : hovered === item.name ? colors.soft : colors.transparent;
    return <PressableOpacity key={route.key} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected }} aria-selected={selected}
     onPress={() => { const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true }); if (!selected && !event.defaultPrevented) navigateToTab(route.key); }}
     onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
     onHoverIn={() => setHovered(item.name)} onHoverOut={() => setHovered(current => (current === item.name ? null : current))}
     style={{ flex: 1, minWidth: 0, minHeight: 56, paddingHorizontal: 2, paddingVertical: 4, borderRadius: 20, gap: 4, alignItems: 'center' }}>
     <View testID={`nav-icon-${item.name}`} style={{ width: 56, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: indicator }}>
      <TabIcon name={item.name} color={selected ? colors.onPrimary : colors.muted} />
     </View>
     <Text style={{ fontFamily: selected ? fonts.bold : fonts.medium, fontSize: 11, lineHeight: 16, color: selected ? colors.primary : colors.muted, textAlign: 'center', alignSelf: 'stretch' }}>{item.label}</Text>
    </PressableOpacity>;
   })}
  </View>
 </View>;
}
