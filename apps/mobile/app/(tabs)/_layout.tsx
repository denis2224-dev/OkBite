import { useEffect, useRef } from 'react';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { useProfile } from '../../src/features/profile';
import { ro } from '../../src/copy/ro';
import { AppBottomNav } from '../../src/shared/AppBottomNav';
export const unstable_settings = { initialRouteName: 'index' };
export default function TabLayout() {
 const router = useRouter();
 const segments = useSegments();
 const { profile, hydrated } = useProfile();
 const inTabs = segments[0] === '(tabs)';
 const checkedOnboarding = useRef(false);
 useEffect(() => {
  if (!inTabs || !hydrated || checkedOnboarding.current) return;
  checkedOnboarding.current = true;
  if (!profile.onboarded) router.replace('/onboarding');
 }, [inTabs, hydrated, profile.onboarded, router]);
 return <Tabs tabBar={props => <AppBottomNav {...props} />} screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true }}>
  <Tabs.Screen name="about" options={{ title: ro.nav.about }} />
  <Tabs.Screen name="history" options={{ title: ro.nav.history }} />
  <Tabs.Screen name="index" options={{ title: ro.nav.scan }} />
  <Tabs.Screen name="profile" options={{ title: ro.nav.profile }} />
  <Tabs.Screen name="settings" options={{ title: ro.nav.settings }} />
  <Tabs.Screen name="compare" options={{ title: ro.nav.compare }} />
 </Tabs>;
}
