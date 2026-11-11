import { useEffect, useState } from 'react';
import { Keyboard, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { ro } from '../copy/ro';
import { fonts } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { HomeIcon } from './HomeChrome';
import { PressableOpacity } from './PressableOpacity';

export function AppBottomNav({ state, emitter, navigateToTab, insets }: BottomTabBarProps) {
 const { colors } = useTheme();
 const [keyboard, setKeyboard] = useState(false);
 useEffect(() => {
  const show = Keyboard.addListener('keyboardDidShow', () => setKeyboard(true));
  const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(false));
  return () => { show.remove(); hide.remove(); };
 }, []);
 const items = [
  { name: 'about', label: ro.nav.about }, { name: 'history', label: ro.nav.history },
  { name: 'index', label: ro.nav.scan }, { name: 'profile', label: ro.nav.profile }, { name: 'settings', label: ro.nav.settings },
 ];
 if (keyboard) return null;
 // Remain in layout flow: the floating bar reserves its full height, including scaled labels.
 return <View style={{ paddingTop: 4, paddingHorizontal: 12, paddingBottom: Math.max(12, insets.bottom), backgroundColor: colors.ground }}>
  <View accessibilityRole="tablist" style={{ flexDirection: 'row', width: '100%', maxWidth: 560, alignSelf: 'center', position: 'relative', paddingHorizontal: 4 }}>
   <View pointerEvents="none" style={{ position: 'absolute', top: 24, left: 0, right: 0, bottom: 0, borderRadius: 28, backgroundColor: colors.surface }} />
   {items.map(item => {
    const route = state.routes.find(value => value.name === item.name);
    if (!route) return null;
    const selected = state.routes[state.index]?.key === route.key;
    const color = selected ? colors.primary : colors.muted;
    const scan = item.name === 'index';
    return <PressableOpacity key={route.key} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected }} aria-selected={selected}
     onPress={() => { const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true }); if (!selected && !event.defaultPrevented) navigateToTab(route.key); }}
     onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
     style={{ flex: 1, minWidth: 0, minHeight: 56, paddingHorizontal: 2, paddingTop: scan ? 4 : 28, paddingBottom: 12, borderRadius: 20, gap: 4, alignItems: 'center' }}>
     <View style={scan ? { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? colors.primary : colors.soft } : { height: 28, justifyContent: 'center' }}>
      {scan || item.name === 'history' ? <HomeIcon name={scan ? 'scan' : 'clock'} color={scan && selected ? colors.onPrimary : color} /> :
       <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {item.name === 'profile' ? <><Circle cx={12} cy={7} r={4}/><Path d="M4 21v-2a8 8 0 0 1 16 0v2"/></> :
         item.name === 'about' ? <><Circle cx={12} cy={12} r={9}/><Path d="M12 11v6M12 7h.01"/></> : <><Circle cx={12} cy={12} r={4}/><Path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/></>}
       </Svg>}
     </View>
     <Text style={{ fontFamily: fonts.bold, fontSize: 11, lineHeight: 16, color, textAlign: 'center', alignSelf: 'stretch' }}>{item.label}</Text>
    </PressableOpacity>;
   })}
  </View>
 </View>;
}
