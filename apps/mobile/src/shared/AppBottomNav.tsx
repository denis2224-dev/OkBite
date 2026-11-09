import { useEffect, useState } from 'react';
import { Keyboard, Text, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { ro } from '../copy/ro';
import { fonts } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';
import { HomeIcon } from './HomeChrome';
import { PressableOpacity } from './PressableOpacity';
const items = [
 { name: 'index', label: ro.nav.home, icon: 'home' },
 { name: 'compare', label: ro.nav.compare, icon: 'bars' },
 { name: 'history', label: ro.nav.history, icon: 'clock' },
] as const;
export function AppBottomNav({ state, emitter, navigateToTab, insets }: BottomTabBarProps) {
 const { colors } = useTheme();
 const [keyboard, setKeyboard] = useState(false);
 useEffect(() => {
  const show = Keyboard.addListener('keyboardDidShow', () => setKeyboard(true));
  const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(false));
  return () => { show.remove(); hide.remove(); };
 }, []);
 const current = state.routes[state.index];
 if (keyboard || (current?.name === 'compare' && (current.params as { id?: string } | undefined)?.id)) return null;
 return <View accessibilityRole="tablist" style={{ backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 6, paddingHorizontal: 8, paddingBottom: Math.max(12, insets.bottom), alignItems: 'center' }}>
  <View style={{ flexDirection: 'row', width: '100%', maxWidth: 430 }}>{items.map(item => {
   const route = state.routes.find(value => value.name === item.name);
   if (!route) return null;
   const selected = current?.key === route.key;
   const color = selected ? colors.primary : colors.muted;
   return <PressableOpacity key={route.key} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected }}
    onPress={() => { const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true }); if (!selected && !event.defaultPrevented) navigateToTab(route.key); }}
    onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
    style={{ flex: 1, minHeight: 52, paddingVertical: 4, borderRadius: 14, gap: 2, alignItems: 'center', justifyContent: 'center' }}>
    <HomeIcon name={item.icon} size={24} color={color} /><Text style={{ fontFamily: fonts.bold, fontSize: 12, lineHeight: 17.4, color, textAlign: 'center' }}>{item.label}</Text>
   </PressableOpacity>;
  })}</View>
 </View>;
}
