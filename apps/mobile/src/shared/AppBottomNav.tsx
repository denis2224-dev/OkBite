import { useEffect, useState } from 'react';
import { Keyboard, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { ro } from '../copy/ro';
import { useTheme } from '../theme/useTheme';
import { Icon, type IconName } from '../ui/Icon';
import { radii, shadows } from '../theme/tokens';
import { PressableOpacity } from './PressableOpacity';

type TabName = 'history' | 'compare' | 'index' | 'allergies' | 'profile';
const items: { name: TabName; label: string }[] = [
 { name: 'history', label: ro.nav.history }, { name: 'compare', label: ro.nav.compare }, { name: 'index', label: ro.nav.scan },
 { name: 'allergies', label: ro.nav.allergies }, { name: 'profile', label: ro.nav.profile },
];

const icons: Record<TabName, IconName> = { history: 'clock', compare: 'swap', index: 'scan', allergies: 'shield', profile: 'user' };

export function AppBottomNav({ state, emitter, navigateToTab, insets }: BottomTabBarProps) {
 const { colors } = useTheme();
 const [keyboard, setKeyboard] = useState(false);
 useEffect(() => {
  const show = Keyboard.addListener('keyboardDidShow', () => setKeyboard(true));
  const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(false));
  return () => { show.remove(); hide.remove(); };
 }, []);
 if (keyboard) return null;
 // CALM floating bar, icons only (names are the accessibility labels). It stays in layout flow, so no screen content hides behind it.
 // The current tab differs by icon colour only (bright green accent); there is no dot.
 return <View testID="nav-bar" style={{ backgroundColor: colors.ground, paddingHorizontal: 14, paddingTop: 30, paddingBottom: Math.max(18, insets.bottom) }}>
  <View testID="nav-pill" accessibilityRole="tablist" style={{ height: 78, borderRadius: radii.nav, backgroundColor: colors.surface, boxShadow: shadows.nav, flexDirection: 'row', alignItems: 'center', width: '100%', maxWidth: 480, alignSelf: 'center' }}>
   {items.map(item => {
    const route = state.routes.find(value => value.name === item.name);
    if (!route) return null;
    // Settings and About are routes without a tab, so while they are open nothing here is selected.
    const selected = state.routes[state.index]?.key === route.key;
    const scan = item.name === 'index';
    return <PressableOpacity key={route.key} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected }} aria-selected={selected}
     onPress={() => { const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true }); if (!selected && !event.defaultPrevented) navigateToTab(route.key); }}
     onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
     style={{ flex: 1, minWidth: 0, minHeight: 60, alignItems: 'center', justifyContent: 'center' }}>
     {scan
      ? <View testID="nav-icon-index" style={{ width: 60, height: 60, borderRadius: 30, marginTop: -30, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, boxShadow: shadows.primaryGlow }}>
       <Icon name="scan" size={24} color={colors.onPrimary} />
      </View>
      : <View testID={`nav-icon-${item.name}`} style={{ width: 44, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.transparent }}>
       <Icon name={icons[item.name]} size={22} color={selected ? colors.accent : colors.muted} />
      </View>}
    </PressableOpacity>;
   })}
  </View>
 </View>;
}
