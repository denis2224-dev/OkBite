import { Stack, Tabs, router } from 'expo-router';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';
import { AppBottomNav } from '../../src/shared/AppBottomNav';
import { tabBackBehavior } from '../(tabs)/_layout';
import { goBack } from '../../src/shared/EdgeSwipeBack';

jest.mock('../../src/features/profile', () => ({ useProfile: () => ({ profile: { onboarded: true }, hydrated: true }) }));
const page = (name: string) => {
  const Page = () => <Text>{name}</Text>;
  Page.displayName = name;
  return Page;
};
const routes = {
  _layout: () => <Stack screenOptions={{ headerShown: false }} />,
  '(tabs)/_layout': () => <Tabs backBehavior={tabBackBehavior} tabBar={props => <AppBottomNav {...props} />} screenOptions={{ headerShown: false }}>
    {['history', 'compare', 'index', 'allergies', 'profile', 'settings'].map(name => <Tabs.Screen key={name} name={name} />)}
  </Tabs>,
  '(tabs)/index': page('Scan page'), '(tabs)/history': page('History page'), '(tabs)/compare': page('Compare page'),
  '(tabs)/allergies': page('Allergies page'), '(tabs)/profile': page('Profile page'), '(tabs)/settings': page('Settings page'),
};
const tab = (name: string) => screen.getByRole('tab', { name });

// The five nav-bar pages are roots: switching between them leaves nothing to go "back" to,
// so neither the edge swipe, the browser back swipe nor Android's back gesture returns to the previous tab.
it('switching tabs leaves no back step between nav-bar pages', async () => {
  await renderRouter(routes, { initialUrl: '/' });
  await fireEvent.press(tab('Istoric'));
  await fireEvent.press(tab('Compară'));
  expect(screen).toHavePathname('/compare');
  expect(router.canGoBack()).toBe(false);
  await act(() => goBack());
  expect(screen).toHavePathname('/compare');
});

it('a page opened from a tab still goes back to that tab', async () => {
  await renderRouter(routes, { initialUrl: '/' });
  await fireEvent.press(tab('Profil'));
  await act(() => router.push('/settings'));
  expect(screen).toHavePathname('/settings');
  await act(() => goBack());
  expect(screen).toHavePathname('/profile');
});
