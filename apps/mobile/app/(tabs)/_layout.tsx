import { Tabs } from 'expo-router';
import { ro } from '../../src/copy/ro';
import { AppBottomNav } from '../../src/shared/AppBottomNav';
export default function TabLayout() {
 return <Tabs tabBar={props => <AppBottomNav {...props} />} screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true }}>
  <Tabs.Screen name="index" options={{ title: ro.nav.home }} />
  <Tabs.Screen name="compare" options={{ title: ro.nav.compare }} />
  <Tabs.Screen name="history" options={{ title: ro.nav.history }} />
 </Tabs>;
}
