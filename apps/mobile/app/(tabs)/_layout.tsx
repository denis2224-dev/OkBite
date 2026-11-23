import { useEffect, useRef } from 'react';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { useProfile } from '../../src/features/profile';
import { ro } from '../../src/copy/ro';
import { AppBottomNav } from '../../src/shared/AppBottomNav';
export const unstable_settings = { initialRouteName: 'index' };
// Back (swipe) returns to the tab or page visited just before.
export const tabBackBehavior = 'history' as const;
// Settings and About are pages on the root stack (app/settings.tsx, app/about.tsx): they slide in and swipe back like every other page.
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
 return <Tabs backBehavior={tabBackBehavior} tabBar={props => <AppBottomNav {...props} />} screenOptions={{ headerShown: false, tabBarHideOnKeyboard: true }}>
  <Tabs.Screen name="history" options={{ title: ro.nav.history }} />
  <Tabs.Screen name="compare" options={{ title: ro.nav.compare }} />
  <Tabs.Screen name="index" options={{ title: ro.nav.scan }} />
  <Tabs.Screen name="profile" options={{ title: ro.nav.profile }} />
 </Tabs>;
}
