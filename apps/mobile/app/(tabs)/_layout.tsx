import { Tabs } from 'expo-router';
import { ro } from '../../src/copy/ro';
import { AppBottomNav } from '../../src/shared/AppBottomNav';
export const unstable_settings = { initialRouteName: 'index' };
// Settings and About stay routes (deep links keep working) but have no tab; they open from rows in Profil.
export default function TabLayout() {
 return <Tabs tabBar={props => <AppBottomNav {...props} />} screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true }}>
  <Tabs.Screen name="history" options={{ title: ro.nav.history }} />
  <Tabs.Screen name="compare" options={{ title: ro.nav.compare }} />
  <Tabs.Screen name="index" options={{ title: ro.nav.scan }} />
  <Tabs.Screen name="allergies" options={{ title: ro.nav.allergies }} />
  <Tabs.Screen name="profile" options={{ title: ro.nav.profile }} />
  <Tabs.Screen name="settings" options={{ title: ro.nav.settings }} />
  <Tabs.Screen name="about" options={{ title: ro.nav.about }} />
 </Tabs>;
}
